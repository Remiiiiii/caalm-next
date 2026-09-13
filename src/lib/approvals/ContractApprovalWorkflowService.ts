import { ID, Query } from "node-appwrite";
import { PERMISSIONS } from "@/constants/permissions";
import { getUserById } from "@/lib/actions/user.actions";
import {
	clearSlaProgress,
	stampCurrentStepSla,
} from "@/lib/approvals/ApprovalSlaService";
import {
	assertWorkflowMutable,
	isTerminalDocumentStatus,
} from "@/lib/approvals/documentStatus";
import { resolveAttestationId } from "@/lib/approvals/resolveAttestationId";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { flattenTableRow } from "@/lib/appwrite/flatten-row";
import { writeRowWithSchemaDriftRecovery } from "@/lib/appwrite/schemaDriftRecovery";
import { isDemoMode } from "@/lib/config/demo-mode";
import { getUserRoles, hasPermission } from "@/lib/rbac/permissions";
import { ROLE_PRIORITY_ORDER } from "@/lib/utils/role-priority";
import { logAuditEvent } from "@/lib/services/audit-logger";
import { notifyApprovalAssignees } from "@/lib/approvals/approvalNotifications";
import {
	applyDelegationsToAssignees,
	listActiveDelegations,
} from "@/lib/approvals/approvalDelegations";
import { isAssigneeMatch, userIdentityKeys } from "@/lib/approvals/assigneeIdentity";
import { resolveAvatarDisplayUrl } from "@/lib/utils";
import { computeViewerCapabilities, emptyViewerFlags } from "@/lib/approvals/viewerCapabilities";
import { advanceWorkflowAfterApprove } from "@/lib/approvals/workflowAdvance";
import {
	buildStepsFromTemplate,
	resolveTemplateForSubmit,
} from "@/lib/approvals/workflowTemplates";
import {
	getAllAdmins,
	getAllExecutives,
	getAllSuperAdmins,
	getUsersByRoleNames,
} from "@/lib/utils/get-users-by-role";
import { triggerNotification } from "@/lib/utils/notificationTriggers";
import type {
	ApprovalDecision,
	ApprovalParticipant,
	ApprovalReassignCandidate,
	ApprovalStepKind,
	ApprovalWorkflowNotification,
	ApprovalWorkflowState,
	ApprovalWorkflowStep,
	ApprovalWorkflowViewerPayload,
} from "./contractApprovalWorkflow.types";

const WORKFLOW_VERSION = 1 as const;

type ContractRow = Record<string, unknown> & {
	$id: string;
	contractName?: string;
	status?: string;
	contractOwnerId?: string;
	owner?: string;
	orgId?: string;
	department?: string;
	businessUnit?: string;
	subDepartment?: string;
	assignedManagers?: string[];
	internalApproverIds?: string[];
	approvalWorkflowState?: string;
	digitalSignatureRequired?: boolean | string;
	amount?: number;
	contractType?: string;
	riskTier?: string;
	fileRef?: string;
	fileId?: string;
	documentUrl?: string;
};

export type BuildDerivedStepsInput = {
	uploaderUserId: string;
	departmentManagerIds?: string[];
	internalApproverIds?: string[];
	executiveApproverIds?: string[];
	contractStatus?: string;
};

function uniqueIds(ids: Array<string | undefined | null>): string[] {
	return [
		...new Set(ids.filter((id): id is string => !!id && id.trim().length > 0)),
	];
}

function optionalRowString(value: unknown): string | undefined {
	const text = String(value || "").trim();
	return text || undefined;
}

function stepId(kind: string, index: number): string {
	return `${kind}-${index}`;
}

/**
 * When parallel siblings are all "current", pick the step this viewer
 * can act on. Falls back to currentStepIndex for sequential flows.
 */
export function resolveViewerCurrentStep(
	state: ApprovalWorkflowState,
	viewerIdentityIds: string[],
): { index: number; step: ApprovalWorkflowStep | undefined } {
	const currentSteps = state.steps
		.map((step, index) => ({ step, index }))
		.filter(({ step }) => step.status === "current");

	const matched = currentSteps.find(({ step }) =>
		isAssigneeMatch(step.assigneeUserIds, viewerIdentityIds),
	);
	if (matched) {
		return { index: matched.index, step: matched.step };
	}

	const fallback = state.steps[state.currentStepIndex];
	return {
		index: state.currentStepIndex,
		step: fallback,
	};
}

/**
 * Pure access checks for decide() and API tests.
 */
export function assertDecisionAllowed({
	current,
	viewerUserId,
	uploaderUserId,
	adminOverride = false,
	viewerIdentityIds,
}: {
	current: ApprovalWorkflowStep | undefined;
	viewerUserId: string;
	uploaderUserId: string;
	adminOverride?: boolean;
	viewerIdentityIds?: string[];
}): void {
	if (!current || current.status !== "current") {
		throw new Error("No active approval step");
	}
	if (current.kind === "activated" || current.kind === "awaiting_executive") {
		throw new Error("This step cannot be decided");
	}

	const viewerIds = [viewerUserId, ...(viewerIdentityIds || [])];
	const isAssignee = isAssigneeMatch(current.assigneeUserIds, viewerIds);
	if (!isAssignee && !adminOverride) {
		throw new Error("You are not an assignee for the current approval step");
	}

	const isUploader = isAssigneeMatch([uploaderUserId], viewerIds);
	if (
		isUploader &&
		!adminOverride &&
		!isDemoMode() &&
		(current.kind === "department_review" ||
			current.kind === "internal_approval" ||
			current.kind === "executive_approval")
	) {
		throw new Error(
			"Uploader cannot approve their own submission at this step",
		);
	}
}

/**
 * Pure status transition after an approve on the current step.
 * Only executive approval may activate.
 */
export function resolveStatusAfterApprove(
	currentKind: ApprovalWorkflowStep["kind"],
	nextKind?: ApprovalWorkflowStep["kind"],
	options?: { digitalSignatureRequired?: boolean },
): string {
	if (currentKind === "executive_approval") {
		return options?.digitalSignatureRequired ? "pending-signature" : "active";
	}
	if (nextKind === "activated") {
		throw new Error("Executive approval is required before activation");
	}
	return "pending-review";
}

export function assigneeHintForKind(
	kind: ApprovalStepKind,
): string | undefined {
	switch (kind) {
		case "executive_approval":
		case "awaiting_executive":
			return "Executive role";
		case "department_review":
			return "Assigned department manager";
		case "activated":
			return "Result of executive approval";
		case "internal_approval":
			return "Internal approver";
		case "submitted":
			return "Uploader";
		default:
			return undefined;
	}
}

/** Pure: upgrade awaiting_executive → executive_approval when assignees exist. */
export function upgradeAwaitingExecutiveStep(
	state: ApprovalWorkflowState,
	executiveIds: string[],
): ApprovalWorkflowState | null {
	const idx = state.currentStepIndex;
	const current = state.steps[idx];
	if (!current || current.kind !== "awaiting_executive") return null;
	const assignees = uniqueIds(executiveIds);
	if (assignees.length === 0) return null;

	const steps = state.steps.map((step, i) => {
		if (i === idx) {
			return {
				id: stepId("executive_approval", i),
				kind: "executive_approval" as const,
				label: "Executive approval",
				assigneeUserIds: assignees,
				status: "current" as const,
			};
		}
		if (step.kind === "activated") {
			return { ...step, assigneeUserIds: assignees };
		}
		return step;
	});

	return {
		...state,
		steps,
		derivedAt: new Date().toISOString(),
	};
}

