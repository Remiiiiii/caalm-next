/**
 * License approval workflow — mirrors contracts:
 * submitted → department review → (optional internal) → executive → activated.
 * Status becomes Active only after executive approval.
 */

import { ID, Query } from "node-appwrite";
import { PERMISSIONS } from "@/constants/permissions";
import { getUserById } from "@/lib/actions/user.actions";
import {
	assertDecisionAllowed,
	buildDerivedSteps,
	parseWorkflowState,
	resolveStatusAfterApprove,
	serializeWorkflowState,
} from "@/lib/approvals/ContractApprovalWorkflowService";
import type {
	ApprovalDecision,
	ApprovalParticipant,
	ApprovalWorkflowNotification,
	ApprovalWorkflowState,
	ApprovalWorkflowViewerPayload,
} from "@/lib/approvals/contractApprovalWorkflow.types";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { writeRowWithSchemaDriftRecovery } from "@/lib/appwrite/schemaDriftRecovery";
import { isDemoMode } from "@/lib/config/demo-mode";
import { hasPermission } from "@/lib/rbac/permissions";
import { getProfilePictureUrl } from "@/lib/utils";
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

function resolveParticipantImageUrl(user: {
	avatar?: string | null;
	profileImageId?: string | null;
}): string | null {
	const avatarValue = user.avatar?.trim();
	if (avatarValue && /^https?:\/\//i.test(avatarValue)) return avatarValue;
	if (avatarValue?.startsWith("/")) return avatarValue;
	const imageId =
		avatarValue && !/^https?:\/\//i.test(avatarValue)
			? avatarValue
			: user.profileImageId || null;
	return getProfilePictureUrl(imageId);
}

async function resolveParticipant(
	userId: string,
	viewerUserId: string,
): Promise<ApprovalParticipant> {
	try {
		const user = (await getUserById(userId)) as Record<string, any> | null;
		if (!user) {
			return {
				userId,
				fullName: "Unknown user",
				isYou: userId === viewerUserId,
			};
		}
		return {
			userId: String(user.$id || userId),
			fullName: user.fullName || user.email || "User",
			email: user.email,
			department: user.department || user.division,
			subDepartment: user.subDepartment,
			division: user.division,
			profileImageUrl: resolveParticipantImageUrl(user),
			isYou: userId === viewerUserId || user.$id === viewerUserId,
		};
	} catch {
		return {
			userId,
			fullName: "Unknown user",
			isYou: userId === viewerUserId,
		};
	}
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

export async function getLicenseWorkflowForViewer(
	licenseId: string,
	viewerUserId: string,
	options?: { isAdminOverride?: boolean },
): Promise<ApprovalWorkflowViewerPayload> {
	const license = await getLicense(licenseId);
	let state = parseWorkflowState(license.approvalWorkflowState as string);

	if (!state) {
		state = await buildStateForLicense(license);
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
		license.orgId as string | undefined,
	);

	const canDecide =
		current?.status === "current" &&
		current.kind !== "activated" &&
		current.kind !== "awaiting_executive" &&
		(isAssignee || !!options?.isAdminOverride) &&
		(!!options?.isAdminOverride || canDecideByRole);

	return {
		contractId: licenseId,
		contractName: String(license.licenseName || "Untitled License"),
		contractStatus: String(license.status || "pending-review"),
		department: (license.division || license.department) as string | undefined,
		businessUnit: license.businessUnit as string | undefined,
		subDepartment: license.subDepartment as string | undefined,
		currentStepIndex: state.currentStepIndex,
		steps,
		notifications: state.notifications || [],
		canDecide,
		canOverride: !!options?.isAdminOverride,
		viewerUserId,
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
	const state =
		parseWorkflowState(license.approvalWorkflowState as string) ||
		(await buildStateForLicense(license));

	const current = state.steps[state.currentStepIndex];
	const uploader = String(license.licenseOwnerId || license.createdBy || "");
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
				nextStep.status = "current";
				state.currentStepIndex = nextIndex;
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
