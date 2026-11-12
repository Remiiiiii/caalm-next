import { PERMISSIONS } from "@/constants/permissions";
import {
	decide,
	getWorkflowForViewer,
	overrideCompletedWorkflow,
	reassignCurrentStep,
} from "@/lib/approvals/ContractApprovalWorkflowService";
import {
	decideLicense,
	getLicenseWorkflowForViewer,
	overrideCompletedLicenseWorkflow,
	reassignLicenseCurrentStep,
} from "@/lib/approvals/LicenseApprovalWorkflowService";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	hasAll,
	searchContractsTable,
	searchLicensesTable,
} from "@/lib/assistant/tools/toolUtils";
import type { ToolContext, ToolDefinition } from "@/lib/assistant/tools/types";
import { logAuditEvent } from "@/lib/services/audit-logger";

type ResourceType = "contract" | "license";
const RESOURCE_TYPES: ResourceType[] = ["contract", "license"];
const DECISIONS = ["approved", "changes_requested", "rejected"] as const;
type Decision = (typeof DECISIONS)[number];

function actorName(ctx: ToolContext): string {
	return (
		(ctx.user as { fullName?: string }).fullName ||
		ctx.user.name ||
		ctx.user.email ||
		"User"
	);
}

function asError(message: string) {
	return { result: { error: message } };
}

function viewerUserIdOf(ctx: ToolContext): string {
	return (ctx.user as { accountId?: string }).accountId || ctx.user.$id;
}

function viewPermissionFor(resourceType: ResourceType) {
	return resourceType === "contract"
		? PERMISSIONS.CONTRACTS.VIEW
		: PERMISSIONS.LICENSES.VIEW;
}

function approvePermissionFor(resourceType: ResourceType) {
	return resourceType === "contract"
		? PERMISSIONS.CONTRACTS.APPROVE
		: PERMISSIONS.LICENSES.APPROVE;
}

function parseResourceType(value: unknown): ResourceType | null {
	const v = String(value ?? "").trim();
	return RESOURCE_TYPES.includes(v as ResourceType)
		? (v as ResourceType)
		: null;
}

/** Resolve exactly one org-scoped contract or license by id or fuzzy name search. */
async function resolveApprovalTarget(
	ctx: ToolContext,
	resourceType: ResourceType,
	args: { id?: unknown; query?: unknown },
): Promise<{ id?: string; label?: string; error?: string }> {
	const tableId =
		resourceType === "contract"
			? appwriteConfig.contractsCollectionId || "contracts"
			: appwriteConfig.licensesCollectionId || "licenses";
	const nameField =
		resourceType === "contract" ? "contractName" : "licenseName";
	const noun = resourceType === "contract" ? "contract" : "license";

	const id = String(args.id ?? "").trim();
	if (id) {
		const { tablesDB } = await createAdminClient();
		const row = (await tablesDB
			.getRow({ databaseId: appwriteConfig.databaseId!, tableId, rowId: id })
			.catch(() => null)) as Record<string, unknown> | null;
		if (!row || String(row.orgId || "") !== ctx.orgId) {
			return { error: `No ${noun} found with id "${id}".` };
		}
		return { id, label: String(row[nameField] || id) };
	}

	const query = String(args.query ?? "").trim();
	if (!query) return { error: `Which ${noun}? Give a name or id.` };

	const matches =
		resourceType === "contract"
			? await searchContractsTable(ctx, query)
			: await searchLicensesTable(ctx, query);
	if (matches.length === 0) return { error: `No ${noun}s match "${query}".` };
	if (matches.length > 1) {
		return {
			error: `Several ${noun}s match "${query}": ${matches
				.slice(0, 3)
				.map((m) => m.name)
				.join(", ")}. Be more specific or use the id.`,
		};
	}
	return { id: String(matches[0].id), label: String(matches[0].name || "") };
}