/** Pure: reset flow to department review after changes were requested. */
export function resetWorkflowForResubmit(
	state: ApprovalWorkflowState,
): ApprovalWorkflowState {
	const steps = state.steps.map((step) => {
		if (step.kind === "submitted") {
			return { ...step, status: "complete" as const };
		}
		if (step.kind === "department_review") {
			return {
				...clearSlaProgress(step),
				status: "current" as const,
				completedAt: undefined,
				completedByUserId: undefined,
				decision: undefined,
				notes: undefined,
			};
		}
		return {
			...clearSlaProgress(step),
			status: "pending" as const,
			completedAt: undefined,
			completedByUserId: undefined,
			decision: undefined,
			notes: undefined,
		};
	});
	const deptIdx = Math.max(
		0,
		steps.findIndex((s) => s.kind === "department_review"),
	);
	return {
		...state,
		steps,
		currentStepIndex: deptIdx,
		derivedAt: new Date().toISOString(),
	};
}

const REASSIGNABLE_KINDS: ApprovalStepKind[] = [
	"department_review",
	"internal_approval",
	"executive_approval",
	"awaiting_executive",
];

/** Pure access check for admin reassignment. */
export function assertReassignAllowed({
	current,
	adminOverride,
}: {
	current: ApprovalWorkflowStep | undefined;
	adminOverride: boolean;
}): void {
	if (!adminOverride) {
		throw new Error("Only Super Admin or Organization Admin can reassign");
	}
	if (!current || current.status !== "current") {
		throw new Error("No active approval step to reassign");
	}
	if (!REASSIGNABLE_KINDS.includes(current.kind)) {
		throw new Error("This step cannot be reassigned");
	}
}

/** Pure: apply new assignees to a step (defaults to currentStepIndex). */
export function applyReassignToCurrentStep(
	state: ApprovalWorkflowState,
	assigneeUserIds: string[],
	stepIndex = state.currentStepIndex,
): ApprovalWorkflowState {
	const assignees = uniqueIds(assigneeUserIds);
	if (assignees.length === 0) {
		throw new Error("At least one assignee is required");
	}
	const idx = stepIndex;
	const current = state.steps[idx];
	if (!current) throw new Error("No active approval step to reassign");

	const steps = state.steps.map((step, i) => {
		if (i !== idx) {
			if (
				(current.kind === "awaiting_executive" ||
					current.kind === "executive_approval") &&
				step.kind === "activated"
			) {
				return { ...step, assigneeUserIds: assignees };
			}
			return step;
		}
		if (current.kind === "awaiting_executive") {
			return {
				id: stepId("executive_approval", i),
				kind: "executive_approval" as const,
				label: "Executive approval",
				assigneeUserIds: assignees,
				status: "current" as const,
			};
		}
		return { ...step, assigneeUserIds: assignees };
	});

	return {
		...state,
		steps,
		currentStepIndex: idx,
		derivedAt: new Date().toISOString(),
	};
}

export function needsExecutiveAssignmentFlag(
	state: ApprovalWorkflowState,
): boolean {
	const current = state.steps[state.currentStepIndex];
	return current?.status === "current" && current.kind === "awaiting_executive";
}

function toReassignCandidate(
	user: {
		$id?: string;
		accountId?: string;
		fullName?: string;
		email?: string;
		avatar?: string | null;
		profileImageId?: string | null;
	},
	roleLabel: string,
): ApprovalReassignCandidate | null {
	// Prefer Auth accountId; user_roles and workflow assignees use that ID.
	const userId = String(user.accountId || user.$id || "").trim();
	if (!userId) return null;
	return {
		userId,
		fullName: String(user.fullName || "Unknown").trim() || "Unknown",
		email: String(user.email || "").trim(),
		roleLabel,
		roleLabels: [roleLabel],
		profileImageUrl: resolveParticipantImageUrl(user),
	};
}

