import { PERMISSIONS } from "@/constants/permissions";
import { isCapClosableStatus } from "@/lib/assistant/cap-close-assist";
import { hasAll } from "@/lib/assistant/tools/toolUtils";
import type { ToolDefinition } from "@/lib/assistant/tools/types";
import { logAuditUploadEvent } from "@/lib/audit-upload/audit-log";
import {
	draftTasksFromFinding,
	inferRootCause,
	slaDueAt,
} from "@/lib/audit-upload/caps";
import { confirmAuditFinding } from "@/lib/audit-upload/confirm-finding";
import {
	createCap,
	getAuditDocument,
	getCap,
	getFinding,
	listAuditDocuments,
	listCaps,
	listFindings,
	updateCap,
	updateFinding,
} from "@/lib/audit-upload/store";
import type { AuditFindingStatus } from "@/lib/audit-upload/types";
import { getAuditLogs } from "@/lib/services/audit-logger";

const FINDING_STANCES = ["disputed", "rectified", "accepted_risk"] as const;

export const AUDIT_TOOLS: ToolDefinition[] = [
	{
		name: "list_audit_logs",
		description:
			"List recent audit/activity events for the organization (who changed what). Use when the user asks about recent activity, changes, or audit history. Requires audit view permission.",
		requiredPermissions: [PERMISSIONS.AUDIT.VIEW],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				limit: { type: "number", description: "Max entries. Default 10." },
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.AUDIT.VIEW])) {
				return {
					result: {
						error:
							"You don't have permission to view audit logs. Ask an admin for audit access.",
					},
				};
			}
			const limit = Math.min(Number(args.limit) || 10, 20);
			const logs = await getAuditLogs({ orgId: ctx.orgId, limit });
			return {
				result: {
					logs: logs.map((l) => ({
						title: l.event_title,
						action: l.action,
						user: l.user_name,
						status: l.status,
						when: l.created_at,
						module: l.module,
						target_type: l.target_type,
					})),
					total: logs.length,
					auditHref: "/audits",
				},
			};
		},
	},
	{
		name: "confirm_finding",
		description:
			"Confirm a draft audit finding (may draft an Open corrective action). Requires audit.manage_findings.",
		requiredPermissions: [PERMISSIONS.AUDIT.MANAGE_FINDINGS],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				findingId: { type: "string" },
				documentId: { type: "string" },
				findingCode: { type: "string" },
				title: { type: "string" },
			},
			required: ["findingId", "documentId"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.AUDIT.MANAGE_FINDINGS])) {
				return {
					result: {
						error:
							"You cannot confirm findings. Ask an admin for that permission.",
					},
				};
			}
			const findingId = String(args.findingId ?? "");
			const result = await confirmAuditFinding({
				orgId: ctx.orgId,
				user: ctx.user,
				findingId,
			});
			if (!result.ok) {
				return { result: { error: result.error } };
			}
			const href = `/audits/upload/${result.finding.documentId}#finding-${result.finding.$id}`;
			return {
				result: {
					findingId: result.finding.$id,
					documentId: result.finding.documentId,
					findingCode: result.finding.findingCode,
					title: result.finding.title,
					status: result.finding.status,
					capId: result.cap?.$id ?? null,
					capStatus: result.cap?.status ?? null,
					draftedCap: result.draftedCap,
					continueRemediation: true,
					href,
				},
			};
		},
	},
	{
		name: "apply_audit_remediation",
		description:
			"Start an open corrective action (status Open → In progress). Never closes a CAP. Requires audit.manage_caps.",
		requiredPermissions: [PERMISSIONS.AUDIT.MANAGE_CAPS],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				capId: { type: "string" },
				findingId: { type: "string" },
				documentId: { type: "string" },
				nextStatus: { type: "string" },
			},
			required: ["capId", "findingId", "documentId"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.AUDIT.MANAGE_CAPS])) {
				return {
					result: {
						error:
							"You cannot change corrective actions. Ask an admin for that permission.",
					},
				};
			}
			const capId = String(args.capId ?? "");
			const cap = await getCap(ctx.orgId, capId);
			if (!cap) {
				return { result: { error: "Corrective action not found." } };
			}
			if (cap.findingId !== String(args.findingId ?? cap.findingId)) {
				return { result: { error: "Finding does not match this action." } };
			}
			if (cap.status !== "open") {
				return {
					result: {
						error:
							"This corrective action is not open, so it cannot be started from Ask CAALM.",
					},
				};
			}
			const updated = await updateCap(capId, { status: "in_progress" });
			await logAuditUploadEvent({
				user: ctx.user,
				orgId: ctx.orgId,
				action: "update",
				summary: `Started corrective action ${cap.title} from Ask CAALM`,
				targetId: capId,
				targetLabel: cap.title,
				targetType: "audit_cap",
			});
			return {
				result: {
					capId: updated.$id,
					title: updated.title,
					status: updated.status,
					previousStatus: "open",
					href: `/audits/upload/${cap.documentId}#finding-cap-${cap.findingId}`,
				},
			};
		},
	},
	{
		name: "prepare_close_corrective_action",
		description:
			"Open the Mark closed dialog for a corrective action with a prefilled verification note. Does not close the CAP — the user must review and save in the dialog. Requires audit.manage_caps.",
		requiredPermissions: [PERMISSIONS.AUDIT.MANAGE_CAPS],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				capId: { type: "string" },
				findingId: { type: "string" },
				documentId: { type: "string" },
				verificationNote: {
					type: "string",
					description:
						"Verification / closing note text to prefill in the dialog.",
				},
			},
			required: ["capId", "findingId", "documentId", "verificationNote"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.AUDIT.MANAGE_CAPS])) {
				return {
					result: {
						error:
							"You cannot close corrective actions. Ask an admin for that permission.",
					},
				};
			}
			const capId = String(args.capId ?? "").trim();
			const findingId = String(args.findingId ?? "").trim();
			const documentId = String(args.documentId ?? "").trim();
			const verificationNote = String(args.verificationNote ?? "").trim();
			if (!findingId || !documentId) {
				return {
					result: { error: "Missing corrective action or finding id." },
				};
			}
			if (!verificationNote) {
				return {
					result: {
						error:
							"A verification note is required before opening Mark closed.",
					},
				};
			}
			// Prefer the given capId; fall back to resolving by finding so a stale/missing
			// id (model guessed, or follow-up turn) does not dead-end at "not found".
			let cap = capId ? await getCap(ctx.orgId, capId) : null;
			if (!cap || cap.findingId !== findingId) {
				const caps = await listCaps({
					orgId: ctx.orgId,
					documentId,
					limit: 50,
				});
				cap = caps.find((row) => row.findingId === findingId) ?? null;
			}
			if (!cap) {
				return {
					result: {
						error:
							"This finding does not have a corrective action yet. Confirm the finding and start the action first.",
					},
				};
			}
			if (!isCapClosableStatus(cap.status)) {
				return {
					result: {
						error:
							"This corrective action is not in a state where Mark closed applies yet.",
					},
				};
			}
			if (!cap.canClose) {
				return {
					result: {
						error:
							cap.closeBlocker ??
							"Finish required tasks and evidence before Mark closed.",
					},
				};
			}
			// Use the resolved cap's ids so a missing/stale input capId still opens the right dialog.
			return {
				result: {
					ok: true,
					capId: cap.$id,
					findingId,
					documentId: cap.documentId,
					verificationNote,
				},
				clientAction: {
					type: "open_close_cap",
					capId: cap.$id,
					findingId,
					documentId: cap.documentId,
					verificationNote,
				},
			};
		},
	},
	{
		name: "list_audit_documents",
		description:
			"List uploaded audit documents, or return one document's detail. Requires audit.documents_view. Read-only; org-scoped.",
		requiredPermissions: [PERMISSIONS.AUDIT.DOCUMENTS_VIEW],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				documentId: { type: "string", description: "Audit document id" },
				scope: { type: "string", enum: ["active", "removed"] },
				limit: { type: "number", description: "Max rows. Default 50." },
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.AUDIT.DOCUMENTS_VIEW])) {
				return {
					result: {
						error:
							"You cannot view audit documents. Ask an admin for the audit.documents_view permission.",
					},
				};
			}
			const documentId = String(args.documentId ?? "").trim();
			if (documentId) {
				const document = await getAuditDocument(ctx.orgId, documentId);
				if (!document) {
					return {
						result: {
							error: `No audit document found with id "${documentId}".`,
						},
					};
				}
				return { result: { document } };
			}
			const documents = await listAuditDocuments(ctx.orgId, {
				limit: Math.min(Number(args.limit) || 50, 100),
				scope: args.scope === "removed" ? "removed" : "active",
			});
			return { result: { documents, count: documents.length } };
		},
	},
	{
		name: "list_findings",
		description:
			"List audit findings, or return one finding's detail. Requires audit.documents_view. Read-only; org-scoped.",
		requiredPermissions: [PERMISSIONS.AUDIT.DOCUMENTS_VIEW],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				findingId: { type: "string", description: "Audit finding id" },
				documentId: { type: "string" },
				status: {
					type: "string",
					enum: [
						"draft",
						"confirmed",
						"disputed",
						"rectified",
						"closed",
						"accepted_risk",
					],
				},
				limit: { type: "number", description: "Max rows. Default 100." },
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.AUDIT.DOCUMENTS_VIEW])) {
				return {
					result: {
						error:
							"You cannot view findings. Ask an admin for the audit.documents_view permission.",
					},
				};
			}
			const findingId = String(args.findingId ?? "").trim();
			if (findingId) {
				const finding = await getFinding(ctx.orgId, findingId);
				if (!finding) {
					return {
						result: { error: `No finding found with id "${findingId}".` },
					};
				}
				return { result: { finding } };
			}
			const findings = await listFindings({
				orgId: ctx.orgId,
				documentId: args.documentId ? String(args.documentId) : undefined,
				status: args.status as AuditFindingStatus | undefined,
				limit: Math.min(Number(args.limit) || 100, 100),
			});
			return { result: { findings, count: findings.length } };
		},
	},
	{
		name: "dispute_finding",
		description:
			"Set a finding's stance: disputed, rectified, or accepted_risk, with a reason where required. Requires audit.manage_findings. Confirm before writing; audits.",
		requiredPermissions: [PERMISSIONS.AUDIT.MANAGE_FINDINGS],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				findingId: { type: "string" },
				stance: {
					type: "string",
					enum: FINDING_STANCES as unknown as string[],
				},
				reason: {
					type: "string",
					description: "Required to accept risk",
				},
			},
			required: ["findingId", "stance"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.AUDIT.MANAGE_FINDINGS])) {
				return {
					result: {
						error:
							"You cannot set a finding's stance. Ask an admin for the audit.manage_findings permission.",
					},
				};
			}
			const findingId = String(args.findingId ?? "").trim();
			if (!findingId) {
				return { result: { error: "Give the finding id." } };
			}
			const stance = String(args.stance ?? "");
			if (
				!FINDING_STANCES.includes(stance as (typeof FINDING_STANCES)[number])
			) {
				return {
					result: {
						error: "stance must be disputed, rectified, or accepted_risk.",
					},
				};
			}
			const finding = await getFinding(ctx.orgId, findingId);
			if (!finding) {
				return {
					result: { error: `No finding found with id "${findingId}".` },
				};
			}
			const reason = args.reason ? String(args.reason).trim() : "";
			if (stance === "accepted_risk" && !reason) {
				return {
					result: { error: "A reason is required to accept this risk." },
				};
			}

			let updated;
			if (stance === "disputed") {
				updated = await updateFinding(findingId, {
					status: "disputed",
					disputeReason: reason || "Disputed",
				});
			} else if (stance === "rectified") {
				updated = await updateFinding(findingId, { status: "rectified" });
			} else {
				updated = await updateFinding(findingId, {
					status: "accepted_risk",
					riskAcceptanceReason: reason,
					riskAcceptedBy: ctx.user.$id,
					riskAcceptedAt: new Date().toISOString(),
				});
			}
			await logAuditUploadEvent({
				user: ctx.user,
				orgId: ctx.orgId,
				action: "update",
				summary: `Set finding stance (${stance}): ${finding.title}`,
				targetId: findingId,
				targetLabel: finding.title,
				targetType: "audit_finding",
			});
			return { result: { findingId, status: updated.status, stance } };
		},
	},
	{
		name: "create_corrective_action",
		description:
			"Create a corrective action for a finding that doesn't have one yet. Requires audit.manage_caps. Confirm before writing; audits; org-scoped.",
		requiredPermissions: [PERMISSIONS.AUDIT.MANAGE_CAPS],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				findingId: { type: "string" },
				assigneeId: { type: "string", description: "Optional initial owner" },
			},
			required: ["findingId"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.AUDIT.MANAGE_CAPS])) {
				return {
					result: {
						error:
							"You cannot create corrective actions. Ask an admin for the audit.manage_caps permission.",
					},
				};
			}
			const findingId = String(args.findingId ?? "").trim();
			if (!findingId) {
				return { result: { error: "Give the finding id." } };
			}
			const finding = await getFinding(ctx.orgId, findingId);
			if (!finding) {
				return {
					result: { error: `No finding found with id "${findingId}".` },
				};
			}
			const existing = await listCaps({
				orgId: ctx.orgId,
				documentId: finding.documentId,
				limit: 200,
			});
			if (existing.some((cap) => cap.findingId === findingId)) {
				return {
					result: { error: "This finding already has a corrective action." },
				};
			}

			const cap = await createCap({
				orgId: ctx.orgId,
				documentId: finding.documentId,
				findingId: finding.$id,
				title: `Correct: ${finding.title}`,
				rootCause: inferRootCause(`${finding.title} ${finding.description}`),
				assigneeId: args.assigneeId ? String(args.assigneeId) : null,
				status: "open",
				dueAt: slaDueAt(finding.severityComputed),
				escalationTier: 0,
				verificationEvidence: null,
				evidenceAttachments: [],
				tasks: draftTasksFromFinding(finding),
				closedAt: null,
			});
			await logAuditUploadEvent({
				user: ctx.user,
				orgId: ctx.orgId,
				action: "create",
				summary: `Created corrective action for ${finding.title}`,
				targetId: cap.$id,
				targetLabel: cap.title,
				targetType: "audit_cap",
			});
			return {
				result: {
					capId: cap.$id,
					title: cap.title,
					dueAt: cap.dueAt,
					status: cap.status,
					created: true,
				},
			};
		},
	},
	{
		name: "assign_cap_owner",
		description:
			"Assign a corrective action's owner and/or due date. Requires audit.manage_caps. Confirm before writing; audits.",
		requiredPermissions: [PERMISSIONS.AUDIT.MANAGE_CAPS],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				capId: { type: "string" },
				assigneeId: { type: "string" },
				dueAt: { type: "string", description: "YYYY-MM-DD" },
			},
			required: ["capId", "assigneeId"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.AUDIT.MANAGE_CAPS])) {
				return {
					result: {
						error:
							"You cannot change corrective actions. Ask an admin for the audit.manage_caps permission.",
					},
				};
			}
			const capId = String(args.capId ?? "").trim();
			if (!capId) {
				return { result: { error: "Give the corrective action id." } };
			}
			const cap = await getCap(ctx.orgId, capId);
			if (!cap) {
				return {
					result: { error: `No corrective action found with id "${capId}".` },
				};
			}
			const assigneeId = String(args.assigneeId ?? "").trim();
			if (!assigneeId) {
				return { result: { error: "Give the new owner's user id." } };
			}
			const dueAt = args.dueAt ? String(args.dueAt).trim() : undefined;
			if (dueAt && Number.isNaN(new Date(dueAt).getTime())) {
				return { result: { error: "Give a valid due date (YYYY-MM-DD)." } };
			}

			const updated = await updateCap(capId, {
				assigneeId,
				...(dueAt ? { dueAt } : {}),
			});
			await logAuditUploadEvent({
				user: ctx.user,
				orgId: ctx.orgId,
				action: "update",
				summary: `Assigned owner for corrective action ${cap.title}`,
				targetId: capId,
				targetLabel: cap.title,
				targetType: "audit_cap",
			});
			return {
				result: {
					capId: updated.$id,
					assigneeId: updated.assigneeId,
					dueAt: updated.dueAt,
					assigned: true,
				},
			};
		},
	},
];