async function auditApproval(
	ctx: ToolContext,
	opts: {
		action: "approval_decided" | "approval_reassigned";
		eventKey: string;
		title: string;
		summary: string;
		resourceType: ResourceType;
		targetId: string;
		targetLabel: string;
		metadata?: Record<string, unknown>;
	},
) {
	await logAuditEvent({
		event_id: `assistant_approval_${opts.eventKey}_${opts.targetId}_${Date.now()}`,
		event_title: opts.title,
		action: opts.action,
		source: "caalm",
		user_id: ctx.user.$id,
		user_name: actorName(ctx),
		user_email: ctx.user.email || "",
		status: "success",
		orgId: ctx.orgId,
		module: opts.resourceType === "contract" ? "contracts" : "licenses",
		target_type: opts.resourceType,
		target_id: opts.targetId,
		target_label: opts.targetLabel,
		summary: opts.summary,
		metadata: { source: "ai_assistant", ...opts.metadata },
	}).catch(() => undefined);
}

export const APPROVAL_TOOLS: ToolDefinition[] = [
	{
		name: "get_approval",
		description:
			"Return one contract's or license's approval request with its current step. Requires view access to that resource type. Read-only; org-scoped.",
		requiredPermissions: [],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				resourceType: { type: "string", enum: RESOURCE_TYPES },
				id: { type: "string", description: "Contract or license document id" },
				query: {
					type: "string",
					description: "Contract or license name search",
				},
			},
			required: ["resourceType"],
		},
		handler: async (ctx, args) => {
			const resourceType = parseResourceType(args.resourceType);
			if (!resourceType) {
				return asError("resourceType must be 'contract' or 'license'.");
			}
			if (!hasAll(ctx, [viewPermissionFor(resourceType)])) {
				return asError(
					`You cannot view ${resourceType}s. Ask an admin for that permission.`,
				);
			}
			const found = await resolveApprovalTarget(ctx, resourceType, args);
			if (found.error || !found.id) {
				return asError(found.error ?? "Not found.");
			}
			const viewerUserId = viewerUserIdOf(ctx);
			const isAdminOverride = hasAll(ctx, [PERMISSIONS.APPROVALS.OVERRIDE]);
			try {
				const payload =
					resourceType === "contract"
						? await getWorkflowForViewer(found.id, viewerUserId, {
								isAdminOverride,
							})
						: await getLicenseWorkflowForViewer(found.id, viewerUserId, {
								isAdminOverride,
							});
				return { result: { resourceType, ...payload } };
			} catch (error) {
				return asError(
					error instanceof Error
						? error.message
						: "Failed to load this approval.",
				);
			}
		},
	},
	{
		name: "approve_request",
		description:
			"Approve, reject, or request changes on a contract's or license's approval request, with a comment. Requires the approve permission for that resource type, and you must be the assigned approver for the current step. Confirms before writing; audits.",
		requiredPermissions: [],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				resourceType: { type: "string", enum: RESOURCE_TYPES },
				id: { type: "string", description: "Contract or license document id" },
				query: {
					type: "string",
					description: "Contract or license name search",
				},
				decision: { type: "string", enum: DECISIONS as unknown as string[] },
				notes: {
					type: "string",
					description: "Required for rejected or changes_requested",
				},
			},
			required: ["resourceType", "decision"],
		},
		handler: async (ctx, args) => {
			const resourceType = parseResourceType(args.resourceType);
			if (!resourceType) {
				return asError("resourceType must be 'contract' or 'license'.");
			}
			if (!hasAll(ctx, [approvePermissionFor(resourceType)])) {
				return asError(
					`You cannot approve ${resourceType}s. Ask an admin for that permission.`,
				);
			}
			const decision = String(args.decision ?? "") as Decision;
			if (!DECISIONS.includes(decision)) {
				return asError(
					"decision must be one of: approved, changes_requested, rejected.",
				);
			}
			const notes = args.notes ? String(args.notes).trim() : undefined;
			if (decision !== "approved" && !notes) {
				return asError("Notes are required to reject or request changes.");
			}
			const found = await resolveApprovalTarget(ctx, resourceType, args);
			if (found.error || !found.id) {
				return asError(found.error ?? "Not found.");
			}
			const id = found.id;
			const label = found.label || id;
			const viewerUserId = viewerUserIdOf(ctx);

			try {
				const before =
					resourceType === "contract"
						? await getWorkflowForViewer(id, viewerUserId, {
								isAdminOverride: false,
							})
						: await getLicenseWorkflowForViewer(id, viewerUserId, {
								isAdminOverride: false,
							});
				if (!before.canDecideAsAssignee) {
					return asError(
						`You are not the assignee for the current approval step on this ${resourceType}.`,
					);
				}
				if (decision === "rejected" && !before.canReject) {
					return asError("Rejecting is not allowed at this approval step.");
				}

				const outcome =
					resourceType === "contract"
						? await decide({ contractId: id, viewerUserId, decision, notes })
						: await decideLicense({
								licenseId: id,
								viewerUserId,
								decision,
								notes,
							});

				await auditApproval(ctx, {
					action: "approval_decided",
					eventKey: "approve_request",
					title: `Assistant recorded approval decision: ${label}`,
					summary: `${actorName(ctx)} recorded "${decision}" on ${resourceType} "${label}"`,
					resourceType,
					targetId: id,
					targetLabel: label,
					metadata: { decision, notes },
				});
				return {
					result: {
						resourceType,
						id,
						decision,
						status: outcome.contractStatus,
					},
				};
			} catch (error) {
				return asError(
					error instanceof Error
						? error.message
						: "Failed to record the approval decision.",
				);
			}
		},
	},
	{
		name: "reassign_approval",
		description:
			"Reassign the current approval step on a contract or license to different approvers. Requires approvals.override (only Super Admin / Organization Admin can reassign). Confirms before writing; audits.",
		requiredPermissions: [PERMISSIONS.APPROVALS.OVERRIDE],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				resourceType: { type: "string", enum: RESOURCE_TYPES },
				id: { type: "string", description: "Contract or license document id" },
				query: {
					type: "string",
					description: "Contract or license name search",
				},
				assigneeUserIds: {
					type: "array",
					items: { type: "string" },
					description: "User ids to assign to the current step",
				},
				reason: {
					type: "string",
					description: "At least 10 characters",
				},
			},
			required: ["resourceType", "assigneeUserIds", "reason"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.APPROVALS.OVERRIDE])) {
				return asError(
					"Only a Super Admin or Organization Admin can reassign an approval step.",
				);
			}
			const resourceType = parseResourceType(args.resourceType);
			if (!resourceType) {
				return asError("resourceType must be 'contract' or 'license'.");
			}
			const assigneeUserIds = Array.isArray(args.assigneeUserIds)
				? args.assigneeUserIds.filter((v): v is string => typeof v === "string")
				: [];
			if (assigneeUserIds.length === 0) {
				return asError("Give at least one user id to assign.");
			}
			const reason = String(args.reason ?? "").trim();
			if (reason.length < 10) {
				return asError("Give a reassignment reason of at least 10 characters.");
			}
			const found = await resolveApprovalTarget(ctx, resourceType, args);
			if (found.error || !found.id) {
				return asError(found.error ?? "Not found.");
			}
			const id = found.id;
			const label = found.label || id;
			const viewerUserId = viewerUserIdOf(ctx);

			try {
				if (resourceType === "contract") {
					await reassignCurrentStep({
						contractId: id,
						viewerUserId,
						assigneeUserIds,
						reason,
						adminOverride: true,
					});
				} else {
					await reassignLicenseCurrentStep({
						licenseId: id,
						viewerUserId,
						assigneeUserIds,
						reason,
						adminOverride: true,
					});
				}

				await auditApproval(ctx, {
					action: "approval_reassigned",
					eventKey: "reassign",
					title: `Assistant reassigned approval step: ${label}`,
					summary: `${actorName(ctx)} reassigned the current approval step on ${resourceType} "${label}" to ${assigneeUserIds.join(", ")}`,
					resourceType,
					targetId: id,
					targetLabel: label,
					metadata: { assigneeUserIds, reason },
				});
				return {
					result: { resourceType, id, assigneeUserIds, reassigned: true },
				};
			} catch (error) {
				return asError(
					error instanceof Error
						? error.message
						: "Failed to reassign this approval step.",
				);
			}
		},
	},
	{
		name: "override_approval",
		description:
			"Admin override of a contract's or license's approval decision, on the active step or after completion. Requires approvals.override only — no role shortcut. Always confirms; always audits.",
		requiredPermissions: [PERMISSIONS.APPROVALS.OVERRIDE],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				resourceType: { type: "string", enum: RESOURCE_TYPES },
				id: { type: "string", description: "Contract or license document id" },
				query: {
					type: "string",
					description: "Contract or license name search",
				},
				decision: { type: "string", enum: DECISIONS as unknown as string[] },
				notes: {
					type: "string",
					description: "Always required for an override",
				},
			},
			required: ["resourceType", "decision", "notes"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.APPROVALS.OVERRIDE])) {
				return asError(
					"You cannot override approvals. This requires the approvals.override permission.",
				);
			}
			const resourceType = parseResourceType(args.resourceType);
			if (!resourceType) {
				return asError("resourceType must be 'contract' or 'license'.");
			}
			const decision = String(args.decision ?? "") as Decision;
			if (!DECISIONS.includes(decision)) {
				return asError(
					"decision must be one of: approved, changes_requested, rejected.",
				);
			}
			const notes = String(args.notes ?? "").trim();
			if (!notes) {
				return asError("Notes are required for an admin override.");
			}
			const found = await resolveApprovalTarget(ctx, resourceType, args);
			if (found.error || !found.id) {
				return asError(found.error ?? "Not found.");
			}
			const id = found.id;
			const label = found.label || id;
			const viewerUserId = viewerUserIdOf(ctx);

			try {
				const before =
					resourceType === "contract"
						? await getWorkflowForViewer(id, viewerUserId, {
								isAdminOverride: true,
							})
						: await getLicenseWorkflowForViewer(id, viewerUserId, {
								isAdminOverride: true,
							});

				let outcome: { contractStatus: string };
				if (before.canAdminOverrideCompleted) {
					if (decision === "approved") {
						return asError(
							"Completed workflows can only be rejected or sent back, not approved.",
						);
					}
					outcome =
						resourceType === "contract"
							? await overrideCompletedWorkflow({
									contractId: id,
									viewerUserId,
									decision,
									notes,
								})
							: await overrideCompletedLicenseWorkflow({
									licenseId: id,
									decision,
									notes,
								});
				} else if (before.canAdminOverrideActiveStep) {
					outcome =
						resourceType === "contract"
							? await decide({
									contractId: id,
									viewerUserId,
									decision,
									notes,
									adminOverride: true,
								})
							: await decideLicense({
									licenseId: id,
									viewerUserId,
									decision,
									notes,
									adminOverride: true,
								});
				} else {
					return asError(
						`There is no active or completed approval step to override on this ${resourceType}.`,
					);
				}

				await auditApproval(ctx, {
					action: "approval_decided",
					eventKey: "override",
					title: `Assistant overrode approval decision: ${label}`,
					summary: `${actorName(ctx)} admin-overrode ${resourceType} "${label}" with decision "${decision}"`,
					resourceType,
					targetId: id,
					targetLabel: label,
					metadata: { decision, notes },
				});
				return {
					result: {
						resourceType,
						id,
						decision,
						status: outcome.contractStatus,
					},
				};
			} catch (error) {
				return asError(
					error instanceof Error
						? error.message
						: "Failed to override this approval.",
				);
			}
		},
	},
];