function sortRoleLabels(labels: string[]): string[] {
	const rank = (name: string) => {
		const idx = (ROLE_PRIORITY_ORDER as readonly string[]).indexOf(name);
		return idx === -1 ? 5000 : idx;
	};
	return [...labels].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

/** Eligible assignees for the current step (executives vs department managers). */
export async function buildReassignCandidates(
	orgId: string | undefined,
	stepKind: ApprovalStepKind | undefined,
): Promise<ApprovalReassignCandidate[]> {
	if (!orgId || !stepKind) return [];

	const byId = new Map<string, ApprovalReassignCandidate>();
	const add = (
		users: Array<{
			$id?: string;
			accountId?: string;
			fullName?: string;
			email?: string;
			avatar?: string | null;
			profileImageId?: string | null;
		}>,
		roleLabel: string,
	) => {
		for (const user of users) {
			const candidate = toReassignCandidate(user, roleLabel);
			if (candidate && !byId.has(candidate.userId)) {
				byId.set(candidate.userId, candidate);
			}
		}
	};

	if (stepKind === "executive_approval" || stepKind === "awaiting_executive") {
		const execs = await getAllExecutives(orgId);
		add(execs || [], "Executive");
	} else if (
		stepKind === "department_review" ||
		stepKind === "internal_approval"
	) {
		const managers = await getUsersByRoleNames(
			["Department Manager", "manager"],
			orgId,
			{ status: "active" },
		);
		add(managers || [], "Department Manager");
	}

	const enriched = await Promise.all(
		[...byId.values()].map(async (candidate) => {
			try {
				const roles = await getUserRoles(candidate.userId, orgId);
				const fromDb = roles
					.map((r) => String(r.roleName || "").trim())
					.filter(Boolean);
				const labels = sortRoleLabels([
					...new Set(
						fromDb.length > 0
							? fromDb
							: [candidate.roleLabel].filter(Boolean),
					),
				]);
				return {
					...candidate,
					roleLabels: labels,
					roleLabel: labels.includes(candidate.roleLabel)
						? candidate.roleLabel
						: labels[0] || candidate.roleLabel,
				};
			} catch {
				return candidate;
			}
		}),
	);

	return enriched.sort((a, b) =>
		a.fullName.localeCompare(b.fullName, undefined, { sensitivity: "base" }),
	);
}

/** When managers are reassigned via assign UI, keep department_review in sync. */
export function syncDepartmentAssigneesIfCurrent(
	state: ApprovalWorkflowState,
	managerIds: string[],
): ApprovalWorkflowState | null {
	const assignees = uniqueIds(managerIds);
	if (assignees.length === 0) return null;
	const current = state.steps[state.currentStepIndex];
	if (
		!current ||
		current.status !== "current" ||
		current.kind !== "department_review"
	) {
		return null;
	}
	const steps = state.steps.map((step, i) =>
		i === state.currentStepIndex
			? { ...step, assigneeUserIds: assignees }
			: step,
	);
	return {
		...state,
		steps,
		derivedAt: new Date().toISOString(),
	};
}

/**
 * Keep assignees who are still in the Executive pool.
 * If none remain (stale Super/Org Admin IDs), use the full eligible list.
 */
export function pickExecutiveAssignees(
	currentAssignees: string[],
	eligibleExecutiveIds: string[],
): string[] {
	const eligible = uniqueIds(eligibleExecutiveIds);
	const eligibleSet = new Set(eligible);
	const kept = uniqueIds(currentAssignees).filter((id) => eligibleSet.has(id));
	return kept.length > 0 ? kept : eligible;
}

/**
 * Heal executive_approval steps whose saved assignees predate the Executive role rule.
 * Pass the org’s current Executive pool (already filtered for approve permission).
 */
export async function reconcileExecutiveAssigneesIfCurrent(
	state: ApprovalWorkflowState,
	eligibleExecutiveIds: string[],
): Promise<{ state: ApprovalWorkflowState; changed: boolean }> {
	const current = state.steps[state.currentStepIndex];
	if (
		!current ||
		current.status !== "current" ||
		current.kind !== "executive_approval"
	) {
		return { state, changed: false };
	}

	const eligible = uniqueIds(eligibleExecutiveIds);
	const eligibleKeys = new Set<string>(eligible);
	const canonicalByKey = new Map<string, string>();
	for (const id of eligible) {
		canonicalByKey.set(id, id);
		try {
			const row = await lookupUserRow(id);
			if (!row) continue;
			for (const key of userIdentityKeys(row)) {
				eligibleKeys.add(key);
				canonicalByKey.set(key, id);
			}
		} catch {
			// keep id-only matching
		}
	}

	const keptCanonical: string[] = [];
	for (const assigneeId of uniqueIds(current.assigneeUserIds)) {
		if (eligibleKeys.has(assigneeId)) {
			keptCanonical.push(canonicalByKey.get(assigneeId) || assigneeId);
			continue;
		}
		try {
			const row = await lookupUserRow(assigneeId);
			if (!row) continue;
			const hit = userIdentityKeys(row).find((key) => eligibleKeys.has(key));
			if (hit) keptCanonical.push(canonicalByKey.get(hit) || hit);
		} catch {
			// drop unknown / ineligible assignee
		}
	}

	const nextAssignees = pickExecutiveAssignees(keptCanonical, eligible);
	const unchanged =
		nextAssignees.length === current.assigneeUserIds.length &&
		nextAssignees.every((id) => current.assigneeUserIds.includes(id));
	if (unchanged) return { state, changed: false };

	const steps = state.steps.map((step, index) => {
		if (index === state.currentStepIndex) {
			return { ...step, assigneeUserIds: nextAssignees };
		}
		if (step.kind === "activated") {
			return { ...step, assigneeUserIds: nextAssignees };
		}
		return step;
	});

	return {
		state: {
			...state,
			steps,
			derivedAt: new Date().toISOString(),
		},
		changed: true,
	};
}

/**
 * Pure builder used by tests and initialize/backfill.
 */
export function buildDerivedSteps(
	input: BuildDerivedStepsInput,
): ApprovalWorkflowStep[] {
	const uploader = input.uploaderUserId;
	const managers = uniqueIds(input.departmentManagerIds || []);
	const internals = uniqueIds(input.internalApproverIds || []).filter(
		(id) => id !== uploader,
	);
	const executives = uniqueIds(input.executiveApproverIds || []).filter(
		(id) => id !== uploader,
	);

	const steps: ApprovalWorkflowStep[] = [];
	let i = 0;

	steps.push({
		id: stepId("submitted", i++),
		kind: "submitted",
		label: "Submitted",
		assigneeUserIds: uploader ? [uploader] : [],
		status: "complete",
	});

	steps.push({
		id: stepId("department_review", i++),
		kind: "department_review",
		label: "Department review",
		assigneeUserIds:
			managers.length > 0 ? managers : uploader ? [uploader] : [],
		status: "pending",
	});

	for (const approverId of internals) {
		steps.push({
			id: stepId("internal_approval", i++),
			kind: "internal_approval",
			label: "Internal approval",
			assigneeUserIds: [approverId],
			status: "pending",
		});
	}

	if (executives.length === 0) {
		steps.push({
			id: stepId("awaiting_executive", i++),
			kind: "awaiting_executive",
			label: "Awaiting executive assignment",
			assigneeUserIds: [],
			status: "pending",
		});
	} else {
		steps.push({
			id: stepId("executive_approval", i++),
			kind: "executive_approval",
			label: "Executive approval",
			assigneeUserIds: executives,
			status: "pending",
		});
	}

	steps.push({
		id: stepId("activated", i++),
		kind: "activated",
		label: "Activated",
		// Show the executive assignees on the activation card (not "Unassigned").
		assigneeUserIds: executives.length > 0 ? [...executives] : [],
		status: "pending",
	});

	// Mark first actionable step as current
	const firstPending = steps.findIndex((s) => s.status === "pending");
	if (firstPending >= 0) {
		steps[firstPending].status = "current";
	}

	if (input.contractStatus === "active") {
		for (const step of steps) {
			if (step.kind === "activated") {
				step.status = "complete";
			} else if (step.status !== "complete") {
				step.status = "complete";
			}
		}
	}

	return steps;
}

export function parseWorkflowState(
	raw: string | ApprovalWorkflowState | null | undefined,
): ApprovalWorkflowState | null {
	if (!raw) return null;
	if (typeof raw === "object") return raw;
	try {
		const parsed = JSON.parse(raw) as ApprovalWorkflowState;
		if (!parsed?.steps || !Array.isArray(parsed.steps)) return null;
		return parsed;
	} catch {
		return null;
	}
}

export function serializeWorkflowState(state: ApprovalWorkflowState): string {
	return JSON.stringify(state);
}

async function getContract(contractId: string): Promise<ContractRow> {
	const { tablesDB } = await createAdminClient();
	return (await tablesDB.getRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.contractsCollectionId!,
		rowId: contractId,
	})) as unknown as ContractRow;
}

/** Resolve a viewable storage file from contract.fileId / fileRef. */
async function resolveContractDocument(contract: ContractRow): Promise<{
	fileRef?: string;
	documentUrl?: string;
	documentFileName?: string;
}> {
	const { tablesDB } = await createAdminClient();
	const fileRowId = optionalRowString(contract.fileId) || optionalRowString(contract.fileRef);
	if (fileRowId && appwriteConfig.filesCollectionId) {
		try {
			const fileRow = (await tablesDB.getRow({
				databaseId: appwriteConfig.databaseId!,
				tableId: appwriteConfig.filesCollectionId,
				rowId: fileRowId,
			})) as Record<string, unknown>;
			const bucketFileId = optionalRowString(fileRow.bucketFileId);
			const url = optionalRowString(fileRow.url);
			const name = optionalRowString(fileRow.name);
			if (bucketFileId || url) {
				return {
					fileRef: bucketFileId || undefined,
					documentUrl: url || undefined,
					documentFileName: name,
				};
			}
		} catch {
			/* fall through */
		}
	}

	const directRef = optionalRowString(contract.fileRef);
	const directUrl = optionalRowString(contract.documentUrl);
	if (directRef || directUrl) {
		return {
			fileRef: directRef,
			documentUrl: directUrl,
		};
	}
	return {};
}

async function updateContract(
	contractId: string,
	data: Record<string, unknown>,
): Promise<void> {
	const { tablesDB } = await createAdminClient();
	await writeRowWithSchemaDriftRecovery({
		tablesDB,
		mode: "update",
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.contractsCollectionId!,
		rowId: contractId,
		data,
	});
}

/**
 * Resolve executive approvers: org users with the Executive role and
 * contracts.approve. Org Admin alone is not enough (they may also hold Executive).
 */
export async function resolveExecutiveApproverIds(
	orgId: string | undefined,
	uploaderUserId: string,
): Promise<string[]> {
	const executives = await getAllExecutives(orgId);
	const ids = uniqueIds(
		(executives || []).map(
			(u: { $id?: string; accountId?: string }) => u.accountId || u.$id,
		),
	);
	const withPermission: string[] = [];

	for (const userId of ids) {
		if (userId === uploaderUserId) continue;
		try {
			const allowed = orgId
				? await hasPermission(userId, PERMISSIONS.CONTRACTS.APPROVE, orgId)
				: false;
			if (allowed) withPermission.push(userId);
		} catch {
			// skip
		}
	}

	if (withPermission.length === 0) {
		const others = ids.filter((id) => id !== uploaderUserId);
		if (others.length === 0 && isDemoMode() && uploaderUserId) {
			return [uploaderUserId];
		}
		return others;
	}
	return withPermission;
}

