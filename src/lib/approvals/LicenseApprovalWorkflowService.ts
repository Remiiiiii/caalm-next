/**
 * License approval workflow — mirrors contracts:
 * submitted → department review → (optional internal) → executive → activated.
 * Status becomes Active only after executive approval.
 */

import { ID, Query } from "node-appwrite";
import { PERMISSIONS } from "@/constants/permissions";
import { stampCurrentStepSla } from "@/lib/approvals/ApprovalSlaService";
import {
	applyActiveDelegations,
	applyReassignToCurrentStep,
	assertClaimAllowed,
	assertDecisionAllowed,
	assertReassignAllowed,
	assigneeHintForKind,
	buildDerivedSteps,
	buildReassignCandidates,
	lookupUserRow,
	needsExecutiveAssignmentFlag,
	parseWorkflowState,
	reconcileExecutiveAssigneesIfCurrent,
	resetWorkflowForResubmit,
	resolveParticipant,
	resolveStatusAfterApprove,
	resolveViewerCurrentStep,
	serializeWorkflowState,
	upgradeAwaitingExecutiveStep,
	userHasExecutiveRole,
} from "@/lib/approvals/ContractApprovalWorkflowService";
import { isAssigneeMatch, userIdentityKeys } from "@/lib/approvals/assigneeIdentity";
import { computeViewerCapabilities, emptyViewerFlags } from "@/lib/approvals/viewerCapabilities";
import { advanceWorkflowAfterApprove } from "@/lib/approvals/workflowAdvance";
import { notifyApprovalAssignees } from "@/lib/approvals/approvalNotifications";
import {
	buildStepsFromTemplate,
	resolveTemplateForSubmit,
} from "@/lib/approvals/workflowTemplates";
import type {
	ApprovalDecision,
	ApprovalWorkflowNotification,
	ApprovalWorkflowState,
	ApprovalWorkflowViewerPayload,
} from "@/lib/approvals/contractApprovalWorkflow.types";
import {
	assertWorkflowMutable,
	isTerminalDocumentStatus,
} from "@/lib/approvals/documentStatus";
import { resolveAttestationId } from "@/lib/approvals/resolveAttestationId";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { writeRowWithSchemaDriftRecovery } from "@/lib/appwrite/schemaDriftRecovery";
import { isDemoMode } from "@/lib/config/demo-mode";
import { hasPermission } from "@/lib/rbac/permissions";
import { logAuditEvent } from "@/lib/services/audit-logger";
import { getAllAdmins, getAllSuperAdmins, getAllExecutives } from "@/lib/utils/get-users-by-role";
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
	digitalSignatureRequired?: boolean | string;
	amount?: number;
	licenseType?: string;
	fileRef?: string;
	documentUrl?: string;
};

const WORKFLOW_VERSION = 1 as const;

function uniqueIds(ids: Array<string | undefined | null>): string[] {
	return [
		...new Set(ids.filter((id): id is string => !!id && id.trim().length > 0)),
	];
}

