/**
 * License approval workflow — mirrors contracts:
 * submitted → department review → (optional internal) → executive → activated.
 * Status becomes Active only after executive approval.
 */

import { ID, Query } from "node-appwrite";
import { PERMISSIONS } from "@/constants/permissions";
import {
	applyReassignToCurrentStep,
	assertDecisionAllowed,
	assertReassignAllowed,
	assigneeHintForKind,
	buildDerivedSteps,
	buildReassignCandidates,
	needsExecutiveAssignmentFlag,
	parseWorkflowState,
	resetWorkflowForResubmit,
	resolveParticipant,
	resolveStatusAfterApprove,
	serializeWorkflowState,
	upgradeAwaitingExecutiveStep,
} from "@/lib/approvals/ContractApprovalWorkflowService";
import type {
	ApprovalDecision,
	ApprovalWorkflowNotification,
	ApprovalWorkflowState,
	ApprovalWorkflowViewerPayload,
} from "@/lib/approvals/contractApprovalWorkflow.types";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { writeRowWithSchemaDriftRecovery } from "@/lib/appwrite/schemaDriftRecovery";
import { isDemoMode } from "@/lib/config/demo-mode";
import { getUserRoles, hasPermission } from "@/lib/rbac/permissions";
import { getAllAdmins, getAllExecutives } from "@/lib/utils/get-users-by-role";
import { triggerNotification } from "@/lib/utils/notificationTriggers";

type LicenseRow = Record<string, unknown> & {
	$id: string;
	licenseName?: string;
	status?: string;
	licenseOwnerId?: string;
	createdBy?: string;
	orgId?: string;
	division?: string;
	department?: string;
	subDepartment?: string;
	businessUnit?: string;
	assignedManagers?: string[];
	approvalWorkflowState?: string;
	currentApprovalStage?: string;
};

const WORKFLOW_VERSION = 1 as const;

function uniqueIds(ids: Array<string | undefined | null>): string[] {
	return [
		...new Set(ids.filter((id): id is string => !!id && id.trim().length > 0)),
	];
}

function flattenRow(raw: any): LicenseRow {
	if (!raw || typeof raw !== "object") return raw;
	if (raw.data && typeof raw.data === "object") {
		return { ...raw, ...raw.data } as LicenseRow;
	}
	return raw as LicenseRow;
}

async function getLicense(licenseId: string): Promise<LicenseRow> {
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.getRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.licensesCollectionId!,
		rowId: licenseId,
	});
	return flattenRow(row);
}

async function updateLicense(
	licenseId: string,
	data: Record<string, unknown>,
): Promise<void> {
	const { tablesDB } = await createAdminClient();
	await writeRowWithSchemaDriftRecovery({
		tablesDB,
		mode: "update",
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.licensesCollectionId!,
		rowId: licenseId,
		data,
	});
}

async function resolveExecutiveApproverIds(
	orgId: string | undefined,
	uploaderUserId: string,
): Promise<string[]> {
	const [executives, admins] = await Promise.all([
		getAllExecutives(orgId),
		getAllAdmins(orgId),
	]);
	const candidates = [...executives, ...admins];
	const ids = uniqueIds(candidates.map((u: { $id?: string }) => u.$id));
	const withPermission: string[] = [];

	for (const userId of ids) {
		if (userId === uploaderUserId) continue;
		try {
			const allowed = orgId
				? await hasPermission(userId, PERMISSIONS.LICENSES.EDIT, orgId)
				: false;
			if (allowed) withPermission.push(userId);
		} catch {
			/* skip */
		}
	}

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
			/* skip */
		}
	}
	return uniqueIds(resolved);
}