async function resolveManagerIdsFromNamesOrIds(
	values: string[] | undefined,
): Promise<string[]> {
	if (!values?.length) return [];
	const resolved: string[] = [];
	for (const value of values) {
		if (!value) continue;
		// Likely an Appwrite ID
		if (/^[a-zA-Z0-9]{15,36}$/.test(value) && !value.includes(" ")) {
			resolved.push(value);
			continue;
		}
		try {
			const { tablesDB } = await createAdminClient();
			const result = await tablesDB.listRows({
				databaseId: appwriteConfig.databaseId!,
				tableId: appwriteConfig.usersCollectionId!,
				queries: [Query.equal("fullName", value), Query.limit(1)],
			});
			const match = result.rows?.[0] as { $id?: string } | undefined;
			if (match?.$id) resolved.push(match.$id);
		} catch {
			// skip unresolved names
		}
	}
	return uniqueIds(resolved);
}

export async function buildStateForContract(
	contract: ContractRow,
	options?: {
		departmentManagerIds?: string[];
		preserveNotifications?: ApprovalWorkflowNotification[];
	},
): Promise<ApprovalWorkflowState> {
	const uploader = String(contract.contractOwnerId || contract.owner || "");
	const orgId = contract.orgId as string | undefined;
	const managerIds =
		options?.departmentManagerIds ||
		(await resolveManagerIdsFromNamesOrIds(
			contract.assignedManagers as string[] | undefined,
		));
	const executiveIds = await resolveExecutiveApproverIds(orgId, uploader);
	const derivedInput = {
		uploaderUserId: uploader,
		departmentManagerIds: managerIds,
		internalApproverIds: (contract.internalApproverIds as string[]) || [],
		executiveApproverIds: executiveIds,
		contractStatus: contract.status as string | undefined,
	};
	const template = await resolveTemplateForSubmit(orgId, "contract", {
		amount: Number(contract.amount || 0),
		contractType: contract.contractType as string | undefined,
		department: contract.department as string | undefined,
		riskTier: contract.riskTier as string | undefined,
	});
	const steps = template
		? buildStepsFromTemplate(template, derivedInput)
		: buildDerivedSteps(derivedInput);

	const currentStepIndex = Math.max(
		0,
		steps.findIndex((s) => s.status === "current"),
	);

	const state: ApprovalWorkflowState = {
		version: WORKFLOW_VERSION,
		currentStepIndex: currentStepIndex >= 0 ? currentStepIndex : 0,
		derivedAt: new Date().toISOString(),
		steps,
		notifications: options?.preserveNotifications || [],
	};
	return stampCurrentStepSla(state, orgId, "contract");
}

function resolveParticipantImageUrl(user: {
	avatar?: string | null;
	profileImageId?: string | null;
}): string | null {
	return resolveAvatarDisplayUrl(user);
}

/** Resolve a users-table row by Auth accountId, document $id, or full name. */
export async function lookupUserRow(
	identifier: string,
): Promise<Record<string, any> | null> {
	if (!identifier?.trim()) return null;

	try {
		const { tablesDB } = await createAdminClient();
		// Workflow / session ids are usually Auth accountId — query that first
		// so we never hit a getRow 404 when the users-table $id differs.
		const byAccount = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.usersCollectionId!,
			queries: [Query.equal("accountId", identifier), Query.limit(1)],
		});
		if (byAccount.rows?.[0]) {
			return flattenTableRow(
				byAccount.rows[0] as Record<string, unknown>,
			) as Record<string, any>;
		}
	} catch {
		/* fall through to $id / name */
	}

	const byId = await getUserById(identifier);
	if (byId) return flattenTableRow(byId as Record<string, unknown>) as Record<string, any>;

	try {
		const { tablesDB } = await createAdminClient();
		const byName = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.usersCollectionId!,
			queries: [Query.equal("fullName", identifier), Query.limit(1)],
		});
		if (byName.rows?.[0]) {
			return flattenTableRow(
				byName.rows[0] as Record<string, unknown>,
			) as Record<string, any>;
		}
	} catch {
		/* fall through */
	}
	return null;
}

export async function resolveParticipant(
	userId: string,
	viewerUserId: string,
): Promise<ApprovalParticipant> {
	try {
		const user = await lookupUserRow(userId);
		if (!user) {
			return {
				userId,
				fullName: "Unknown user",
				isYou: userId === viewerUserId,
			};
		}
		return {
			// Keep workflow assignee id (usually Auth accountId) so notifications match.
			userId,
			fullName: user.fullName || user.email || "User",
			email: user.email,
			department: user.department || user.division,
			subDepartment: user.subDepartment,
			division: user.division,
			profileImageUrl: resolveParticipantImageUrl(user),
			isYou:
				userId === viewerUserId ||
				user.$id === viewerUserId ||
				user.accountId === viewerUserId,
		};
	} catch {
		return {
			userId,
			fullName: "Unknown user",
			isYou: userId === viewerUserId,
		};
	}
}

function notificationsForStep(
	state: ApprovalWorkflowState,
	stepId: string,
): ApprovalWorkflowNotification[] {
	return (state.notifications || []).filter((n) => n.stepId === stepId);
}

export async function ensureActionableExecutiveStep(
	state: ApprovalWorkflowState,
	orgId: string | undefined,
	uploaderUserId: string,
): Promise<{ state: ApprovalWorkflowState; upgraded: boolean }> {
	if (!needsExecutiveAssignmentFlag(state)) {
		return { state, upgraded: false };
	}
	const executiveIds = await resolveExecutiveApproverIds(orgId, uploaderUserId);
	const upgradedState = upgradeAwaitingExecutiveStep(state, executiveIds);
	if (!upgradedState) return { state, upgraded: false };
	return { state: upgradedState, upgraded: true };
}

export async function applyActiveDelegations(
	state: ApprovalWorkflowState,
	orgId: string | undefined,
	entityType: "contract" | "license",
): Promise<ApprovalWorkflowState> {
	const current = state.steps[state.currentStepIndex];
	if (!current || current.status !== "current" || !orgId) return state;
	const delegations = await listActiveDelegations(orgId);
	const nextAssignees = applyDelegationsToAssignees(
		current.assigneeUserIds,
		delegations,
		entityType,
	);
	if (
		nextAssignees.length === current.assigneeUserIds.length &&
		nextAssignees.every((id) => current.assigneeUserIds.includes(id))
	) {
		return state;
	}
	const steps = state.steps.map((step, index) =>
		index === state.currentStepIndex
			? { ...step, assigneeUserIds: nextAssignees }
			: step,
	);
	const nextState: ApprovalWorkflowState = {
		...state,
		steps,
		derivedAt: new Date().toISOString(),
	};
	if (nextAssignees.some((id) => !current.assigneeUserIds.includes(id))) {
		await appendNotification(nextState, {
			type: "delegated",
			recipientUserIds: nextAssignees,
			stepId: current.id,
			label: "Delegate added from out-of-office coverage",
			detail: `${current.assigneeUserIds.join(",") || "(none)"} → ${nextAssignees.join(",")}`,
		});
	}
	return nextState;
}

async function collectAdminUserIds(
	orgId: string | undefined,
): Promise<string[]> {
	const [supers, admins] = await Promise.all([
		getAllSuperAdmins(orgId),
		getAllAdmins(orgId),
	]);
	return uniqueIds(
		[...supers, ...admins].map(
			(u: { $id?: string; accountId?: string }) => u.accountId || u.$id,
		),
	);
}

/** True when the user holds the Executive RBAC role (approval pool membership). */
export async function userHasExecutiveRole(
	userId: string,
	orgId: string | undefined,
): Promise<boolean> {
	if (!orgId) return false;
	try {
		const roles = await getUserRoles(userId, orgId);
		return roles.some((ur) => ur.roleName === "Executive");
	} catch {
		return false;
	}
}

async function assertAssigneesAreExecutiveApprovers(
	assigneeUserIds: string[],
	orgId: string | undefined,
): Promise<void> {
	for (const userId of uniqueIds(assigneeUserIds)) {
		const ok = await userHasExecutiveRole(userId, orgId);
		if (!ok) {
			throw new Error(
				"Executive approval assignees must hold the Executive role",
			);
		}
	}
}