function optionalRowString(value: unknown): string | undefined {
	const text = String(value || "").trim();
	return text || undefined;
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
				? await hasPermission(userId, PERMISSIONS.LICENSES.APPROVE, orgId)
				: false;
			if (allowed) withPermission.push(userId);
		} catch {
			/* skip */
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
	const derivedInput = {
		uploaderUserId: uploader,
		departmentManagerIds: managerIds,
		internalApproverIds: [],
		executiveApproverIds: executiveIds,
		contractStatus: license.status as string | undefined,
	};
	const template = await resolveTemplateForSubmit(orgId, "license", {
		amount: Number(license.amount || 0),
		contractType: license.licenseType as string | undefined,
		department: (license.department || license.division) as string | undefined,
		riskTier: license.riskTier as string | undefined,
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
	return stampCurrentStepSla(state, orgId, "license");
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
	const entityId = String(metadata?.licenseId || "");
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
		entityType: "license",
		entityId,
		userIds,
		title,
		message,
		metadata,
	});
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

export async function getLicenseWorkflowForViewer(
	licenseId: string,
	viewerUserId: string,
	options?: { isAdminOverride?: boolean },
): Promise<ApprovalWorkflowViewerPayload> {
	const license = await getLicense(licenseId);
	const contractStatus = String(license.status || "pending-review");
	const frozen = isTerminalDocumentStatus(contractStatus);
	let state = parseWorkflowState(license.approvalWorkflowState as string);
	const uploader = String(license.licenseOwnerId || license.createdBy || "");
	const orgId = license.orgId as string | undefined;

	if (!state && !frozen) {
		state = await buildStateForLicense(license);
		await updateLicense(licenseId, {
			approvalWorkflowState: serializeWorkflowState(state),
			currentApprovalStage: state.steps[state.currentStepIndex]?.label || "",
		});
	}

	if (!frozen && state) {
		const ensured = await ensureLicenseExecutiveStep(state, orgId, uploader);
		const eligibleExecs = await resolveExecutiveApproverIds(orgId, uploader);
		const reconciled = await reconcileExecutiveAssigneesIfCurrent(
			ensured.state,
			eligibleExecs,
		);
		const beforeAssignees = [
			...(reconciled.state.steps[reconciled.state.currentStepIndex]
				?.assigneeUserIds || []),
		];
		state = await applyActiveDelegations(reconciled.state, orgId, "license");
		state = await stampCurrentStepSla(state, orgId, "license");
		const afterAssignees =
			state.steps[state.currentStepIndex]?.assigneeUserIds || [];
		const assigneesChanged =
			beforeAssignees.length !== afterAssignees.length ||
			afterAssignees.some((id) => !beforeAssignees.includes(id));
		if (ensured.upgraded || reconciled.changed || assigneesChanged) {
			await updateLicense(licenseId, {
				approvalWorkflowState: serializeWorkflowState(state),
				currentApprovalStage: state.steps[state.currentStepIndex]?.label || "",
			});
		}
	}

	if (!state) {
		return {
			contractId: licenseId,
			contractName: String(license.licenseName || "Untitled License"),
			contractStatus,
			department: (license.division || license.department) as
				| string
				| undefined,
			businessUnit: license.businessUnit as string | undefined,
			subDepartment: license.subDepartment as string | undefined,
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
				? await resolveAttestationId(orgId, "license", licenseId)
				: undefined,
			amount: Number(license.amount || 0) || undefined,
			contractType: optionalRowString(license.licenseType),
			documentNumber: optionalRowString(license.licenseNumber),
			counterpartyName: optionalRowString(license.vendor),
			renewalTerm: optionalRowString(license.renewalDate),
		};
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
	const viewerRow = await lookupUserRow(viewerUserId);
	const viewerIds = viewerRow ? userIdentityKeys(viewerRow) : [viewerUserId];
	const resolved = resolveViewerCurrentStep(state, viewerIds);
	const capabilityStep = resolved.step || current;
	const isAssignee = isAssigneeMatch(capabilityStep?.assigneeUserIds, viewerIds);
	const isExecStep =
		capabilityStep?.kind === "executive_approval" ||
		capabilityStep?.kind === "awaiting_executive";
	const canApprove = await hasPermission(
		viewerUserId,
		PERMISSIONS.LICENSES.APPROVE,
		orgId,
	);
	// Claim/decide on executive steps requires the Executive role + APPROVE.
	const canDecideByRole = isExecStep
		? canApprove && (await userHasExecutiveRole(viewerUserId, orgId))
		: await hasPermission(
				viewerUserId,
				PERMISSIONS.LICENSES.EDIT,
				orgId,
			).then((edit) => edit || canApprove);
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

	return {
		contractId: licenseId,
		contractName: String(license.licenseName || "Untitled License"),
		contractStatus,
		department: (license.division || license.department) as string | undefined,
		businessUnit: license.businessUnit as string | undefined,
		subDepartment: license.subDepartment as string | undefined,
		currentStepIndex:
			resolved.index >= 0 ? resolved.index : state.currentStepIndex,
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
			? await resolveAttestationId(orgId, "license", licenseId)
			: undefined,
		fileRef: license.fileRef as string | undefined,
		documentUrl: license.documentUrl as string | undefined,
		amount: Number(license.amount || 0) || undefined,
		contractType: optionalRowString(license.licenseType),
		documentNumber: optionalRowString(license.licenseNumber),
		counterpartyName: optionalRowString(license.vendor),
		renewalTerm: optionalRowString(license.renewalDate),
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
	assertWorkflowMutable(license.status as string | undefined);
	let state =
		parseWorkflowState(license.approvalWorkflowState as string) ||
		(await buildStateForLicense(license));
	const uploader = String(license.licenseOwnerId || license.createdBy || "");
	const orgId = license.orgId as string | undefined;

	const ensured = await ensureLicenseExecutiveStep(state, orgId, uploader);
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
		(decision === "changes_requested" ||
			decision === "rejected" ||
			adminOverride) &&
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

	let nextStatus = String(license.status || "pending-review");

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
			actorUserId: viewerUserId,
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
			license.digitalSignatureRequired === true ||
			license.digitalSignatureRequired === "true";
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
				license.assignedManagers as string[] | undefined,
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
					? `License ready for signature: ${license.licenseName || "License"}`
					: `License activated: ${license.licenseName || "License"}`,
				nextStatus === "pending-signature"
					? `"${license.licenseName || "License"}" is approved and waiting for e-signature.`
					: `"${license.licenseName || "License"}" is now active.`,
				{ licenseId, actionUrl: "/licenses", actionText: "View Licenses" },
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
						`"${license.licenseName || "A license"}" is waiting for an executive assignee (Executive role).`,
						{
							licenseId,
							actionUrl: "/licenses/approvals",
							actionText: "Open Approvals",
						},
					);
				}
			} else {
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

	state = await stampCurrentStepSla(state, orgId, "license");
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
	reason,
	adminOverride = false,
}: {
	licenseId: string;
	viewerUserId: string;
	assigneeUserIds: string[];
	reason: string;
	adminOverride?: boolean;
}): Promise<ApprovalWorkflowState> {
	const trimmedReason = reason.trim();
	if (trimmedReason.length < 10) {
		throw new Error("A reassignment reason of at least 10 characters is required");
	}

	const license = await getLicense(licenseId);
	assertWorkflowMutable(license.status as string | undefined);
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
		`Reassigned: ${license.licenseName || "License"}`,
		`You were assigned to "${nextCurrent?.label}" for "${license.licenseName || "a license"}".`,
		{
			licenseId,
			actionUrl: "/licenses/approvals",
			actionText: "Open Approvals",
		},
	);

	state = await stampCurrentStepSla(state, orgId, "license");
	await updateLicense(licenseId, {
		approvalWorkflowState: serializeWorkflowState(state),
		currentApprovalStage: nextCurrent?.label || "",
		...(current?.kind === "department_review"
			? { assignedManagers: uniqueIds(assigneeUserIds) }
			: {}),
	});

	return state;
}

