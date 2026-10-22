import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type {
	LibraryKind,
	Proposal,
	ProposalLibraryEntry,
	ProposalRequirement,
	ProposalSection,
	ProposalStatus,
	RequirementSection,
	RequirementStatus,
	ResponseType,
} from "./types";
import {
	isLibraryKind,
	isProposalStatus,
	isRequirementSection,
	isRequirementStatus,
	isResponseType,
} from "./types";

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

function proposalsTable(): string {
	return appwriteConfig.proposalsCollectionId || "69f8f1a0001d4e8c2b20";
}

function requirementsTable(): string {
	return (
		appwriteConfig.proposalRequirementsCollectionId || "69f8f1a0001d4e8c2b21"
	);
}

function sectionsTable(): string {
	return appwriteConfig.proposalSectionsCollectionId || "69f8f1a0001d4e8c2b22";
}

function libraryTable(): string {
	return (
		appwriteConfig.proposalContentLibraryCollectionId || "69f8f1a0001d4e8c2b23"
	);
}

function parseTags(raw: unknown): string[] {
	if (!raw) return [];
	if (Array.isArray(raw)) {
		return raw.filter((item): item is string => typeof item === "string");
	}
	if (typeof raw !== "string") return [];
	return raw
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

function parseIdList(raw: unknown): string[] {
	if (!raw) return [];
	if (Array.isArray(raw)) {
		return raw.filter((item): item is string => typeof item === "string");
	}
	if (typeof raw !== "string") return [];
	try {
		const parsed = JSON.parse(raw);
		if (Array.isArray(parsed)) {
			return parsed.filter((item): item is string => typeof item === "string");
		}
	} catch {
		return raw
			.split(",")
			.map((item) => item.trim())
			.filter(Boolean);
	}
	return [];
}

function mapProposal(row: Record<string, unknown>): Proposal {
	return {
		$id: String(row.$id),
		$createdAt: String(row.$createdAt || ""),
		$updatedAt: String(row.$updatedAt || ""),
		orgId: String(row.orgId || ""),
		title: String(row.title || ""),
		solicitationRef: row.solicitationRef
			? String(row.solicitationRef)
			: undefined,
		status: isProposalStatus(row.status) ? row.status : "draft",
		linkedContractId: row.linkedContractId
			? String(row.linkedContractId)
			: undefined,
		linkedFundingPursuitId: row.linkedFundingPursuitId
			? String(row.linkedFundingPursuitId)
			: undefined,
		createdByUserId: String(row.createdByUserId || ""),
		createdByName: row.createdByName ? String(row.createdByName) : undefined,
		corpus: row.corpus ? String(row.corpus) : undefined,
		certifiedAt: row.certifiedAt ? String(row.certifiedAt) : undefined,
		certifiedByUserId: row.certifiedByUserId
			? String(row.certifiedByUserId)
			: undefined,
	};
}

function mapRequirement(row: Record<string, unknown>): ProposalRequirement {
	return {
		$id: String(row.$id),
		orgId: String(row.orgId || ""),
		proposalId: String(row.proposalId || ""),
		requirementText: String(row.requirementText || ""),
		sourceSection: isRequirementSection(row.sourceSection)
			? row.sourceSection
			: "other",
		sourcePage:
			typeof row.sourcePage === "number" ? row.sourcePage : undefined,
		responseType: isResponseType(row.responseType)
			? row.responseType
			: "clarification",
		owner: row.owner ? String(row.owner) : undefined,
		status: isRequirementStatus(row.status) ? row.status : "pending",
		mappedSectionId: row.mappedSectionId
			? String(row.mappedSectionId)
			: undefined,
		order: Number(row.order || 0),
	};
}

function mapSection(row: Record<string, unknown>): ProposalSection {
	return {
		$id: String(row.$id),
		orgId: String(row.orgId || ""),
		proposalId: String(row.proposalId || ""),
		heading: String(row.heading || ""),
		order: Number(row.order || 0),
		bodyMarkdown: String(row.bodyMarkdown || ""),
		sourceRequirementIds: parseIdList(row.sourceRequirementIds),
		lastEditedByUserId: row.lastEditedByUserId
			? String(row.lastEditedByUserId)
			: undefined,
		lastEditedByName: row.lastEditedByName
			? String(row.lastEditedByName)
			: undefined,
	};
}

function mapLibrary(row: Record<string, unknown>): ProposalLibraryEntry {
	return {
		$id: String(row.$id),
		orgId: String(row.orgId || ""),
		kind: isLibraryKind(row.kind) ? row.kind : "boilerplate",
		title: String(row.title || ""),
		bodyMarkdown: String(row.bodyMarkdown || ""),
		tags: parseTags(row.tags),
		ownerUserId: row.ownerUserId ? String(row.ownerUserId) : undefined,
		ownerName: row.ownerName ? String(row.ownerName) : undefined,
		approvedAt: row.approvedAt ? String(row.approvedAt) : undefined,
		expiresAt: row.expiresAt ? String(row.expiresAt) : undefined,
	};
}

export async function listProposals(orgId: string): Promise<Proposal[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: proposalsTable(),
		queries: [Query.equal("orgId", orgId), Query.orderDesc("$createdAt"), Query.limit(200)],
	});
	return (result.rows as unknown as Record<string, unknown>[]).map(mapProposal);
}