export async function getWorkflowForViewer(
	contractId: string,
	viewerUserId: string,
	options?: { isAdminOverride?: boolean },
): Promise<ApprovalWorkflowViewerPayload> {
	const contract = await getContract(contractId);
	const contractStatus = String(contract.status || "pending-review");
	const frozen = isTerminalDocumentStatus(contractStatus);
	let state = parseWorkflowState(contract.approvalWorkflowState as string);
	const uploader = String(contract.contractOwnerId || contract.owner || "");
	const orgId = contract.orgId as string | undefined;

	if (!state && !frozen) {
		state = await buildStateForContract(contract);
		await updateContract(contractId, {
			approvalWorkflowState: serializeWorkflowState(state),
			currentApprovalStage: state.steps[state.currentStepIndex]?.label || "",
		});
	}

	if (!frozen && state) {
		const ensured = await ensureActionableExecutiveStep(state, orgId, uploader);
		const eligibleExecs = await resolveExecutiveApproverIds(orgId, uploader);
		const reconciled = await reconcileExecutiveAssigneesIfCurrent(
			ensured.state,
			eligibleExecs,
		);
		const beforeAssignees = [
			...(reconciled.state.steps[reconciled.state.currentStepIndex]
				?.assigneeUserIds || []),
		];
		state = await applyActiveDelegations(reconciled.state, orgId, "contract");
		state = await stampCurrentStepSla(state, orgId, "contract");
		const afterAssignees =
			state.steps[state.currentStepIndex]?.assigneeUserIds || [];
		const assigneesChanged =
			beforeAssignees.length !== afterAssignees.length ||
			afterAssignees.some((id) => !beforeAssignees.includes(id));
		if (
			ensured.upgraded ||
			reconciled.changed ||
			assigneesChanged ||
			!parseWorkflowState(contract.approvalWorkflowState as string)?.steps[
				ensured.state.currentStepIndex
			]?.dueAt
		) {
			await updateContract(contractId, {
				approvalWorkflowState: serializeWorkflowState(state),
				currentApprovalStage: state.steps[state.currentStepIndex]?.label || "",
			});
		}
	}

	if (!state) {
		return {
			contractId,
			contractName: String(contract.contractName || "Untitled Contract"),
			contractStatus,
			department: contract.department as string | undefined,
			businessUnit: contract.businessUnit as string | undefined,
			subDepartment: contract.subDepartment as string | undefined,
			currentStepIndex: 0,
			steps: [],
			notifications: [],
			canDecide: false,
			canOverride: false,
			...emptyViewerFlags(),
			needsExecutiveAssignment: false,
			canAssignExecutive: false,
			canResubmit: false,
			viewerUserId,
			uploaderUserId: uploader || undefined,
			reassignCandidates: [],
			workflowFrozen: frozen,
			expirationAttestationId: frozen
				? await resolveAttestationId(orgId, "contract", contractId)
				: undefined,
			amount: Number(contract.amount || 0) || undefined,
			contractType: optionalRowString(contract.contractType),
			documentNumber: optionalRowString(contract.contractNumber),
			counterpartyName: optionalRowString(
				contract.counterpartyLegalName || contract.vendor,
			),
			renewalTerm: optionalRowString(
				contract.renewalDate || contract.contractTerm || contract.termLength,
			),
		};
	}

	const participantCache = new Map<string, ApprovalParticipant>();
	const ensureParticipant = async (id: string) => {
		if (!participantCache.has(id)) {
			participantCache.set(id, await resolveParticipant(id, viewerUserId));
		}
		return participantCache.get(id)!;
	};

	const steps = await Promise.all(
		state.steps.map(async (step) => {
			const participants = await Promise.all(
				step.assigneeUserIds.map((id) => ensureParticipant(id)),
			);
			return {
				...step,
				assigneeHint: assigneeHintForKind(step.kind),
				participants: participants.map((p) => ({
					...p,
					isYou:
						p.userId === viewerUserId ||
						(step.kind === "submitted" && p.userId === viewerUserId),
					fullName:
						step.kind === "submitted" && p.userId === viewerUserId
							? "You"
							: p.fullName,
				})),
				notifications: notificationsForStep(state!, step.id),
			};
		}),
	);

	const current = state.steps[state.currentStepIndex];
	const viewerRow = await lookupUserRow(viewerUserId);
	const viewerIds = viewerRow
		? userIdentityKeys(viewerRow)
		: [viewerUserId];
	const resolved = resolveViewerCurrentStep(state, viewerIds);
	const capabilityStep = resolved.step || current;
	const isAssignee = isAssigneeMatch(capabilityStep?.assigneeUserIds, viewerIds);
	const isExecStep =
		capabilityStep?.kind === "executive_approval" ||
		capabilityStep?.kind === "awaiting_executive";
	const canApprove = await hasPermission(
		viewerUserId,
		PERMISSIONS.CONTRACTS.APPROVE,
		orgId,
	);
	// Claim/decide on executive steps requires the Executive role + APPROVE.
	const canDecideByRole = isExecStep
		? canApprove && (await userHasExecutiveRole(viewerUserId, orgId))
		: await hasPermission(
				viewerUserId,
				PERMISSIONS.CONTRACTS.REVIEW,
				orgId,
			).then((review) => review || canApprove);
	const flags = computeViewerCapabilities({
		frozen,
		current: capabilityStep,
		contractStatus,
		isAssignee,
		canDecideByRole,
		isAdminOverride: !!options?.isAdminOverride,
		canApprove,
	});

	const needsExecutiveAssignment = frozen
		? false
		: needsExecutiveAssignmentFlag(state);
	const canResubmit =
		!frozen &&
		contractStatus === "action-required" &&
		(viewerUserId === uploader || !!options?.isAdminOverride);
	const canAssignExecutive =
		!frozen && needsExecutiveAssignment && !!options?.isAdminOverride;
	const canReassignUi =
		!frozen &&
		!!options?.isAdminOverride &&
		(needsExecutiveAssignment || capabilityStep?.status === "current") &&
		capabilityStep?.kind !== "activated" &&
		capabilityStep?.kind !== "submitted";
	const reassignCandidates = canReassignUi
		? await buildReassignCandidates(orgId, capabilityStep?.kind)
		: [];
	const document = await resolveContractDocument(contract);

	return {
		contractId,
		contractName: String(contract.contractName || "Untitled Contract"),
		contractStatus,
		department: contract.department as string | undefined,
		businessUnit: contract.businessUnit as string | undefined,
		subDepartment: contract.subDepartment as string | undefined,
		currentStepIndex: resolved.index >= 0 ? resolved.index : state.currentStepIndex,
		steps,
		notifications: state.notifications || [],
		...flags,
		needsExecutiveAssignment,
		canAssignExecutive,
		canResubmit,
		viewerUserId,
		uploaderUserId: uploader || undefined,
		reassignCandidates,
		workflowFrozen: frozen,
		expirationAttestationId: frozen
			? await resolveAttestationId(orgId, "contract", contractId)
			: undefined,
		fileRef: document.fileRef,
		documentUrl: document.documentUrl,
		documentFileName: document.documentFileName,
		amount: Number(contract.amount || 0) || undefined,
		contractType: optionalRowString(contract.contractType),
		documentNumber: optionalRowString(contract.contractNumber),
		counterpartyName: optionalRowString(
			contract.counterpartyLegalName || contract.vendor,
		),
		renewalTerm: optionalRowString(
			contract.renewalDate || contract.contractTerm || contract.termLength,
		),
	};
}

