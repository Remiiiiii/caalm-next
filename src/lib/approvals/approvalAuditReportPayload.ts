import { historyFromNotifications } from "@/lib/approvals/approvalHistory";
import type {
	ApprovalHistoryEvent,
} from "@/lib/approvals/approvalHistory";
import type {
	ApprovalStepKind,
	ApprovalWorkflowViewerPayload,
} from "@/lib/approvals/contractApprovalWorkflow.types";
import {
	buildReassignCandidates,
	resolveParticipant,
} from "@/lib/approvals/ContractApprovalWorkflowService";

export type ApprovalAuditEntityType = "contract" | "license";
export type ApprovalAuditOutcome = "ok" | "info" | "warn" | "fail";

export interface ApprovalAuditFact {
	label: string;
	value: string;
}

export interface ApprovalAuditStage {
	number: number;
	name: string;
	status: string;
	assignees: string;
	role: string;
	timestamp: string;
	eligible: string;
	assigned: string;
	notified: string;
	sla: string;
}

export interface ApprovalAuditTimelineEvent {
	at: string;
	action: string;
	actor: string;
	outcome: ApprovalAuditOutcome;
}

export interface ApprovalAuditParty {
	name: string;
	email: string;
	role: string;
	function: string;
}

export interface ApprovalAuditRow {
	at: string;
	actor: string;
	action: string;
	result: "Success" | "Failed";
	detail: string;
}

export interface ApprovalAuditSectionMeta {
	number: number;
	title: string;
	description?: string;
}

export interface ApprovalAuditReportPayload {
	companyName: string;
	reportTitle: string;
	generatedAt: string;
	entityType: ApprovalAuditEntityType;
	footerLine: string;
	workflowStatusLine: string;
	sections: {
		workflow: ApprovalAuditSectionMeta;
		timeline: ApprovalAuditSectionMeta;
		details: ApprovalAuditSectionMeta;
		parties: ApprovalAuditSectionMeta;
		audit: ApprovalAuditSectionMeta;
	};
	cover: {
		title: string;
		subtitle: string;
		statusPills: string[];
		facts: ApprovalAuditFact[];
		executiveSummary: string;
		flaggingIntro: string;
		flagging: string[];
	};
	stages: ApprovalAuditStage[];
	timeline: ApprovalAuditTimelineEvent[];
	timelineTakeaway: string;
	details: {
		facts: ApprovalAuditFact[];
		parties: ApprovalAuditParty[];
		sodNote?: string;
	};
	audit: ApprovalAuditRow[];
}

const STAGE_DEFS: Array<{
	name: string;
	kinds: ApprovalStepKind[];
	role: string;
}> = [
	{ name: "Submitted", kinds: ["submitted"], role: "Uploader" },
	{
		name: "Department Review",
		kinds: ["department_review", "internal_approval"],
		role: "Department Manager",
	},
	{
		name: "Executive Approval",
		kinds: ["executive_approval", "awaiting_executive"],
		role: "Executive",
	},
	{ name: "Activated", kinds: ["activated"], role: "System" },
];

function titleCaseStatus(status: string): string {
	return status
		.replace(/[_-]+/g, " ")
		.trim()
		.replace(/\b\w/g, (ch) => ch.toUpperCase())
		.toUpperCase();
}

function formatMoney(amount?: number): string | undefined {
	if (amount === undefined || Number.isNaN(amount) || amount <= 0) return undefined;
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0,
	}).format(amount);
}