export async function getProposalById(
	proposalId: string,
): Promise<Proposal | null> {
	try {
		const { tablesDB } = await createAdminClient();
		const row = await tablesDB.getRow({
			databaseId: dbId(),
			tableId: proposalsTable(),
			rowId: proposalId,
		});
		return mapProposal(row as unknown as Record<string, unknown>);
	} catch {
		return null;
	}
}

export async function createProposal(input: {
	orgId: string;
	title: string;
	solicitationRef?: string;
	linkedContractId?: string;
	linkedFundingPursuitId?: string;
	createdByUserId: string;
	createdByName?: string;
	corpus?: string;
}): Promise<Proposal> {
	const { tablesDB } = await createAdminClient();
	const rowId = ID.unique();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: proposalsTable(),
		rowId,
		data: {
			orgId: input.orgId,
			title: input.title.slice(0, 256),
			solicitationRef: input.solicitationRef?.slice(0, 128),
			status: "draft" satisfies ProposalStatus,
			linkedContractId: input.linkedContractId,
			linkedFundingPursuitId: input.linkedFundingPursuitId,
			createdByUserId: input.createdByUserId,
			createdByName: input.createdByName,
			corpus: input.corpus,
		},
	});
	return mapProposal(row as unknown as Record<string, unknown>);
}

export async function updateProposal(
	proposalId: string,
	patch: Partial<
		Pick<
			Proposal,
			| "title"
			| "status"
			| "corpus"
			| "certifiedAt"
			| "certifiedByUserId"
			| "linkedContractId"
			| "linkedFundingPursuitId"
		>
	>,
): Promise<Proposal> {
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: proposalsTable(),
		rowId: proposalId,
		data: patch,
	});
	return mapProposal(row as unknown as Record<string, unknown>);
}

export async function listRequirements(
	orgId: string,
	proposalId: string,
): Promise<ProposalRequirement[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: requirementsTable(),
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("proposalId", proposalId),
			Query.orderAsc("order"),
			Query.limit(500),
		],
	});
	return (result.rows as unknown as Record<string, unknown>[]).map(
		mapRequirement,
	);
}

export async function replaceRequirements(input: {
	orgId: string;
	proposalId: string;
	rows: Array<{
		requirementText: string;
		sourceSection: RequirementSection;
		sourcePage?: number;
		responseType?: ResponseType;
		owner?: string;
		status?: RequirementStatus;
		order: number;
	}>;
}): Promise<ProposalRequirement[]> {
	const existing = await listRequirements(input.orgId, input.proposalId);
	const { tablesDB } = await createAdminClient();
	await Promise.all(
		existing.map((row) =>
			tablesDB.deleteRow({
				databaseId: dbId(),
				tableId: requirementsTable(),
				rowId: row.$id,
			}),
		),
	);
	const created: ProposalRequirement[] = [];
	for (const row of input.rows) {
		const saved = await tablesDB.createRow({
			databaseId: dbId(),
			tableId: requirementsTable(),
			rowId: ID.unique(),
			data: {
				orgId: input.orgId,
				proposalId: input.proposalId,
				requirementText: row.requirementText,
				sourceSection: row.sourceSection,
				sourcePage: row.sourcePage,
				responseType: row.responseType || "clarification",
				owner: row.owner,
				status: row.status || "pending",
				order: row.order,
			},
		});
		created.push(mapRequirement(saved as unknown as Record<string, unknown>));
	}
	return created;
}

export async function updateRequirement(
	requirementId: string,
	patch: Partial<
		Pick<
			ProposalRequirement,
			| "requirementText"
			| "sourceSection"
			| "sourcePage"
			| "responseType"
			| "owner"
			| "status"
			| "mappedSectionId"
			| "order"
		>
	>,
): Promise<ProposalRequirement> {
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: requirementsTable(),
		rowId: requirementId,
		data: patch,
	});
	return mapRequirement(row as unknown as Record<string, unknown>);
}