async function appendNotification(
	state: ApprovalWorkflowState,
	notification: Omit<ApprovalWorkflowNotification, "id" | "sentAt"> & {
		sentAt?: string;
	},
): Promise<ApprovalWorkflowNotification> {
	const entry: ApprovalWorkflowNotification = {
		id: ID.unique(),
		sentAt: notification.sentAt || new Date().toISOString(),
		type: notification.type,
		recipientUserIds: uniqueIds(notification.recipientUserIds),
		stepId: notification.stepId,
		label: notification.label,
		actorUserId: notification.actorUserId,
		reason: notification.reason,
		detail: notification.detail,
	};
	state.notifications = [...(state.notifications || []), entry];
	return entry;
}

async function notifyUsers(
	userIds: string[],
	_type: string,
	title: string,
	message: string,
	metadata?: Record<string, unknown>,
): Promise<void> {
	const entityId = String(metadata?.contractId || "");
	if (!entityId) {
		for (const userId of uniqueIds(userIds)) {
			try {
				await triggerNotification("info", {
					userId,
					title,
					message,
					priority: "high",
					metadata,
				});
			} catch (error) {
				console.error(`Failed to notify ${userId}:`, error);
			}
		}
		return;
	}
	await notifyApprovalAssignees({
		entityType: "contract",
		entityId,
		userIds,
		title,
		message,
		metadata,
	});
}

export async function initializeOnUpload({
	contractId,
	departmentManagerIds,
}: {
	contractId: string;
	departmentManagerIds?: string[];
}): Promise<ApprovalWorkflowState> {
	const contract = await getContract(contractId);
	const state = await buildStateForContract(contract, {
		departmentManagerIds,
	});

	const current = state.steps[state.currentStepIndex];
	const uploader = String(contract.contractOwnerId || contract.owner || "");
	const recipients = uniqueIds([
		...(current?.assigneeUserIds || []),
		...(departmentManagerIds || []).filter((id) => id !== uploader),
	]);

	if (recipients.length > 0) {
		await appendNotification(state, {
			type: "pending_review",
			recipientUserIds: recipients,
			stepId: current?.id,
			label: "Pending review notification",
		});
		await notifyUsers(
			recipients,
			"info",
			`Contract pending review: ${contract.contractName || "Contract"}`,
			`"${contract.contractName || "A contract"}" was submitted and needs your review.`,
			{
				contractId,
				actionUrl: "/contracts/approvals",
				actionText: "Open Approvals",
			},
		);
	}

	await appendNotification(state, {
		type: "upload_submitted",
		recipientUserIds: uploader ? [uploader] : [],
		stepId: state.steps[0]?.id,
		label: "Upload confirmation",
	});

	await updateContract(contractId, {
		approvalWorkflowState: serializeWorkflowState(state),
		currentApprovalStage: current?.label || "Department review",
		status:
			contract.status === "action-required"
				? "action-required"
				: "pending-review",
	});

	return state;
}

export async function decide({
	contractId,
	viewerUserId,
	decision,
	notes,
	adminOverride = false,
}: {
	contractId: string;
	viewerUserId: string;
	decision: ApprovalDecision;
	notes?: string;
	adminOverride?: boolean;
}): Promise<{
	state: ApprovalWorkflowState;
	contractStatus: string;
}> {
	const contract = await getContract(contractId);
	assertWorkflowMutable(contract.status as string | undefined);
	let state =
		parseWorkflowState(contract.approvalWorkflowState as string) ||
		(await buildStateForContract(contract));
	const uploader = String(contract.contractOwnerId || contract.owner || "");
	const orgId = contract.orgId as string | undefined;

	const ensured = await ensureActionableExecutiveStep(state, orgId, uploader);
	state = ensured.state;

	const viewerRow = await lookupUserRow(viewerUserId);
	const viewerIdentityIds = viewerRow
		? userIdentityKeys(viewerRow)
		: [viewerUserId];
	const resolved = resolveViewerCurrentStep(state, viewerIdentityIds);
	const stepIndex = resolved.index;
	const current = state.steps[stepIndex];
	assertDecisionAllowed({
		current,
		viewerUserId,
		uploaderUserId: uploader,
		adminOverride,
		viewerIdentityIds,
	});

	if (
		(decision === "changes_requested" || decision === "rejected" || adminOverride) &&
		!notes?.trim()
	) {
		throw new Error(
			adminOverride
				? "Notes are required for an admin override"
				: "Notes are required for deny or request changes",
		);
	}

	const now = new Date().toISOString();
	current.completedAt = now;
	current.completedByUserId = viewerUserId;
	current.decision = decision;
	current.notes = notes?.trim() || undefined;

	let nextStatus = String(contract.status || "pending-review");

	if (decision === "rejected") {
		current.status = "rejected";
		nextStatus = "inactive";
		await appendNotification(state, {
			type: "rejected",
			recipientUserIds: uploader ? [uploader] : [],
			stepId: current.id,
			actorUserId: viewerUserId,
			label: "Rejection notice",
		});
		if (uploader) {
			await notifyUsers(
				[uploader],
				"info",
				`Contract rejected: ${contract.contractName || "Contract"}`,
				notes || "Your contract was rejected during approval.",
				{ contractId, actionUrl: "/contracts", actionText: "View Contracts" },
			);
		}
	} else if (decision === "changes_requested") {
		current.status = "changes_requested";
		nextStatus = "action-required";
		await appendNotification(state, {
			type: "changes_requested",
			recipientUserIds: uploader ? [uploader] : [],
			stepId: current.id,
			actorUserId: viewerUserId,
			label: "Changes requested",
		});
		if (uploader) {
			await notifyUsers(
				[uploader],
				"info",
				`Changes requested: ${contract.contractName || "Contract"}`,
				notes || "Please update the contract and resubmit.",
				{ contractId, actionUrl: "/contracts", actionText: "View Contracts" },
			);
		}
	} else {
		// approved
		current.status = "complete";
		const groupId = current.parallelGroupId;
		const siblingsIncomplete =
			!!groupId &&
			state.steps.some(
				(step, index) =>
					index !== stepIndex &&
					step.parallelGroupId === groupId &&
					step.status !== "complete" &&
					step.status !== "skipped" &&
					step.status !== "rejected",
			);
		state = advanceWorkflowAfterApprove(state, stepIndex);
		const nextIndex = state.currentStepIndex;
		const nextStep = siblingsIncomplete ? undefined : state.steps[nextIndex];
		const digitalSignatureRequired =
			contract.digitalSignatureRequired === true ||
			contract.digitalSignatureRequired === "true";
		nextStatus = resolveStatusAfterApprove(current.kind, nextStep?.kind, {
			digitalSignatureRequired,
		});

		if (current.kind === "executive_approval") {
			if (nextStep?.kind === "activated") {
				nextStep.status = "complete";
				nextStep.completedAt = now;
				nextStep.completedByUserId = viewerUserId;
				nextStep.assigneeUserIds = uniqueIds([
					...(nextStep.assigneeUserIds || []),
					viewerUserId,
				]);
				state.currentStepIndex = nextIndex;
			}
			const managerIds = await resolveManagerIdsFromNamesOrIds(
				contract.assignedManagers as string[] | undefined,
			);
			const recipients = uniqueIds([uploader, ...managerIds]);
			await appendNotification(state, {
				type: "executive_approved",
				recipientUserIds: recipients,
				stepId: current.id,
				actorUserId: viewerUserId,
				label: "Executive approved",
			});
			await notifyUsers(
				recipients,
				"info",
				nextStatus === "pending-signature"
					? `Contract ready for signature: ${contract.contractName || "Contract"}`
					: `Contract activated: ${contract.contractName || "Contract"}`,
				nextStatus === "pending-signature"
					? `"${contract.contractName || "Contract"}" is approved and waiting for e-signature.`
					: `"${contract.contractName || "Contract"}" is now active.`,
				{ contractId, actionUrl: "/contracts", actionText: "View Contracts" },
			);
		} else if (nextStep && !siblingsIncomplete) {
			if (nextStep.kind === "awaiting_executive") {
				const execIds = await resolveExecutiveApproverIds(orgId, uploader);
				const upgraded = upgradeAwaitingExecutiveStep(
					{
						...state,
						currentStepIndex: nextIndex,
						steps: state.steps.map((s, i) =>
							i === nextIndex ? { ...s, status: "current" } : s,
						),
					},
					execIds,
				);
				if (upgraded) {
					state.steps = upgraded.steps;
					state.currentStepIndex = upgraded.currentStepIndex;
					state.derivedAt = upgraded.derivedAt;
					const execStep = state.steps[state.currentStepIndex];
					await appendNotification(state, {
						type: "stage_advanced",
						recipientUserIds: uniqueIds([
							...(execStep?.assigneeUserIds || []),
							uploader,
						]),
						stepId: execStep?.id,
						label: "Stage advanced",
					});
					await notifyUsers(
						execStep?.assigneeUserIds || [],
						"info",
						`Approval needed: ${contract.contractName || "Contract"}`,
						`"${contract.contractName || "A contract"}" is ready for ${execStep?.label}.`,
						{
							contractId,
							actionUrl: "/contracts/approvals",
							actionText: "Open Approvals",
						},
					);
				} else {
					nextStep.status = "current";
					state.currentStepIndex = nextIndex;
					const admins = await collectAdminUserIds(orgId);
					await appendNotification(state, {
						type: "needs_executive_assignment",
						recipientUserIds: admins,
						stepId: nextStep.id,
						label: "Needs executive assignment",
					});
					await notifyUsers(
						admins,
						"info",
						`Executive needed: ${contract.contractName || "Contract"}`,
						`"${contract.contractName || "A contract"}" is waiting for an executive assignee (Executive role).`,
						{
							contractId,
							actionUrl: "/contracts/approvals",
							actionText: "Open Approvals",
						},
					);
				}
			} else {
				// advanceWorkflowAfterApprove already marked next (or parallel group) current
				const notifyAssignees = uniqueIds(
					state.steps
						.filter(
							(s) =>
								s.status === "current" &&
								(!nextStep.parallelGroupId ||
									s.parallelGroupId === nextStep.parallelGroupId),
						)
						.flatMap((s) => s.assigneeUserIds),
				);
				await appendNotification(state, {
					type: "stage_advanced",
					recipientUserIds: uniqueIds([...notifyAssignees, uploader]),
					stepId: nextStep.id,
					label: "Stage advanced",
				});
				await notifyUsers(
					notifyAssignees,
					"info",
					`Approval needed: ${contract.contractName || "Contract"}`,
					`"${contract.contractName || "A contract"}" is ready for ${nextStep.label}.`,
					{
						contractId,
						actionUrl: "/contracts/approvals",
						actionText: "Open Approvals",
					},
				);
			}
		}
	}

	state = await stampCurrentStepSla(state, orgId, "contract");
	await updateContract(contractId, {
		approvalWorkflowState: serializeWorkflowState(state),
		status: nextStatus,
		currentApprovalStage: state.steps[state.currentStepIndex]?.label || "",
		reviewerComments: notes?.trim()
			? String(notes).slice(0, 500)
			: contract.reviewerComments,
	});

	try {
		const actor = await lookupUserRow(viewerUserId);
		await logAuditEvent({
			event_id: ID.unique(),
			event_title: `Contract ${decision.replace(/_/g, " ")}`,
			action: "approval_decided",
			source: "caalm",
			user_id: viewerUserId,
			user_name: String(actor?.fullName || "Unknown"),
			user_email: String(actor?.email || ""),
			orgId,
			status: "success",
			module: "contracts",
			target_type: "contract",
			target_id: contractId,
			target_label: String(contract.contractName || "Contract"),
			summary: `${decision} at ${current.kind}`,
			changes: [
				{
					field: "status",
					before: String(contract.status || ""),
					after: nextStatus,
				},
				{
					field: "approvalStep",
					before: current.kind,
					after: state.steps[state.currentStepIndex]?.kind || current.kind,
				},
			],
		});
	} catch (error) {
		console.warn(
			"[SERVER] decide: audit log failed:",
			error instanceof Error ? error.message : error,
		);
	}

	return { state, contractStatus: nextStatus };
}