function formatWhen(iso?: string): string {
	if (!iso) return "";
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

function formatWhenShort(iso?: string): string {
	if (!iso) return "";
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

function formatGeneratedLong(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
	return date.toLocaleDateString("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric",
	});
}

function formatDuration(ms: number): string {
	const hours = Math.max(0, Math.round(ms / 3_600_000));
	if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
	const days = Math.round(hours / 24);
	return `${days} day${days === 1 ? "" : "s"}`;
}

/** Compact elapsed label like "4d 1h" for the eligibility table. */
function formatCompactDuration(ms: number): string {
	const totalHours = Math.max(0, Math.floor(ms / 3_600_000));
	const days = Math.floor(totalHours / 24);
	const hours = totalHours % 24;
	if (days > 0 && hours > 0) return `${days}d ${hours}h`;
	if (days > 0) return `${days}d`;
	if (hours > 0) return `${hours}h`;
	const mins = Math.max(0, Math.round(ms / 60_000));
	return mins > 0 ? `${mins}m` : "—";
}

function businessDaysBetween(startIso: string, endIso: string): number {
	const start = new Date(startIso);
	const end = new Date(endIso);
	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
	const from = start.getTime() <= end.getTime() ? start : end;
	const to = start.getTime() <= end.getTime() ? end : start;
	let days = 0;
	const cursor = new Date(from);
	cursor.setHours(0, 0, 0, 0);
	const endDay = new Date(to);
	endDay.setHours(0, 0, 0, 0);
	while (cursor < endDay) {
		const dow = cursor.getDay();
		if (dow !== 0 && dow !== 6) days += 1;
		cursor.setDate(cursor.getDate() + 1);
	}
	return Math.max(days, 0);
}

function fact(label: string, value: string | undefined): ApprovalAuditFact {
	return { label, value: value?.trim() || "—" };
}

/** Appwrite account / document ids look like this — never show them as a person's name. */
function looksLikeOpaqueId(value: string | undefined): boolean {
	if (!value) return false;
	const trimmed = value.trim();
	return /^[a-z0-9]{15,36}$/i.test(trimmed) && !/\s/.test(trimmed);
}

type NameDirectory = Map<string, { name: string; email?: string }>;

function personNameFromLocal(
	workflow: ApprovalWorkflowViewerPayload,
	userId?: string,
): string | undefined {
	if (!userId) return undefined;
	for (const step of workflow.steps) {
		const match = step.participants.find((person) => person.userId === userId);
		if (match?.fullName && !looksLikeOpaqueId(match.fullName)) {
			return match.fullName;
		}
	}
	const candidate = workflow.reassignCandidates?.find(
		(person) => person.userId === userId,
	);
	if (candidate?.fullName && !looksLikeOpaqueId(candidate.fullName)) {
		return candidate.fullName;
	}
	if (userId === workflow.viewerUserId) return "Current viewer";
	if (userId === workflow.uploaderUserId) return "Submitter";
	return undefined;
}

function personName(
	workflow: ApprovalWorkflowViewerPayload,
	userId: string | undefined,
	directory?: NameDirectory,
): string {
	if (!userId) return "System";
	const fromDir = directory?.get(userId)?.name;
	if (fromDir && !looksLikeOpaqueId(fromDir)) return fromDir;
	const local = personNameFromLocal(workflow, userId);
	if (local) return local;
	return "Unknown participant";
}

function personEmail(
	workflow: ApprovalWorkflowViewerPayload,
	userId?: string,
	directory?: NameDirectory,
): string | undefined {
	if (!userId) return undefined;
	const fromDir = directory?.get(userId)?.email;
	if (fromDir) return fromDir;
	for (const step of workflow.steps) {
		const match = step.participants.find((person) => person.userId === userId);
		if (match?.email) return match.email;
	}
	return workflow.reassignCandidates?.find((person) => person.userId === userId)
		?.email;
}

/** Collect every user id on the workflow, then resolve missing names via Appwrite. */
async function buildNameDirectory(
	workflow: ApprovalWorkflowViewerPayload,
): Promise<NameDirectory> {
	const ids = new Set<string>();
	if (workflow.uploaderUserId) ids.add(workflow.uploaderUserId);
	if (workflow.viewerUserId) ids.add(workflow.viewerUserId);
	for (const step of workflow.steps) {
		for (const id of step.assigneeUserIds || []) ids.add(id);
		for (const person of step.participants || []) {
			if (person.userId) ids.add(person.userId);
		}
		for (const note of step.notifications || []) {
			for (const id of note.recipientUserIds || []) ids.add(id);
			if (note.actorUserId) ids.add(note.actorUserId);
		}
	}
	for (const note of workflow.notifications || []) {
		for (const id of note.recipientUserIds || []) ids.add(id);
		if (note.actorUserId) ids.add(note.actorUserId);
	}

	const directory: NameDirectory = new Map();
	await Promise.all(
		[...ids].map(async (id) => {
			const localName = personNameFromLocal(workflow, id);
			const localEmail = personEmail(workflow, id);
			if (localName) {
				directory.set(id, { name: localName, email: localEmail });
				return;
			}
			try {
				const resolved = await resolveParticipant(
					id,
					workflow.viewerUserId || id,
				);
				const name =
					resolved.fullName && !looksLikeOpaqueId(resolved.fullName)
						? resolved.fullName
						: "Unknown participant";
				directory.set(id, { name, email: resolved.email || localEmail });
			} catch {
				directory.set(id, { name: "Unknown participant", email: localEmail });
			}
		}),
	);
	return directory;
}

function surname(fullName: string): string {
	const parts = fullName.trim().split(/\s+/).filter(Boolean);
	return parts[parts.length - 1] || fullName;
}

function stepAssignees(
	workflow: ApprovalWorkflowViewerPayload,
	stepId: string | undefined,
	directory: NameDirectory,
): string[] {
	if (!stepId) return [];
	const step = workflow.steps.find((item) => item.id === stepId);
	if (!step) return [];
	const fromParticipants = (step.participants || [])
		.map((person) => person.fullName)
		.filter((name) => Boolean(name) && !looksLikeOpaqueId(name));
	if (fromParticipants.length > 0) return [...new Set(fromParticipants)];
	return [
		...new Set(
			(step.assigneeUserIds || [])
				.map((id) => personName(workflow, id, directory))
				.filter((name) => name !== "Unknown participant"),
		),
	];
}

function stepSlaPhrase(
	workflow: ApprovalWorkflowViewerPayload,
	stepId: string | undefined,
	atIso: string,
): string {
	if (!stepId) return "";
	const step = workflow.steps.find((item) => item.id === stepId);
	if (!step?.startedAt) return "";
	const endIso = step.completedAt || atIso;
	const ms =
		new Date(endIso).getTime() - new Date(step.startedAt).getTime();
	if (!(ms > 0)) return "";
	return `; SLA ${formatCompactDuration(ms)}`;
}

/** Human-readable Detail cell (matches executive audit report style). */
function buildAuditDetail(
	event: ApprovalHistoryEvent,
	workflow: ApprovalWorkflowViewerPayload,
	directory: NameDirectory,
): string {
	const step = workflow.steps.find((item) => item.id === event.stepId);
	const names = stepAssignees(workflow, event.stepId, directory);
	const sla = stepSlaPhrase(workflow, event.stepId, event.at);
	const storedDetail = event.detail?.trim();
	const storedLooksMachine =
		!storedDetail ||
		/recorded for step/i.test(storedDetail) ||
		looksLikeOpaqueId(storedDetail);

	if (!storedLooksMachine) {
		if (event.reason) return `${storedDetail}; ${event.reason}`;
		return storedDetail;
	}

	switch (event.type) {
		case "upload_submitted":
			return "Uploader; initiated approval workflow";
		case "pending_review":
		case "needs_executive_assignment":
			return names.length > 0
				? `Assigned: ${names.join(", ")}${sla}`
				: `Opened ${step?.label || "review"}`;
		case "stage_advanced": {
			if (step?.kind === "activated") {
				return `Result of executive approval; status → ${workflow.contractStatus || "active"}`;
			}
			if (
				(step?.kind === "executive_approval" ||
					step?.kind === "awaiting_executive") &&
				names.length > 1
			) {
				return `Eligible: ${names.map(surname).join(", ")}${sla}`;
			}
			return names.length > 0
				? `Assigned: ${names.join(", ")}${sla}`
				: `Advanced to ${step?.label || "next stage"}`;
		}
		case "claimed": {
			const actor = event.actorUserIds[0]
				? personName(workflow, event.actorUserIds[0], directory)
				: names[0];
			return actor && actor !== "Unknown participant"
				? `Claimed by ${actor}`
				: "Claimed current step";
		}
		case "reassigned":
			if (storedDetail && !storedLooksMachine) {
				return event.reason
					? `${storedDetail}; ${event.reason}`
					: storedDetail;
			}
			return event.reason
				? `Reassigned; ${event.reason}`
				: "Step reassigned";
		case "executive_approved":
			if (event.reason) return event.reason;
			if (step?.notes?.trim()) return step.notes.trim();
			return "No note attached (notes optional on Approve)";
		case "rejected":
			return event.reason || step?.notes?.trim() || "Rejected";
		case "changes_requested":
			return event.reason || step?.notes?.trim() || "Changes requested";
		case "delegated":
			return storedDetail || "Delegate added from out-of-office coverage";
		case "resubmitted":
			return "Uploader; resubmitted after changes requested";
		default:
			if (event.reason) return event.reason;
			if (/not an assignee/i.test(event.label)) {
				return "“You are not an assignee for the current approval step”";
			}
			return step?.label ? `Recorded on ${step.label}` : event.label;
	}
}

function outcomeForType(type: string): ApprovalAuditOutcome {
	if (type === "rejected" || type === "sla_breached") return "fail";
	if (
		type === "changes_requested" ||
		type === "needs_executive_assignment" ||
		type === "sla_at_risk" ||
		type === "sla_due_soon" ||
		type === "sla_escalated"
	) {
		return "warn";
	}
	if (
		type === "executive_approved" ||
		type === "stage_advanced" ||
		type === "claimed"
	) {
		return "ok";
	}
	return "info";
}

function trackLabel(workflow: ApprovalWorkflowViewerPayload): string {
	return [workflow.department, workflow.subDepartment || workflow.businessUnit]
		.filter(Boolean)
		.join(" · ");
}

function joinNames(names: string[]): string {
	const unique = [...new Set(names.filter(Boolean))];
	return unique.length > 0 ? unique.join(", ") : "—";
}

function formatEligibleList(
	names: string[],
	roleLabel: string,
): string {
	if (names.length === 0) return roleLabel || "—";
	return `${names.join(", ")} (${roleLabel})`;
}

async function buildStages(
	workflow: ApprovalWorkflowViewerPayload,
	orgId: string | undefined,
	directory: NameDirectory,
): Promise<ApprovalAuditStage[]> {
	return Promise.all(
		STAGE_DEFS.map(async (def, index) => {
			const step = workflow.steps.find((item) => def.kinds.includes(item.kind));
			const assignees =
				step?.participants.map((person) => person.fullName).join(", ") ||
				(step?.kind === "activated" ? "System" : "") ||
				"—";
			const notifiedIds = [
				...new Set(
					(step?.notifications || [])
						.flatMap((note) => note.recipientUserIds)
						.filter(Boolean),
				),
			];
			const notifiedNames = notifiedIds.map((id) =>
				personName(workflow, id, directory),
			);
			const timestamp =
				formatWhenShort(step?.completedAt) ||
				formatWhenShort(step?.startedAt) ||
				(step?.status === "current" ? "In progress" : "—");

			let eligible = step?.assigneeHint || def.role;
			if (def.kinds.includes("activated")) {
				eligible = "System-triggered on Executive Approval result";
			} else if (def.kinds.includes("submitted")) {
				const uploader = workflow.uploaderUserId
					? personName(workflow, workflow.uploaderUserId, directory)
					: undefined;
				eligible = uploader
					? formatEligibleList([uploader], "Uploader")
					: "Uploader";
			} else if (orgId && step?.kind) {
				const candidates = await buildReassignCandidates(orgId, step.kind);
				if (candidates.length > 0) {
					const role =
						candidates[0]?.roleLabel ||
						(def.kinds.some((k) =>
							k === "executive_approval" || k === "awaiting_executive",
						)
							? "Super/Org Admin"
							: def.role);
					const names = candidates.map((c) => c.fullName);
					// Group by role when mixed Executive labels
					const byRole = new Map<string, string[]>();
					for (const c of candidates) {
						const list = byRole.get(c.roleLabel) || [];
						list.push(c.fullName);
						byRole.set(c.roleLabel, list);
					}
					if (byRole.size === 1) {
						eligible = formatEligibleList(names, role);
					} else {
						eligible = [...byRole.entries()]
							.map(([r, n]) => formatEligibleList(n, r))
							.join("; ");
					}
				}
			}

			const assignedNames =
				step?.kind === "activated"
					? "—"
					: joinNames(
							step?.participants.map((p) => p.fullName) ||
								step?.assigneeUserIds.map((id) =>
									personName(workflow, id, directory),
								) ||
								[],
						);

			const notified =
				step?.kind === "activated"
					? notifiedIds.length > 0
						? "All stage participants"
						: "—"
					: joinNames(notifiedNames);

			let sla = "—";
			if (step?.startedAt && step?.completedAt) {
				const ms =
					new Date(step.completedAt).getTime() -
					new Date(step.startedAt).getTime();
				if (ms >= 0) sla = formatCompactDuration(ms);
			} else if (step?.startedAt && step.status === "current") {
				const ms = Date.now() - new Date(step.startedAt).getTime();
				if (ms >= 0) sla = formatCompactDuration(ms);
			}

			return {
				number: index + 1,
				name: def.name,
				status: titleCaseStatus(step?.status || "pending"),
				assignees,
				role: def.role,
				timestamp,
				eligible,
				assigned: assignedNames,
				notified,
				sla,
			};
		}),
	);
}

function buildParties(
	workflow: ApprovalWorkflowViewerPayload,
	directory: NameDirectory,
): ApprovalAuditParty[] {
	const byId = new Map<
		string,
		ApprovalAuditParty & { functions: Set<string> }
	>();

	const add = (userId: string | undefined, role: string, fn: string) => {
		if (!userId) return;
		const existing = byId.get(userId);
		if (existing) {
			existing.functions.add(fn);
			existing.function = [...existing.functions].join("; ");
			if (role && !existing.role.includes(role)) {
				existing.role = `${existing.role} / ${role}`;
			}
			return;
		}
		byId.set(userId, {
			name: personName(workflow, userId, directory),
			email: personEmail(workflow, userId, directory) || "—",
			role,
			function: fn,
			functions: new Set([fn]),
		});
	};

	add(workflow.uploaderUserId, "Submitter", "Submitter");
	for (const step of workflow.steps) {
		const fn =
			step.kind === "submitted"
				? "Submitter"
				: step.kind === "executive_approval" ||
						step.kind === "awaiting_executive"
					? "Executive approver"
					: step.kind === "activated"
						? "Notified — not assigned as approver"
						: step.kind === "department_review"
							? "Department reviewer"
							: "Reviewer";
		const role =
			step.assigneeHint ||
			(step.kind === "department_review"
				? "Department Manager"
				: step.kind === "executive_approval" ||
						step.kind === "awaiting_executive"
					? "Organization Admin"
					: step.label);
		for (const id of step.assigneeUserIds) {
			add(id, role, fn);
		}
		for (const note of step.notifications || []) {
			for (const id of note.recipientUserIds || []) {
				if (!byId.has(id)) {
					add(id, "Notified party", "Notified — not assigned as approver");
				}
			}
		}
	}

	return [...byId.values()].map(({ functions: _fn, ...party }) => party);
}

function buildSodNote(
	parties: ApprovalAuditParty[],
	noun: string,
): string | undefined {
	const multi = parties.filter((party) => party.function.includes(";"));
	if (multi.length === 0) return undefined;

	const primary = multi[0];
	const roleBits = primary.function
		.split(";")
		.map((s) => s.trim().toLowerCase())
		.filter(Boolean);
	const count = roleBits.length;
	const roleList = roleBits.join(", ");

	const domains = [
		...new Set(
			parties
				.map((p) => {
					const at = p.email.indexOf("@");
					return at > 0 ? p.email.slice(at + 1).toLowerCase() : "";
				})
				.filter(Boolean),
		),
	];
	const domainHint =
		domains.length > 1
			? ` Emails shown above are as captured in the session (note accounts use different domains, which is worth verifying against your identity provider).`
			: " Emails shown above are as captured in the session.";

	return `Segregation-of-duties note: ${primary.name} appears in ${count} roles on this ${noun} — ${roleList}.${domainHint}`;
}

function buildTimelineTakeaway(
	workflow: ApprovalWorkflowViewerPayload,
	cycleMs: number,
	cycleLabel: string | undefined,
	submittedAt?: string,
	lastAt?: string,
): string {
	if (!cycleLabel || !submittedAt || !lastAt || cycleMs <= 0) {
		return "Elapsed time cannot be reconstructed from the current trail.";
	}

	const bizDays = businessDaysBetween(submittedAt, lastAt);
	const cyclePhrase =
		bizDays > 0
			? `${bizDays} business day${bizDays === 1 ? "" : "s"}`
			: cycleLabel;

	let dominantName = "";
	let dominantMs = 0;
	let dominantStart = "";
	let dominantEnd = "";
	for (const step of workflow.steps) {
		if (!step.startedAt) continue;
		const end = step.completedAt || lastAt;
		const ms = Math.max(
			0,
			new Date(end).getTime() - new Date(step.startedAt).getTime(),
		);
		if (ms > dominantMs) {
			dominantMs = ms;
			dominantName = step.label || step.kind.replace(/_/g, " ");
			dominantStart = step.startedAt;
			dominantEnd = end;
		}
	}

	if (!dominantName || dominantMs <= 0) {
		return `Total elapsed time from submission to activation: ${cyclePhrase}.`;
	}

	const pct = Math.min(99, Math.round((dominantMs / cycleMs) * 100));
	const range = `${formatWhenShort(dominantStart)} → ${formatWhenShort(dominantEnd)}`;
	return `Total elapsed time from submission to activation: ${cyclePhrase}. Of that, ~${pct}% of the elapsed time (${range}) was spent waiting in ${dominantName} before the first approval action was even attempted — worth watching if this pattern repeats across contracts, since it may point to reviewer load or notification visibility rather than the workflow logic itself.`;
}

function buildWorkflowDescription(
	stages: ApprovalAuditStage[],
	history: ReturnType<typeof historyFromNotifications>,
): string {
	const count = stages.length || 4;
	const allComplete = stages.every((s) => s.status === "COMPLETE");
	const hadReject = history.some((e) => e.type === "rejected");
	const hadChanges = history.some((e) => e.type === "changes_requested");
	if (allComplete && !hadReject && !hadChanges) {
		return `${count === 4 ? "Four" : String(count)}-stage sequential approval chain. All stages completed with an Approve decision; no rejections or change requests were recorded.`;
	}
	const parts: string[] = [
		`${count}-stage sequential approval chain.`,
	];
	if (hadReject) parts.push("At least one rejection was recorded.");
	if (hadChanges) parts.push("Change requests were recorded.");
	if (!allComplete) parts.push("Not all stages are complete.");
	return parts.join(" ");
}

export async function buildApprovalAuditReportPayload(
	workflow: ApprovalWorkflowViewerPayload,
	options: {
		entityType: ApprovalAuditEntityType;
		companyName?: string;
		orgId?: string;
	},
): Promise<ApprovalAuditReportPayload> {
	const entityLabel = options.entityType === "license" ? "License" : "Contract";
	const noun = options.entityType === "license" ? "license" : "contract";
	const generatedAt = new Date().toISOString();
	const history = historyFromNotifications(workflow.notifications);
	const directory = await buildNameDirectory(workflow);
	const stages = await buildStages(workflow, options.orgId, directory);
	const parties = buildParties(workflow, directory);
	const track = trackLabel(workflow);
	const amount = formatMoney(workflow.amount);
	const current = workflow.steps[workflow.currentStepIndex];
	const submittedAt =
		workflow.steps.find((step) => step.kind === "submitted")?.startedAt ||
		history[0]?.at;
	const lastAt =
		workflow.steps.find((step) => step.kind === "activated")?.completedAt ||
		history[history.length - 1]?.at ||
		generatedAt;
	const cycleMs =
		submittedAt && lastAt
			? Math.max(0, new Date(lastAt).getTime() - new Date(submittedAt).getTime())
			: 0;
	const bizDays =
		submittedAt && lastAt ? businessDaysBetween(submittedAt, lastAt) : 0;
	const cycleLabel = cycleMs
		? bizDays > 0
			? `${bizDays} business day${bizDays === 1 ? "" : "s"}`
			: formatDuration(cycleMs)
		: undefined;
	const completedSteps = workflow.steps.filter(
		(step) => step.status === "complete",
	).length;

	const stepNames = stages.map((s) => s.name).join(", ");
	const coverFacts: ApprovalAuditFact[] = [
		fact(`${entityLabel} name`, workflow.contractName),
		fact(`${entityLabel} ID`, workflow.contractId),
		fact("Department · track", track || undefined),
		fact("Total contract value", amount),
		fact(
			"Submitted by",
			workflow.uploaderUserId
				? personName(workflow, workflow.uploaderUserId, directory)
				: undefined,
		),
		fact(
			"Current status",
			workflow.contractStatus
				? titleCaseStatus(workflow.contractStatus).replace(/ /g, " — ")
				: undefined,
		),
		fact(
			"Approval steps",
			`${stages.length || workflow.steps.length || 0}${
				stepNames ? ` (${stepNames})` : ""
			}`,
		),
		fact(
			"Total cycle time",
			cycleLabel && submittedAt && lastAt
				? `${cycleLabel} (${formatWhenShort(submittedAt).replace(/,.*/, "")} – ${formatWhenShort(lastAt).replace(/,.*/, "")})`
				: cycleLabel,
		),
	];

	// Section 3: only fields not already on the cover grid
	const detailsFacts: ApprovalAuditFact[] = [
		fact(`${entityLabel} type`, workflow.contractType),
		fact("Governing department", workflow.department),
		fact("Approval track", track || undefined),
		fact(`${entityLabel} number`, workflow.documentNumber),
		fact("Renewal / term", workflow.renewalTerm),
		fact("Counterparty", workflow.counterpartyName),
	];

	const timeline: ApprovalAuditTimelineEvent[] = history.map((event) => ({
		at: formatWhenShort(event.at) || event.at,
		action: event.reason
			? `${event.label} — ${event.reason}`
			: event.label,
		actor: event.actorUserIds[0]
			? personName(workflow, event.actorUserIds[0], directory)
			: "System",
		outcome: outcomeForType(event.type),
	}));

	const audit: ApprovalAuditRow[] = history.map((event) => {
		const failed = event.type === "rejected" || event.type === "sla_breached";
		return {
			at: formatWhen(event.at) || event.at,
			actor: event.actorUserIds[0]
				? personName(workflow, event.actorUserIds[0], directory)
				: "System",
			action: event.label,
			result: failed ? "Failed" : "Success",
			detail: failed
				? event.reason || event.label
				: buildAuditDetail(event, workflow, directory),
		};
	});

	const sodNote = buildSodNote(parties, noun);

	const hadAccessFailure = history.some(
		(e) =>
			/not an assignee|access.?control|decision failed/i.test(e.label) ||
			e.type === "rejected",
	);
	const hadClaim = history.some((e) => e.type === "claimed");
	const hadReassign = history.some((e) => e.type === "reassigned");

	const flagging: string[] = [];
	if (sodNote) {
		const sodParty = parties.find((p) => p.function.includes(";"));
		flagging.push(
			`a segregation-of-duties exception (${sodParty?.name || "a reviewer"} was also the submitter on one or more steps)`,
		);
	} else {
		flagging.push(
			"no segregation-of-duties conflict — submitter and approvers are distinct people",
		);
	}
	if (hadAccessFailure) {
		flagging.push(
			"an access-control failure (decision blocked because the actor was not yet an assignee)",
		);
	} else if (hadClaim || hadReassign) {
		flagging.push(
			"an assignment change mid-flow (claim or reassignment) before a decision completed",
		);
	} else {
		flagging.push("no mid-flow access-control failures were recorded");
	}
	const activated = workflow.steps.find((s) => s.kind === "activated");
	if (activated?.status === "complete") {
		flagging.push(
			"post-activation changes remain possible via admin override — confirm that path stays guarded",
		);
	} else {
		flagging.push(
			cycleLabel
				? `elapsed cycle time of ${cycleLabel} across the approval chain`
				: "cycle time is still accumulating",
		);
	}

	const statusPills = [
		titleCaseStatus(workflow.contractStatus || "pending review"),
		current?.status === "current"
			? titleCaseStatus(current.label || "In progress")
			: titleCaseStatus(current?.status || "Pending"),
	];

	const statusDisplay = workflow.contractStatus
		? titleCaseStatus(workflow.contractStatus).replace(/ /g, " — ")
		: "Pending";
	const trackDisplay = track || "—";
	const chainNames = stages
		.filter((s) => s.name !== "Submitted" && s.name !== "Activated")
		.map((s) => s.name)
		.join(" and ");

	const executiveSummary = `${workflow.contractName || `This ${noun}`} moved through ${chainNames || "the standard"} stages and currently sits at ${statusDisplay}. The full chain completed in ${cycleLabel || "an unknown duration"}${
		submittedAt && lastAt
			? ` (${formatWhenShort(submittedAt)} → ${formatWhenShort(lastAt)})`
			: ""
	}.${sodNote || hadAccessFailure || hadClaim ? " Procedural exceptions appear in the audit trail and are flagged below." : ""}`;

	const reportTitle = `${entityLabel} Approval & Audit Report`;
	const companyName = options.companyName || "CAALM";
	const footerLine = `Approval & Audit Report • ${workflow.contractName || entityLabel} • Generated ${formatGeneratedLong(generatedAt)}`;
	const workflowStatusLine = `Status: ${workflow.contractStatus || "pending"} · Track: ${trackDisplay}`;

	const detailsTitle =
		options.entityType === "license" ? "License Details" : "Contract Details";

	return {
		companyName,
		reportTitle,
		generatedAt,
		entityType: options.entityType,
		footerLine,
		workflowStatusLine,
		sections: {
			workflow: {
				number: 1,
				title: "Approval Workflow",
				description: buildWorkflowDescription(stages, history),
			},
			timeline: {
				number: 2,
				title: "Approval Timeline",
			},
			details: {
				number: 3,
				title: detailsTitle,
			},
			parties: {
				number: 4,
				title: "Parties & Roles",
			},
			audit: {
				number: 5,
				title: "Full Audit Trail",
				description:
					"Chronological record of every notification and decision event captured for this approval chain.",
			},
		},
		cover: {
			title: reportTitle,
			subtitle: `${workflow.contractName || `Untitled ${noun}`} · ${trackDisplay}`,
			statusPills,
			facts: coverFacts,
			executiveSummary,
			flaggingIntro:
				"For the executive meeting, the three items worth flagging are:",
			flagging: flagging.slice(0, 3),
		},
		stages,
		timeline,
		timelineTakeaway: buildTimelineTakeaway(
			workflow,
			cycleMs,
			cycleLabel,
			submittedAt,
			lastAt,
		),
		details: {
			facts: detailsFacts,
			parties,
			sodNote,
		},
		audit,
	};
}

const EXPORTABLE_STATUSES = new Set(["active", "pending-signature"]);

export function canExportApprovalAuditReport(status: string): boolean {
	return EXPORTABLE_STATUSES.has(status);
}

export function reportFileName(
	workflow: ApprovalWorkflowViewerPayload,
	entityType: ApprovalAuditEntityType,
): string {
	const safe = (workflow.contractName || entityType)
		.replace(/[^\w\-]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
	return `${safe || entityType}-approval-audit-report.pdf`;
}