export async function listSections(
	orgId: string,
	proposalId: string,
): Promise<ProposalSection[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: sectionsTable(),
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("proposalId", proposalId),
			Query.orderAsc("order"),
			Query.limit(200),
		],
	});
	return (result.rows as unknown as Record<string, unknown>[]).map(mapSection);
}

export async function replaceSections(input: {
	orgId: string;
	proposalId: string;
	rows: Array<{
		heading: string;
		order: number;
		bodyMarkdown?: string;
		sourceRequirementIds?: string[];
		lastEditedByUserId?: string;
		lastEditedByName?: string;
	}>;
}): Promise<ProposalSection[]> {
	const existing = await listSections(input.orgId, input.proposalId);
	const { tablesDB } = await createAdminClient();
	await Promise.all(
		existing.map((row) =>
			tablesDB.deleteRow({
				databaseId: dbId(),
				tableId: sectionsTable(),
				rowId: row.$id,
			}),
		),
	);
	const created: ProposalSection[] = [];
	for (const row of input.rows) {
		const saved = await tablesDB.createRow({
			databaseId: dbId(),
			tableId: sectionsTable(),
			rowId: ID.unique(),
			data: {
				orgId: input.orgId,
				proposalId: input.proposalId,
				heading: row.heading.slice(0, 256),
				order: row.order,
				bodyMarkdown: row.bodyMarkdown || "",
				sourceRequirementIds: JSON.stringify(row.sourceRequirementIds || []),
				lastEditedByUserId: row.lastEditedByUserId,
				lastEditedByName: row.lastEditedByName,
			},
		});
		created.push(mapSection(saved as unknown as Record<string, unknown>));
	}
	return created;
}

export async function updateSection(
	sectionId: string,
	patch: {
		heading?: string;
		bodyMarkdown?: string;
		sourceRequirementIds?: string[];
		lastEditedByUserId?: string;
		lastEditedByName?: string;
		order?: number;
	},
): Promise<ProposalSection> {
	const { tablesDB } = await createAdminClient();
	const data: Record<string, unknown> = { ...patch };
	if (patch.sourceRequirementIds) {
		data.sourceRequirementIds = JSON.stringify(patch.sourceRequirementIds);
	}
	const row = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: sectionsTable(),
		rowId: sectionId,
		data,
	});
	return mapSection(row as unknown as Record<string, unknown>);
}

export async function listLibrary(
	orgId: string,
): Promise<ProposalLibraryEntry[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: libraryTable(),
		queries: [Query.equal("orgId", orgId), Query.orderDesc("$updatedAt"), Query.limit(200)],
	});
	return (result.rows as unknown as Record<string, unknown>[]).map(mapLibrary);
}

export async function createLibraryEntry(input: {
	orgId: string;
	kind: LibraryKind;
	title: string;
	bodyMarkdown: string;
	tags?: string[];
	ownerUserId?: string;
	ownerName?: string;
	approvedAt?: string;
	expiresAt?: string;
}): Promise<ProposalLibraryEntry> {
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: libraryTable(),
		rowId: ID.unique(),
		data: {
			orgId: input.orgId,
			kind: input.kind,
			title: input.title.slice(0, 256),
			bodyMarkdown: input.bodyMarkdown,
			tags: (input.tags || []).join(", "),
			ownerUserId: input.ownerUserId,
			ownerName: input.ownerName,
			approvedAt: input.approvedAt,
			expiresAt: input.expiresAt,
		},
	});
	return mapLibrary(row as unknown as Record<string, unknown>);
}

export async function updateLibraryEntry(
	entryId: string,
	patch: Partial<
		Pick<
			ProposalLibraryEntry,
			| "kind"
			| "title"
			| "bodyMarkdown"
			| "tags"
			| "ownerUserId"
			| "ownerName"
			| "approvedAt"
			| "expiresAt"
		>
	>,
): Promise<ProposalLibraryEntry> {
	const { tablesDB } = await createAdminClient();
	const data: Record<string, unknown> = { ...patch };
	if (patch.tags) data.tags = patch.tags.join(", ");
	const row = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: libraryTable(),
		rowId: entryId,
		data,
	});
	return mapLibrary(row as unknown as Record<string, unknown>);
}

export async function getLibraryEntry(
	entryId: string,
): Promise<ProposalLibraryEntry | null> {
	try {
		const { tablesDB } = await createAdminClient();
		const row = await tablesDB.getRow({
			databaseId: dbId(),
			tableId: libraryTable(),
			rowId: entryId,
		});
		return mapLibrary(row as unknown as Record<string, unknown>);
	} catch {
		return null;
	}
}
