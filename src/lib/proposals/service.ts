import {
	buildOutline,
	draftSection,
	shredSolicitation,
} from "@/lib/ai/proposal-generator";
import { logAuditEvent } from "@/lib/services/audit-logger";
import {
	createLibraryEntry,
	createProposal,
	getProposalById,
	listLibrary,
	listRequirements,
	listSections,
	replaceRequirements,
	replaceSections,
	updateLibraryEntry,
	updateProposal,
	updateRequirement,
	updateSection,
} from "./repository";
import type {
	Proposal,
	ProposalLibraryEntry,
	ProposalRequirement,
	ProposalSection,
	RequirementStatus,
	ResponseType,
} from "./types";

function matchLibrary(
	heading: string,
	requirements: ProposalRequirement[],
	library: ProposalLibraryEntry[],
): ProposalLibraryEntry[] {
	const haystack = `${heading} ${requirements.map((row) => row.requirementText).join(" ")}`.toLowerCase();
	return library
		.filter((entry) => {
			const needle = `${entry.title} ${entry.kind} ${entry.tags.join(" ")}`.toLowerCase();
			return needle
				.split(/\s+/)
				.filter((word) => word.length > 3)
				.some((word) => haystack.includes(word));
		})
		.slice(0, 4);
}

async function requireOwnedProposal(
	proposalId: string,
	orgId: string,
): Promise<Proposal> {
	const proposal = await getProposalById(proposalId);
	if (!proposal || proposal.orgId !== orgId) {
		throw new Error("Proposal not found");
	}
	return proposal;
}

export async function createProposalForSolicitation(input: {
	orgId: string;
	title: string;
	solicitationRef?: string;
	corpus?: string;
	linkedContractId?: string;
	linkedFundingPursuitId?: string;
	userId: string;
	userName: string;
	userEmail: string;
}): Promise<Proposal> {
	const proposal = await createProposal({
		orgId: input.orgId,
		title: input.title,
		solicitationRef: input.solicitationRef,
		corpus: input.corpus,
		linkedContractId: input.linkedContractId,
		linkedFundingPursuitId: input.linkedFundingPursuitId,
		createdByUserId: input.userId,
		createdByName: input.userName,
	});
	await logAuditEvent({
		event_id: `proposal_create_${proposal.$id}`,
		event_title: `Created proposal ${proposal.title}`,
		action: "create",
		source: "caalm",
		user_id: input.userId,
		user_name: input.userName,
		user_email: input.userEmail,
		orgId: input.orgId,
		status: "success",
		module: "contracts",
		target_type: "proposal",
		target_id: proposal.$id,
		target_label: proposal.title,
		summary: `${input.userName} created proposal ${proposal.title}`,
	});
	return proposal;
}

export async function shredProposal(input: {
	proposalId: string;
	orgId: string;
	userId: string;
	userName: string;
	userEmail: string;
	corpus?: string;
}): Promise<ProposalRequirement[]> {
	const proposal = await requireOwnedProposal(input.proposalId, input.orgId);
	const corpus = (input.corpus || proposal.corpus || "").trim();
	if (!corpus) throw new Error("Solicitation text is required to shred");
	if (input.corpus && input.corpus !== proposal.corpus) {
		await updateProposal(proposal.$id, { corpus: input.corpus });
	}
	const shredded = await shredSolicitation({ corpus });
	const rows = await replaceRequirements({
		orgId: input.orgId,
		proposalId: proposal.$id,
		rows: shredded.map((row, index) => ({
			requirementText: row.requirementText,
			sourceSection: row.sourceSection,
			sourcePage: row.sourcePage,
			responseType: row.responseType,
			owner: row.owner,
			status: "pending",
			order: index,
		})),
	});
	await logAuditEvent({
		event_id: `proposal_shred_${proposal.$id}`,
		event_title: `Shredded ${proposal.title}`,
		action: "update",
		source: "caalm",
		user_id: input.userId,
		user_name: input.userName,
		user_email: input.userEmail,
		orgId: input.orgId,
		status: "success",
		module: "contracts",
		target_type: "proposal",
		target_id: proposal.$id,
		target_label: proposal.title,
		summary: `${input.userName} shredded ${rows.length} requirements for ${proposal.title}`,
	});
	return rows;
}

export async function saveRequirementEdits(input: {
	proposalId: string;
	orgId: string;
	userId: string;
	userName: string;
	userEmail: string;
	updates: Array<{
		id: string;
		responseType?: ResponseType;
		status?: RequirementStatus;
		owner?: string;
		requirementText?: string;
	}>;
}): Promise<ProposalRequirement[]> {
	const proposal = await requireOwnedProposal(input.proposalId, input.orgId);
	const existing = await listRequirements(input.orgId, proposal.$id);
	const byId = new Map(existing.map((row) => [row.$id, row]));
	for (const update of input.updates) {
		const current = byId.get(update.id);
		if (!current) continue;
		await updateRequirement(update.id, {
			responseType: update.responseType,
			status: update.status,
			owner: update.owner,
			requirementText: update.requirementText,
		});
	}
	const next = await listRequirements(input.orgId, proposal.$id);
	const allCertified =
		next.length > 0 && next.every((row) => row.status === "certified");
	if (allCertified && !proposal.certifiedAt) {
		await updateProposal(proposal.$id, {
			certifiedAt: new Date().toISOString(),
			certifiedByUserId: input.userId,
			status: "in_review",
		});
		await logAuditEvent({
			event_id: `proposal_certify_${proposal.$id}`,
			event_title: `Certified matrix for ${proposal.title}`,
			action: "update",
			source: "caalm",
			user_id: input.userId,
			user_name: input.userName,
			user_email: input.userEmail,
			orgId: input.orgId,
			status: "success",
			module: "contracts",
			target_type: "proposal",
			target_id: proposal.$id,
			target_label: proposal.title,
			summary: `${input.userName} certified the compliance matrix for ${proposal.title}`,
		});
	}
	return next;
}