export async function reassignCurrentStep({
	contractId,
	viewerUserId,
	assigneeUserIds,
	reason,
	adminOverride = false,
}: {
	contractId: string;
	viewerUserId: string;
	assigneeUserIds: string[];
	reason: string;
	adminOverride?: boolean;
}): Promise<ApprovalWorkflowState> {
	const trimmedReason = reason.trim();
	if (trimmedReason.length < 10) {
		throw new Error("A reassignment reason of at least 10 characters is required");
	}

	const contract = await getContract(contractId);
	assertWorkflowMutable(contract.status as string | undefined);
	let state =
		parseWorkflowState(contract.approvalWorkflowState as string) ||
		(await buildStateForContract(contract));
	const uploader = String(contract.contractOwnerId || contract.owner || "");
	const orgId = contract.orgId as string | undefined;

	const ensured = await ensureActionableExecutiveStep(state, orgId, uploader);
	state = ensured.state;

	const current = state.steps[state.currentStepIndex];
	assertReassignAllowed({ current, adminOverride });

	// SoD: uploader must not be reassigned onto their own approval step.
	if (
		uploader &&
		assigneeUserIds.some((id) => id === uploader) &&
		(current?.kind === "department_review" ||
			current?.kind === "internal_approval" ||
			current?.kind === "executive_approval")
	) {
		throw new Error(
			"Uploader cannot be assigned as an approver on their own submission",
		);
	}

	if (
		current?.kind === "executive_approval" ||
		current?.kind === "awaiting_executive"
	) {
		await assertAssigneesAreExecutiveApprovers(assigneeUserIds, orgId);
	}

	const previousAssignees = [...(current?.assigneeUserIds || [])];
	state = applyReassignToCurrentStep(state, assigneeUserIds);
	const nextCurrent = state.steps[state.currentStepIndex];

	await appendNotification(state, {
		type: "reassigned",
		recipientUserIds: uniqueIds([
			...(nextCurrent?.assigneeUserIds || []),
			uploader,
			viewerUserId,
		]),
		stepId: nextCurrent?.id,
		actorUserId: viewerUserId,
		reason: trimmedReason,
		detail: `${previousAssignees.join(",") || "(none)"} → ${assigneeUserIds.join(",")}`,
		label: `Reassigned: ${trimmedReason}`,
	});
	await notifyUsers(
		nextCurrent?.assigneeUserIds || [],
		"info",
		`Reassigned: ${contract.contractName || "Contract"}`,
		`You were assigned to "${nextCurrent?.label}" for "${contract.contractName || "a contract"}".`,
		{
			contractId,
			actionUrl: "/contracts/approvals",
			actionText: "Open Approvals",
		},
	);

	state = await stampCurrentStepSla(state, orgId, "contract");
	await updateContract(contractId, {
		approvalWorkflowState: serializeWorkflowState(state),
		currentApprovalStage: nextCurrent?.label || "",
		...(current?.kind === "department_review"
			? { assignedManagers: uniqueIds(assigneeUserIds) }
			: {}),
	});

	return state;
}

export function assertClaimAllowed({
	current,
	viewerUserId,
	viewerIdentityIds,
}: {
	current: ApprovalWorkflowStep | undefined;
	viewerUserId: string;
	viewerIdentityIds?: string[];
}): void {
	if (!current || current.status !== "current") {
		throw new Error("No active approval step to claim");
	}
	if (!REASSIGNABLE_KINDS.includes(current.kind)) {
		throw new Error("This step cannot be claimed");
	}
	if (isAssigneeMatch(current.assigneeUserIds, [viewerUserId, ...(viewerIdentityIds || [])])) {
		throw new Error("You are already assigned to this step");
	}
}