async function buildStateForLicense(
	license: LicenseRow,
	options?: {
		departmentManagerIds?: string[];
		preserveNotifications?: ApprovalWorkflowNotification[];
	},
): Promise<ApprovalWorkflowState> {
	const uploader = String(license.licenseOwnerId || license.createdBy || "");
	const orgId = license.orgId as string | undefined;
	const managerIds =
		options?.departmentManagerIds ||
		(await resolveManagerIdsFromNamesOrIds(
			license.assignedManagers as string[] | undefined,
		));
	const executiveIds = await resolveExecutiveApproverIds(orgId, uploader);

	const steps = buildDerivedSteps({
		uploaderUserId: uploader,
		departmentManagerIds: managerIds,
		internalApproverIds: [],
		executiveApproverIds: executiveIds,
		contractStatus: license.status as string | undefined,
	});

	const currentStepIndex = Math.max(
		0,
		steps.findIndex((s) => s.status === "current"),
	);

	return {
		version: WORKFLOW_VERSION,
		currentStepIndex: currentStepIndex >= 0 ? currentStepIndex : 0,
		derivedAt: new Date().toISOString(),
		steps,
		notifications: options?.preserveNotifications || [],
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

async function ensureLicenseExecutiveStep(
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
		[...executives, ...admins].map(
			(u: { $id?: string; accountId?: string }) => u.accountId || u.$id,
		),
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

export async function getLicenseWorkflowForViewer(
	licenseId: string,
	viewerUserId: string,
	options?: { isAdminOverride?: boolean },
): Promise<ApprovalWorkflowViewerPayload> {
	const license = await getLicense(licenseId);
	let state = parseWorkflowState(license.approvalWorkflowState as string);
	const uploader = String(license.licenseOwnerId || license.createdBy || "");
	const orgId = license.orgId as string | undefined;

	if (!state) {
		state = await buildStateForLicense(license);
		await updateLicense(licenseId, {
			approvalWorkflowState: serializeWorkflowState(state),
			currentApprovalStage: state.steps[state.currentStepIndex]?.label || "",
		});
	}

	const ensured = await ensureLicenseExecutiveStep(state, orgId, uploader);
	state = ensured.state;
	if (ensured.upgraded) {
		await updateLicense(licenseId, {
			approvalWorkflowState: serializeWorkflowState(state),
			currentApprovalStage: state.steps[state.currentStepIndex]?.label || "",
		});
	}

	const steps = await Promise.all(
		state.steps.map(async (step) => {
			const participants = await Promise.all(
				step.assigneeUserIds.map((id) => resolveParticipant(id, viewerUserId)),
			);
			return {
				...step,
				assigneeHint: assigneeHintForKind(step.kind),
				participants: participants.map((p) => ({
					...p,
					fullName:
						step.kind === "submitted" && p.userId === viewerUserId
							? "You"
							: p.fullName,
				})),
				notifications: (state!.notifications || []).filter(
					(n) => n.stepId === step.id,
				),
			};
		}),
	);

	const current = state.steps[state.currentStepIndex];
	const isAssignee = !!current?.assigneeUserIds.includes(viewerUserId);
	const canDecideByRole = await hasPermission(
		viewerUserId,
		PERMISSIONS.LICENSES.EDIT,
		orgId,
	);

	const canDecide =
		current?.status === "current" &&
		current.kind !== "activated" &&
		current.kind !== "awaiting_executive" &&
		(isAssignee || !!options?.isAdminOverride) &&
		(!!options?.isAdminOverride || canDecideByRole);

	const needsExecutiveAssignment = needsExecutiveAssignmentFlag(state);
	const contractStatus = String(license.status || "pending-review");
	const canResubmit =
		contractStatus === "action-required" &&
		(viewerUserId === uploader || !!options?.isAdminOverride);
	const canAssignExecutive =
		needsExecutiveAssignment && !!options?.isAdminOverride;
	const canReassignUi =
		!!options?.isAdminOverride &&
		(needsExecutiveAssignment || current?.status === "current") &&
		current?.kind !== "activated" &&
		current?.kind !== "submitted";
	const reassignCandidates = canReassignUi
		? await buildReassignCandidates(orgId, current?.kind)
		: [];

	return {
		contractId: licenseId,
		contractName: String(license.licenseName || "Untitled License"),
		contractStatus,
		department: (license.division || license.department) as string | undefined,
		businessUnit: license.businessUnit as string | undefined,
		subDepartment: license.subDepartment as string | undefined,
		currentStepIndex: state.currentStepIndex,
		steps,
		notifications: state.notifications || [],
		canDecide,
		canOverride: !!options?.isAdminOverride,
		needsExecutiveAssignment,
		canAssignExecutive,
		canResubmit,
		viewerUserId,
		uploaderUserId: uploader || undefined,
		reassignCandidates,
	};
}

export async function initializeLicenseOnUpload({
	licenseId,
	departmentManagerIds,
}: {
	licenseId: string;
	departmentManagerIds?: string[];
}): Promise<ApprovalWorkflowState> {
	const license = await getLicense(licenseId);
	const state = await buildStateForLicense(license, { departmentManagerIds });

	const current = state.steps[state.currentStepIndex];
	const uploader = String(license.licenseOwnerId || license.createdBy || "");
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
			`License pending review: ${license.licenseName || "License"}`,
			`"${license.licenseName || "A license"}" was submitted and needs your review.`,
			{
				licenseId,
				actionUrl: "/licenses/approvals",
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

	await updateLicense(licenseId, {
		approvalWorkflowState: serializeWorkflowState(state),
		currentApprovalStage: current?.label || "Department review",
		status:
			license.status === "action-required"
				? "action-required"
				: "pending-review",
	});

	return state;
}

export async function decideLicense({
	licenseId,
	viewerUserId,
	decision,
	notes,
	adminOverride = false,
}: {
	licenseId: string;
	viewerUserId: string;
	decision: ApprovalDecision;
	notes?: string;
	adminOverride?: boolean;
}): Promise<{ state: ApprovalWorkflowState; contractStatus: string }> {
	const license = await getLicense(licenseId);
	let state =
		parseWorkflowState(license.approvalWorkflowState as string) ||
		(await buildStateForLicense(license));
	const uploader = String(license.licenseOwnerId || license.createdBy || "");
	const orgId = license.orgId as string | undefined;

	const ensured = await ensureLicenseExecutiveStep(state, orgId, uploader);
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

	let nextStatus = String(license.status || "pending-review");

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
				`License rejected: ${license.licenseName || "License"}`,
				notes || "Your license was rejected during approval.",
				{ licenseId, actionUrl: "/licenses", actionText: "View Licenses" },
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
				`Changes requested: ${license.licenseName || "License"}`,
				notes || "Please update the license and resubmit.",
				{ licenseId, actionUrl: "/licenses", actionText: "View Licenses" },
			);
		}
	} else {
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
				license.assignedManagers as string[] | undefined,
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
				`License activated: ${license.licenseName || "License"}`,
				`"${license.licenseName || "License"}" is now active.`,
				{ licenseId, actionUrl: "/licenses", actionText: "View Licenses" },
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
						`Approval needed: ${license.licenseName || "License"}`,
						`"${license.licenseName || "A license"}" is ready for ${execStep?.label}.`,
						{
							licenseId,
							actionUrl: "/licenses/approvals",
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
						`Executive needed: ${license.licenseName || "License"}`,
						`"${license.licenseName || "A license"}" is waiting for an executive assignee (Super Admin or Organization Admin).`,
						{
							licenseId,
							actionUrl: "/licenses/approvals",
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
					`Approval needed: ${license.licenseName || "License"}`,
					`"${license.licenseName || "A license"}" is ready for ${nextStep.label}.`,
					{
						licenseId,
						actionUrl: "/licenses/approvals",
						actionText: "Open Approvals",
					},
				);
			}
		}
	}

	await updateLicense(licenseId, {
		approvalWorkflowState: serializeWorkflowState(state),
		status: nextStatus,
		currentApprovalStage: state.steps[state.currentStepIndex]?.label || "",
	});

	return { state, contractStatus: nextStatus };
}