export async function claimLicenseCurrentStep({
	licenseId,
	viewerUserId,
}: {
	licenseId: string;
	viewerUserId: string;
}): Promise<ApprovalWorkflowState> {
	const license = await getLicense(licenseId);
	assertWorkflowMutable(license.status as string | undefined);
	let state =
		parseWorkflowState(license.approvalWorkflowState as string) ||
		(await buildStateForLicense(license));
	const uploader = String(license.licenseOwnerId || license.createdBy || "");
	const orgId = license.orgId as string | undefined;
	const ensured = await ensureLicenseExecutiveStep(state, orgId, uploader);
	state = ensured.state;
	const viewerRow = await lookupUserRow(viewerUserId);
	const viewerIdentityIds = viewerRow
		? userIdentityKeys(viewerRow)
		: [viewerUserId];
	const claimable = state.steps
		.map((step, index) => ({ step, index }))
		.find(
			({ step }) =>
				step.status === "current" &&
				(step.kind === "department_review" ||
					step.kind === "internal_approval" ||
					step.kind === "executive_approval" ||
					step.kind === "awaiting_executive") &&
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
	state = await stampCurrentStepSla(state, orgId, "license");
	await updateLicense(licenseId, {
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
			module: "licenses",
			target_type: "license",
			target_id: licenseId,
			target_label: String(license.licenseName || "License"),
			summary: `claimed ${nextCurrent?.kind}`,
		});
	} catch {
		/* audit is best-effort */
	}
	return state;
}

export async function overrideCompletedLicenseWorkflow({
	licenseId,
	decision,
	notes,
}: {
	licenseId: string;
	decision: ApprovalDecision;
	notes: string;
}): Promise<{ state: ApprovalWorkflowState; contractStatus: string }> {
	if (!notes.trim()) {
		throw new Error("Notes are required for an admin override");
	}
	if (decision === "approved") {
		throw new Error("Completed workflows can only be rejected or sent back");
	}
	const license = await getLicense(licenseId);
	let state =
		parseWorkflowState(license.approvalWorkflowState as string) ||
		(await buildStateForLicense(license));
	const uploader = String(license.licenseOwnerId || license.createdBy || "");
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
	await updateLicense(licenseId, {
		approvalWorkflowState: serializeWorkflowState(state),
		status: nextStatus,
		currentApprovalStage: state.steps[state.currentStepIndex]?.label || "",
	});
	return { state, contractStatus: nextStatus };
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
	assertWorkflowMutable(license.status as string | undefined);
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
		recipientUserIds: uniqueIds([...(dept?.assigneeUserIds || []), uploader]),
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
	state = await stampCurrentStepSla(
		state,
		license.orgId as string | undefined,
		"license",
	);
	await updateLicense(licenseId, {
		approvalWorkflowState: serializeWorkflowState(state),
		status: nextStatus,
		currentApprovalStage: dept?.label || "Department review",
	});

	return { state, contractStatus: nextStatus };
}
