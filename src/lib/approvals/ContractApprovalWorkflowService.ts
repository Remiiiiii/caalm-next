import { ID, Query } from "node-appwrite";
import { PERMISSIONS } from "@/constants/permissions";
import { getUserById } from "@/lib/actions/user.actions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { writeRowWithSchemaDriftRecovery } from "@/lib/appwrite/schemaDriftRecovery";
import { isDemoMode } from "@/lib/config/demo-mode";
import { getUserRoles, hasPermission } from "@/lib/rbac/permissions";
import { getProfilePictureUrl } from "@/lib/utils";
import {
	getAllAdmins,
	getAllExecutives,
	getUsersByRoleNames,
} from "@/lib/utils/get-users-by-role";
import { triggerNotification } from "@/lib/utils/notificationTriggers";
import {
	clearSlaProgress,
	stampCurrentStepSla,
} from "@/lib/approvals/ApprovalSlaService";
import {
	assertWorkflowMutable,
	isTerminalDocumentStatus,
} from "@/lib/approvals/documentStatus";
import { resolveAttestationId } from "@/lib/approvals/resolveAttestationId";
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

function stepId(kind: string, index: number): string {
	return `${kind}-${index}`;
}

/**
 * Pure access checks for decide() and API tests.
 */
export function assertDecisionAllowed({
	current,
	viewerUserId,
	uploaderUserId,
	adminOverride = false,
}: {
	current: ApprovalWorkflowStep | undefined;
	viewerUserId: string;
	uploaderUserId: string;
	adminOverride?: boolean;
}): void {
	if (!current || current.status !== "current") {
		throw new Error("No active approval step");
	}
	if (current.kind === "activated" || current.kind === "awaiting_executive") {
		throw new Error("This step cannot be decided");
	}

	const isAssignee = current.assigneeUserIds.includes(viewerUserId);
	if (!isAssignee && !adminOverride) {
		throw new Error("You are not an assignee for the current approval step");
	}

	if (
		current.kind === "executive_approval" &&
		viewerUserId === uploaderUserId &&
		!adminOverride &&
		!isDemoMode()
	) {
		throw new Error(
			"Uploader cannot approve their own contract at executive step",
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
): string {
	if (currentKind === "executive_approval") {
		return "active";
	}
	if (nextKind === "activated") {
		throw new Error("Executive approval is required before activation");
	}
	return "pending-review";
}

export function assigneeHintForKind(kind: ApprovalStepKind): string | undefined {
	switch (kind) {
		case "executive_approval":
		case "awaiting_executive":
			return "Super Admin or Organization Admin";
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

/** Pure: apply new assignees to the current step (upgrades awaiting_executive). */
export function applyReassignToCurrentStep(
	state: ApprovalWorkflowState,
	assigneeUserIds: string[],
): ApprovalWorkflowState {
	const assignees = uniqueIds(assigneeUserIds);
	if (assignees.length === 0) {
		throw new Error("At least one assignee is required");
	}
	const idx = state.currentStepIndex;
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
		derivedAt: new Date().toISOString(),
	};
}

export function needsExecutiveAssignmentFlag(
	state: ApprovalWorkflowState,
): boolean {
	const current = state.steps[state.currentStepIndex];
	return (
		current?.status === "current" && current.kind === "awaiting_executive"
	);
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
		profileImageUrl: resolveParticipantImageUrl(user),
	};
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

	if (
		stepKind === "executive_approval" ||
		stepKind === "awaiting_executive"
	) {
		const [execs, admins] = await Promise.all([
			getAllExecutives(orgId),
			getAllAdmins(orgId),
		]);
		add(execs || [], "Super Admin");
		add(admins || [], "Organization Admin");
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

	return [...byId.values()].sort((a, b) =>
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
 * Resolve executive approvers: org users with contracts.approve, excluding uploader.
 */
export async function resolveExecutiveApproverIds(
	orgId: string | undefined,
	uploaderUserId: string,
): Promise<string[]> {
	const [executives, admins] = await Promise.all([
		getAllExecutives(orgId),
		getAllAdmins(orgId),
	]);
	const candidates = [...executives, ...admins];
	const ids = uniqueIds(
		candidates.map(
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

	// Fallback: if permission lookup yields none, still use executives/admins excluding uploader
	if (withPermission.length === 0) {
		const others = ids.filter((id) => id !== uploaderUserId);
		// Solo demo orgs: allow the uploader to complete executive approval.
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

	const steps = buildDerivedSteps({
		uploaderUserId: uploader,
		departmentManagerIds: managerIds,
		internalApproverIds: (contract.internalApproverIds as string[]) || [],
		executiveApproverIds: executiveIds,
		contractStatus: contract.status as string | undefined,
	});

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
	const avatarValue = user.avatar?.trim();
	if (avatarValue && /^https?:\/\//i.test(avatarValue)) {
		return avatarValue;
	}
	if (avatarValue?.startsWith("/")) {
		return avatarValue;
	}
	const imageId =
		avatarValue && !/^https?:\/\//i.test(avatarValue)
			? avatarValue
			: user.profileImageId || null;
	return getProfilePictureUrl(imageId);
}

/** Resolve a users-table row by document $id, Auth accountId, or full name. */
export async function lookupUserRow(
	identifier: string,
): Promise<Record<string, any> | null> {
	const byId = await getUserById(identifier);
	if (byId) return byId as Record<string, any>;

	try {
		const { tablesDB } = await createAdminClient();
		const byAccount = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.usersCollectionId!,
			queries: [Query.equal("accountId", identifier), Query.limit(1)],
		});
		if (byAccount.rows?.[0]) return byAccount.rows[0] as Record<string, any>;

		const byName = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.usersCollectionId!,
			queries: [Query.equal("fullName", identifier), Query.limit(1)],
		});
		if (byName.rows?.[0]) return byName.rows[0] as Record<string, any>;
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

async function collectAdminUserIds(orgId: string | undefined): Promise<string[]> {
	const [executives, admins] = await Promise.all([
		getAllExecutives(orgId),
		getAllAdmins(orgId),
	]);
	return uniqueIds(
		[...executives, ...admins].map((u: { $id?: string }) => u.$id),
	);
}

async function assertAssigneesAreExecOrAdmin(
	assigneeUserIds: string[],
	orgId: string | undefined,
): Promise<void> {
	for (const userId of uniqueIds(assigneeUserIds)) {
		const roles = orgId ? await getUserRoles(userId, orgId) : [];
		const ok = roles.some((r) => {
			const name = r.roleName || "";
			return name === "Super Admin" || name === "Organization Admin";
		});
		if (!ok) {
			throw new Error(
				"Executive approval assignees must be Super Admin or Organization Admin",
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
		state = await stampCurrentStepSla(ensured.state, orgId, "contract");
		if (
			ensured.upgraded ||
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
	const isAssignee = !!current?.assigneeUserIds.includes(viewerUserId);
	const isExecStep = current?.kind === "executive_approval";
	const canDecideByRole = isExecStep
		? await hasPermission(
				viewerUserId,
				PERMISSIONS.CONTRACTS.APPROVE,
				orgId,
			)
		: await hasPermission(
				viewerUserId,
				PERMISSIONS.CONTRACTS.REVIEW,
				orgId,
			).then(
				async (review) =>
					review ||
					(await hasPermission(
						viewerUserId,
						PERMISSIONS.CONTRACTS.APPROVE,
						orgId,
					)),
			);

	const canDecide =
		current?.status === "current" &&
		current.kind !== "activated" &&
		current.kind !== "awaiting_executive" &&
		(isAssignee || !!options?.isAdminOverride) &&
		(!!options?.isAdminOverride || canDecideByRole);

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
		(needsExecutiveAssignment || current?.status === "current") &&
		current?.kind !== "activated" &&
		current?.kind !== "submitted";
	const reassignCandidates = canReassignUi
		? await buildReassignCandidates(orgId, current?.kind)
		: [];

	return {
		contractId,
		contractName: String(contract.contractName || "Untitled Contract"),
		contractStatus,
		department: contract.department as string | undefined,
		businessUnit: contract.businessUnit as string | undefined,
		subDepartment: contract.subDepartment as string | undefined,
		currentStepIndex: state.currentStepIndex,
		steps,
		notifications: state.notifications || [],
		canDecide: frozen ? false : canDecide,
		canOverride: frozen ? false : !!options?.isAdminOverride,
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
	};
	state.notifications = [...(state.notifications || []), entry];
	return entry;
}

async function notifyUsers(
	userIds: string[],
	type: string,
	title: string,
	message: string,
	metadata?: Record<string, unknown>,
): Promise<void> {
	for (const userId of uniqueIds(userIds)) {
		try {
			await triggerNotification(type, {
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

	const current = state.steps[state.currentStepIndex];
	assertDecisionAllowed({
		current,
		viewerUserId,
		uploaderUserId: uploader,
		adminOverride,
	});

	if (
		(decision === "changes_requested" || decision === "rejected") &&
		!notes?.trim()
	) {
		throw new Error("Notes are required for deny or request changes");
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
		const nextIndex = state.currentStepIndex + 1;
		const nextStep = state.steps[nextIndex];
		nextStatus = resolveStatusAfterApprove(current.kind, nextStep?.kind);

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
				label: "Executive approved",
			});
			await notifyUsers(
				recipients,
				"info",
				`Contract activated: ${contract.contractName || "Contract"}`,
				`"${contract.contractName || "Contract"}" is now active.`,
				{ contractId, actionUrl: "/contracts", actionText: "View Contracts" },
			);
		} else if (nextStep) {
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
						`"${contract.contractName || "A contract"}" is waiting for an executive assignee (Super Admin or Organization Admin).`,
						{
							contractId,
							actionUrl: "/contracts/approvals",
							actionText: "Open Approvals",
						},
					);
				}
			} else {
				nextStep.status = "current";
				state.currentStepIndex = nextIndex;
				await appendNotification(state, {
					type: "stage_advanced",
					recipientUserIds: uniqueIds([
						...(nextStep.assigneeUserIds || []),
						uploader,
					]),
					stepId: nextStep.id,
					label: "Stage advanced",
				});
				await notifyUsers(
					nextStep.assigneeUserIds || [],
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

	return { state, contractStatus: nextStatus };
}

export async function reassignCurrentStep({
	contractId,
	viewerUserId,
	assigneeUserIds,
	adminOverride = false,
}: {
	contractId: string;
	viewerUserId: string;
	assigneeUserIds: string[];
	adminOverride?: boolean;
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

	const current = state.steps[state.currentStepIndex];
	assertReassignAllowed({ current, adminOverride });

	if (
		current?.kind === "executive_approval" ||
		current?.kind === "awaiting_executive"
	) {
		await assertAssigneesAreExecOrAdmin(assigneeUserIds, orgId);
	}

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
		label: "Step reassigned",
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
		recipientUserIds: uniqueIds([
			...(dept?.assigneeUserIds || []),
			uploader,
		]),
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