export async function reassignLicenseCurrentStep({
	licenseId,
	viewerUserId,
	assigneeUserIds,
	adminOverride = false,
}: {
	licenseId: string;
	viewerUserId: string;
	assigneeUserIds: string[];
	adminOverride?: boolean;
}): Promise<ApprovalWorkflowState> {
	const license = await getLicense(licenseId);
	let state =
		parseWorkflowState(license.approvalWorkflowState as string) ||
		(await buildStateForLicense(license));
	const uploader = String(license.licenseOwnerId || license.createdBy || "");
	const orgId = license.orgId as string | undefined;

	const ensured = await ensureLicenseExecutiveStep(state, orgId, uploader);
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
		`Reassigned: ${license.licenseName || "License"}`,
		`You were assigned to "${nextCurrent?.label}" for "${license.licenseName || "a license"}".`,
		{
			licenseId,
			actionUrl: "/licenses/approvals",
			actionText: "Open Approvals",
		},
	);

	await updateLicense(licenseId, {
		approvalWorkflowState: serializeWorkflowState(state),
		currentApprovalStage: nextCurrent?.label || "",
		...(current?.kind === "department_review"
			? { assignedManagers: uniqueIds(assigneeUserIds) }
			: {}),
	});

	return state;
}

export async function resubmitLicenseAfterChanges({
	licenseId,
	viewerUserId,
	adminOverride = false,
}: {
	licenseId: string;
	viewerUserId: string;
	adminOverride?: boolean;
}): Promise<{ state: ApprovalWorkflowState; contractStatus: string }> {
	const license = await getLicense(licenseId);
	const status = String(license.status || "");
	if (status !== "action-required") {
		throw new Error("Only items with requested changes can be resubmitted");
	}
	const uploader = String(license.licenseOwnerId || license.createdBy || "");
	if (viewerUserId !== uploader && !adminOverride) {
		throw new Error("Only the uploader can resubmit after changes");
	}

	let state =
		parseWorkflowState(license.approvalWorkflowState as string) ||
		(await buildStateForLicense(license));
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
		`Resubmitted: ${license.licenseName || "License"}`,
		`"${license.licenseName || "A license"}" was resubmitted and needs department review.`,
		{
			licenseId,
			actionUrl: "/licenses/approvals",
			actionText: "Open Approvals",
		},
	);

	const nextStatus = "pending-review";
	await updateLicense(licenseId, {
		approvalWorkflowState: serializeWorkflowState(state),
		status: nextStatus,
		currentApprovalStage: dept?.label || "Department review",
	});

	return { state, contractStatus: nextStatus };
}