export async function claimCurrentStep({
	contractId,
	viewerUserId,
}: {
	contractId: string;
	viewerUserId: string;
}): Promise<ApprovalWorkflowState> {
	const contract = await getContract(contractId);
	assertWorkflowMutable(contract.status as string | undefined);
	let state =
		parseWorkflowState(contract.approvalWorkflowState as string) ||
		(await buildStateForContract(contract));
	const uploader = String(contract.contractOwnerId || contract.owner || "");
	const orgId = contract.orgId as string | undefined;
	const ensured = await ensureActionableExecutiveStep(state, orgId, uploader);
	state = ensured.state;

	const viewerRow = await lookupUserRow(viewerUserId);
	const viewerIdentityIds = viewerRow
		? userIdentityKeys(viewerRow)
		: [viewerUserId];
	// Prefer a current step the viewer is not already on (parallel claim).
	const claimable = state.steps
		.map((step, index) => ({ step, index }))
		.find(
			({ step }) =>
				step.status === "current" &&
				REASSIGNABLE_KINDS.includes(step.kind) &&
				!isAssigneeMatch(step.assigneeUserIds, viewerIdentityIds),
		);
	const stepIndex = claimable?.index ?? state.currentStepIndex;
	const current = state.steps[stepIndex];
	assertClaimAllowed({
		current,
		viewerUserId,
		viewerIdentityIds,
	});

	if (
		current?.kind === "executive_approval" ||
		current?.kind === "awaiting_executive"
	) {
		await assertAssigneesAreExecutiveApprovers([viewerUserId], orgId);
	}

	state = applyReassignToCurrentStep(
		state,
		uniqueIds([...(current?.assigneeUserIds || []), viewerUserId]),
		stepIndex,
	);
	const nextCurrent = state.steps[stepIndex];
	await appendNotification(state, {
		type: "claimed",
		recipientUserIds: uniqueIds([
			...(nextCurrent?.assigneeUserIds || []),
			uploader,
			viewerUserId,
		]),
		stepId: nextCurrent?.id,
		actorUserId: viewerUserId,
		label: "Step claimed",
	});
	await notifyUsers(
		nextCurrent?.assigneeUserIds || [],
		"info",
		`Claimed: ${contract.contractName || "Contract"}`,
		`${viewerRow?.fullName || "A reviewer"} claimed "${nextCurrent?.label}" for "${contract.contractName || "a contract"}".`,
		{
			contractId,
			actionUrl: "/contracts/approvals",
			actionText: "Open Approvals",
		},
	);

	state = await stampCurrentStepSla(state, orgId, "contract");
	await updateContract(contractId, {
		approvalWorkflowState: serializeWorkflowState(state),
		currentApprovalStage: nextCurrent?.label || "",
		...(current?.kind === "department_review"
			? { assignedManagers: uniqueIds(nextCurrent?.assigneeUserIds || []) }
			: {}),
	});

	try {
		await logAuditEvent({
			event_id: ID.unique(),
			event_title: "Approval step claimed",
			action: "approval_claimed",
			source: "caalm",
			user_id: viewerUserId,
			user_name: String(viewerRow?.fullName || "Unknown"),
			user_email: String(viewerRow?.email || ""),
			orgId,
			status: "success",
			module: "contracts",
			target_type: "contract",
			target_id: contractId,
			target_label: String(contract.contractName || "Contract"),
			summary: `claimed ${nextCurrent?.kind}`,
		});
	} catch (error) {
		console.warn(
			"[SERVER] claim: audit log failed:",
			error instanceof Error ? error.message : error,
		);
	}

	return state;
}

export async function overrideCompletedWorkflow({
	contractId,
	viewerUserId,
	decision,
	notes,
}: {
	contractId: string;
	viewerUserId: string;
	decision: ApprovalDecision;
	notes: string;
}): Promise<{ state: ApprovalWorkflowState; contractStatus: string }> {
	if (!notes.trim()) {
		throw new Error("Notes are required for an admin override");
	}
	if (decision === "approved") {
		throw new Error("Completed workflows can only be rejected or sent back");
	}
	const contract = await getContract(contractId);
	let state =
		parseWorkflowState(contract.approvalWorkflowState as string) ||
		(await buildStateForContract(contract));
	const uploader = String(contract.contractOwnerId || contract.owner || "");
	const orgId = contract.orgId as string | undefined;
	const nextStatus = decision === "rejected" ? "inactive" : "action-required";
	if (decision === "changes_requested") {
		state = resetWorkflowForResubmit(state);
	}
	await appendNotification(state, {
		type: decision === "rejected" ? "rejected" : "changes_requested",
		recipientUserIds: uploader ? [uploader] : [],
		stepId: state.steps[state.currentStepIndex]?.id,
		label: "Admin override after completion",
	});
	await updateContract(contractId, {
		approvalWorkflowState: serializeWorkflowState(state),
		status: nextStatus,
		currentApprovalStage: state.steps[state.currentStepIndex]?.label || "",
		reviewerComments: notes.trim().slice(0, 500),
	});
	return { state, contractStatus: nextStatus };
}

export async function resubmitAfterChanges({
	contractId,
	viewerUserId,
	adminOverride = false,
}: {
	contractId: string;
	viewerUserId: string;
	adminOverride?: boolean;
}): Promise<{ state: ApprovalWorkflowState; contractStatus: string }> {
	const contract = await getContract(contractId);
	assertWorkflowMutable(contract.status as string | undefined);
	const status = String(contract.status || "");
	if (status !== "action-required") {
		throw new Error("Only items with requested changes can be resubmitted");
	}
	const uploader = String(contract.contractOwnerId || contract.owner || "");
	const orgId = contract.orgId as string | undefined;
	if (viewerUserId !== uploader && !adminOverride) {
		throw new Error("Only the uploader can resubmit after changes");
	}

	let state =
		parseWorkflowState(contract.approvalWorkflowState as string) ||
		(await buildStateForContract(contract));
	state = resetWorkflowForResubmit(state);
	const dept = state.steps[state.currentStepIndex];

	await appendNotification(state, {
		type: "resubmitted",
		recipientUserIds: uniqueIds([...(dept?.assigneeUserIds || []), uploader]),
		stepId: dept?.id,
		label: "Resubmitted for review",
	});
	await notifyUsers(
		dept?.assigneeUserIds || [],
		"info",
		`Resubmitted: ${contract.contractName || "Contract"}`,
		`"${contract.contractName || "A contract"}" was resubmitted and needs department review.`,
		{
			contractId,
			actionUrl: "/contracts/approvals",
			actionText: "Open Approvals",
		},
	);

	const nextStatus = "pending-review";
	state = await stampCurrentStepSla(state, orgId, "contract");
	await updateContract(contractId, {
		approvalWorkflowState: serializeWorkflowState(state),
		status: nextStatus,
		currentApprovalStage: dept?.label || "Department review",
	});

	return { state, contractStatus: nextStatus };
}

export async function backfillPendingWorkflows(limit = 200): Promise<number> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.contractsCollectionId!,
		queries: [
			Query.or([
				Query.equal("status", "pending-review"),
				Query.equal("status", "action-required"),
			]),
			Query.limit(limit),
		],
	});

	let updated = 0;
	for (const row of result.rows as unknown as ContractRow[]) {
		if (parseWorkflowState(row.approvalWorkflowState as string)) continue;
		const state = await buildStateForContract(row);
		await updateContract(row.$id, {
			approvalWorkflowState: serializeWorkflowState(state),
			currentApprovalStage: state.steps[state.currentStepIndex]?.label || "",
		});
		updated += 1;
	}
	return updated;
}