export async function generateDraft(input: {
	proposalId: string;
	orgId: string;
	userId: string;
	userName: string;
	userEmail: string;
}): Promise<ProposalSection[]> {
	const proposal = await requireOwnedProposal(input.proposalId, input.orgId);
	const requirements = await listRequirements(input.orgId, proposal.$id);
	if (requirements.length === 0) {
		throw new Error("Shred the solicitation before drafting");
	}
	const uncertified = requirements.filter((row) => row.status !== "certified");
	if (uncertified.length > 0) {
		throw new Error("Certify every matrix row before generating a draft");
	}
	const library = await listLibrary(input.orgId);
	const outline = await buildOutline({ requirements, library });
	const rows = [];
	for (const [index, section] of outline.entries()) {
		const mapped = section.requirementIndexes
			.map((reqIndex) => requirements[reqIndex])
			.filter(Boolean);
		const libraryMatches = matchLibrary(section.heading, mapped, library);
		const bodyMarkdown = await draftSection({
			heading: section.heading,
			requirements: mapped,
			libraryMatches,
		});
		rows.push({
			heading: section.heading,
			order: index,
			bodyMarkdown,
			sourceRequirementIds: mapped.map((row) => row.$id),
			lastEditedByUserId: input.userId,
			lastEditedByName: input.userName,
		});
	}
	const sections = await replaceSections({
		orgId: input.orgId,
		proposalId: proposal.$id,
		rows,
	});
	await logAuditEvent({
		event_id: `proposal_draft_${proposal.$id}`,
		event_title: `Generated draft for ${proposal.title}`,
		action: "update",
		source: "caalm",
		user_id: input.userId,
		user_name: input.userName,
		user_email: input.userEmail,
		orgId: input.orgId,
		status: "success",
		module: "contracts",
		target_type: "proposal",
		target_id: proposal.$id,
		target_label: proposal.title,
		summary: `${input.userName} generated ${sections.length} draft sections for ${proposal.title}`,
	});
	return sections;
}

export async function saveSection(input: {
	proposalId: string;
	orgId: string;
	sectionId: string;
	heading?: string;
	bodyMarkdown?: string;
	userId: string;
	userName: string;
}): Promise<ProposalSection> {
	await requireOwnedProposal(input.proposalId, input.orgId);
	return updateSection(input.sectionId, {
		heading: input.heading,
		bodyMarkdown: input.bodyMarkdown,
		lastEditedByUserId: input.userId,
		lastEditedByName: input.userName,
	});
}

export async function saveLibraryEntry(input: {
	orgId: string;
	userId: string;
	userName: string;
	userEmail: string;
	entryId?: string;
	kind: ProposalLibraryEntry["kind"];
	title: string;
	bodyMarkdown: string;
	tags?: string[];
	approvedAt?: string;
	expiresAt?: string;
}): Promise<ProposalLibraryEntry> {
	const entry = input.entryId
		? await updateLibraryEntry(input.entryId, {
				kind: input.kind,
				title: input.title,
				bodyMarkdown: input.bodyMarkdown,
				tags: input.tags,
				approvedAt: input.approvedAt,
				expiresAt: input.expiresAt,
			})
		: await createLibraryEntry({
				orgId: input.orgId,
				kind: input.kind,
				title: input.title,
				bodyMarkdown: input.bodyMarkdown,
				tags: input.tags,
				ownerUserId: input.userId,
				ownerName: input.userName,
				approvedAt: input.approvedAt ?? new Date().toISOString(),
				expiresAt: input.expiresAt,
			});
	await logAuditEvent({
		event_id: `proposal_library_${entry.$id}`,
		event_title: `${input.entryId ? "Updated" : "Added"} library item ${entry.title}`,
		action: input.entryId ? "update" : "create",
		source: "caalm",
		user_id: input.userId,
		user_name: input.userName,
		user_email: input.userEmail,
		orgId: input.orgId,
		status: "success",
		module: "contracts",
		target_type: "proposal_library",
		target_id: entry.$id,
		target_label: entry.title,
		summary: `${input.userName} ${input.entryId ? "updated" : "added"} library item ${entry.title}`,
	});
	return entry;
}

export async function loadProposalWorkspace(
	proposalId: string,
	orgId: string,
): Promise<{
	proposal: Proposal;
	requirements: ProposalRequirement[];
	sections: ProposalSection[];
	library: ProposalLibraryEntry[];
}> {
	const proposal = await requireOwnedProposal(proposalId, orgId);
	const [requirements, sections, library] = await Promise.all([
		listRequirements(orgId, proposalId),
		listSections(orgId, proposalId),
		listLibrary(orgId),
	]);
	return { proposal, requirements, sections, library };
}
