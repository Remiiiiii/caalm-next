import { PERMISSIONS } from "@/constants/permissions";
import { hasAll } from "@/lib/assistant/tools/toolUtils";
import type { ToolContext, ToolDefinition } from "@/lib/assistant/tools/types";
import { loadContractForOrg } from "@/lib/contracts/negotiation/contract-scope";
import {
	assertGrantFundIdOnSave,
	GrantFundValidationError,
} from "@/lib/funding/grant-fund";
import { setGrantFundIdForContract } from "@/lib/funding/grant-fund.repository";
import {
	getObligationById,
	listObligations,
	updateObligation,
} from "@/lib/funding/obligation.repository";
import { getPursuitById, listPursuits } from "@/lib/funding/pursuit.repository";
import type { ObligationStatus, PursuitStage } from "@/lib/funding/types";
import { PURSUIT_STAGES } from "@/lib/funding/types";
import { assertFundInOrg } from "@/lib/funds";
import {
	createProposal,
	getProposalById,
	updateProposal,
} from "@/lib/proposals/repository";
import { isProposalStatus } from "@/lib/proposals/types";
import { logAuditEvent } from "@/lib/services/audit-logger";

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

async function auditFunding(
	ctx: ToolContext,
	opts: {
		action: "create" | "update";
		summary: string;
		targetType: string;
		targetId: string;
		targetLabel: string;
	},
) {
	await logAuditEvent({
		event_id: `assistant_funding_${opts.targetType}_${opts.targetId}_${Date.now()}`,
		event_title: opts.summary,
		action: opts.action,
		source: "caalm",
		user_id: ctx.user.$id,
		user_name: actorName(ctx),
		user_email: ctx.user.email || "",
		orgId: ctx.orgId,
		status: "success",
		module: "regulatory",
		target_type: opts.targetType,
		target_id: opts.targetId,
		target_label: opts.targetLabel,
		summary: opts.summary,
	}).catch(() => undefined);
}

export const FUNDING_TOOLS: ToolDefinition[] = [
	{
		name: "search_funding",
		description:
			"Search grants/funding pursuits, or return one by id. Requires funding.view. Read-only; org-scoped.",
		requiredPermissions: [PERMISSIONS.FUNDING.VIEW],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				pursuitId: { type: "string", description: "Funding pursuit id" },
				query: { type: "string", description: "Title/description search" },
				stage: {
					type: "string",
					enum: PURSUIT_STAGES as unknown as string[],
				},
				limit: { type: "number", description: "Max rows. Default 50." },
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.FUNDING.VIEW])) {
				return asError(
					"You cannot view funding. Ask an admin for the funding.view permission.",
				);
			}
			const pursuitId = String(args.pursuitId ?? "").trim();
			if (pursuitId) {
				const pursuit = await getPursuitById(pursuitId);
				if (!pursuit || pursuit.orgId !== ctx.orgId) {
					return asError(`No funding pursuit found with id "${pursuitId}".`);
				}
				return { result: { pursuit } };
			}
			const stage = PURSUIT_STAGES.includes(args.stage as PursuitStage)
				? (args.stage as PursuitStage)
				: undefined;
			const limit = Math.min(Number(args.limit) || 50, 100);
			let pursuits = await listPursuits({
				orgId: ctx.orgId,
				stage,
				limit: 200,
			});
			const query = String(args.query ?? "")
				.trim()
				.toLowerCase();
			if (query) {
				pursuits = pursuits.filter(
					(p) =>
						p.title.toLowerCase().includes(query) ||
						(p.description ?? "").toLowerCase().includes(query),
				);
			}
			pursuits = pursuits.slice(0, limit);
			return { result: { pursuits, count: pursuits.length } };
		},
	},
	{
		name: "list_funding_obligations",
		description:
			"List funding/reporting obligations, or mark one complete. Requires funding.view to list; completing requires funding.manage. Completing confirms and audits.",
		requiredPermissions: [],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				obligationId: { type: "string" },
				contractId: { type: "string" },
				status: {
					type: "string",
					description: "open, in_progress, done, waived, overdue",
				},
				limit: { type: "number", description: "Max rows. Default 100." },
				complete: {
					type: "boolean",
					description: "Mark obligationId as done",
				},
			},
		},
		handler: async (ctx, args) => {
			if (args.obligationId && args.complete) {
				if (!hasAll(ctx, [PERMISSIONS.FUNDING.MANAGE])) {
					return asError(
						"You cannot complete obligations. Ask an admin for the funding.manage permission.",
					);
				}
				const obligationId = String(args.obligationId).trim();
				const obligation = await getObligationById(obligationId);
				if (!obligation || obligation.orgId !== ctx.orgId) {
					return asError(
						`No funding obligation found with id "${obligationId}".`,
					);
				}
				const updated = await updateObligation(obligationId, {
					status: "done",
				});
				await auditFunding(ctx, {
					action: "update",
					summary: `Completed funding obligation ${updated.title}`,
					targetType: "funding_obligation",
					targetId: obligationId,
					targetLabel: updated.title,
				});
				return {
					result: {
						obligationId: updated.$id,
						status: updated.status,
						completed: true,
					},
				};
			}
			if (!hasAll(ctx, [PERMISSIONS.FUNDING.VIEW])) {
				return asError(
					"You cannot view funding obligations. Ask an admin for the funding.view permission.",
				);
			}
			const limit = Math.min(Number(args.limit) || 100, 200);
			const obligations = await listObligations({
				orgId: ctx.orgId,
				contractId: args.contractId ? String(args.contractId) : undefined,
				status: args.status as ObligationStatus | undefined,
				limit,
			});
			return { result: { obligations, count: obligations.length } };
		},
	},
	{
		name: "create_proposal",
		description:
			"Create a funding proposal, or update an existing one's title/status/links. Creating requires proposals.create; updating requires proposals.edit. Confirm before writing; audits.",
		requiredPermissions: [],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				proposalId: {
					type: "string",
					description:
						"Give to update an existing proposal instead of creating",
				},
				title: { type: "string" },
				solicitationRef: { type: "string" },
				linkedContractId: { type: "string" },
				linkedFundingPursuitId: { type: "string" },
				status: { type: "string", description: "draft, in_review, final" },
			},
		},
		handler: async (ctx, args) => {
			const proposalId = String(args.proposalId ?? "").trim();
			if (proposalId) {
				if (!hasAll(ctx, [PERMISSIONS.PROPOSALS.EDIT])) {
					return asError(
						"You cannot edit proposals. Ask an admin for the proposals.edit permission.",
					);
				}
				const proposal = await getProposalById(proposalId);
				if (!proposal || proposal.orgId !== ctx.orgId) {
					return asError(`No proposal found with id "${proposalId}".`);
				}
				if (args.status !== undefined && !isProposalStatus(args.status)) {
					return asError("status must be draft, in_review, or final.");
				}
				const updated = await updateProposal(proposalId, {
					...(args.title ? { title: String(args.title) } : {}),
					...(isProposalStatus(args.status) ? { status: args.status } : {}),
					...(args.linkedContractId
						? { linkedContractId: String(args.linkedContractId) }
						: {}),
					...(args.linkedFundingPursuitId
						? { linkedFundingPursuitId: String(args.linkedFundingPursuitId) }
						: {}),
				});
				await auditFunding(ctx, {
					action: "update",
					summary: `Updated proposal ${updated.title}`,
					targetType: "funding_proposal",
					targetId: proposalId,
					targetLabel: updated.title,
				});
				return {
					result: {
						proposalId: updated.$id,
						title: updated.title,
						status: updated.status,
					},
				};
			}
			if (!hasAll(ctx, [PERMISSIONS.PROPOSALS.CREATE])) {
				return asError(
					"You cannot create proposals. Ask an admin for the proposals.create permission.",
				);
			}
			const title = String(args.title ?? "").trim();
			if (!title) {
				return asError("Give the proposal a title.");
			}
			const created = await createProposal({
				orgId: ctx.orgId,
				title,
				solicitationRef: args.solicitationRef
					? String(args.solicitationRef)
					: undefined,
				linkedContractId: args.linkedContractId
					? String(args.linkedContractId)
					: undefined,
				linkedFundingPursuitId: args.linkedFundingPursuitId
					? String(args.linkedFundingPursuitId)
					: undefined,
				createdByUserId: ctx.user.$id,
				createdByName: actorName(ctx),
			});
			await auditFunding(ctx, {
				action: "create",
				summary: `Created proposal ${created.title}`,
				targetType: "funding_proposal",
				targetId: created.$id,
				targetLabel: created.title,
			});
			return {
				result: {
					proposalId: created.$id,
					title: created.title,
					status: created.status,
					created: true,
				},
			};
		},
	},
	{
		name: "link_contract_to_funding",
		description:
			"Tie a grant fund to a contract/agreement. Requires contracts.edit and funding.manage. Confirm before writing; audits; org-scoped both sides.",
		requiredPermissions: [
			PERMISSIONS.CONTRACTS.EDIT,
			PERMISSIONS.FUNDING.MANAGE,
		],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				contractId: { type: "string" },
				fundId: {
					type: "string",
					description: "Fund id to link; omit or give empty to unlink",
				},
			},
			required: ["contractId"],
		},
		handler: async (ctx, args) => {
			if (
				!hasAll(ctx, [PERMISSIONS.CONTRACTS.EDIT, PERMISSIONS.FUNDING.MANAGE])
			) {
				return asError(
					"You cannot link funding to contracts. Ask an admin for the contracts.edit and funding.manage permissions.",
				);
			}
			const contractId = String(args.contractId ?? "").trim();
			if (!contractId) {
				return asError("Give the contract id.");
			}
			let contract: Awaited<ReturnType<typeof loadContractForOrg>>;
			try {
				contract = await loadContractForOrg(contractId, ctx.orgId);
			} catch {
				return asError(`No contract found with id "${contractId}".`);
			}
			const fundId = args.fundId ? String(args.fundId).trim() : "";
			try {
				assertGrantFundIdOnSave({
					contractType: String(contract.contractType || ""),
					fundId,
				});
				if (fundId) {
					await assertFundInOrg(ctx.orgId, fundId);
				}
			} catch (error) {
				if (error instanceof GrantFundValidationError) {
					return asError(error.message);
				}
				return asError(
					error instanceof Error ? error.message : "Could not link that fund.",
				);
			}
			const saved = await setGrantFundIdForContract({
				orgId: ctx.orgId,
				contractId,
				fundId: fundId || null,
			});
			await auditFunding(ctx, {
				action: "update",
				summary: saved
					? `Linked fund ${saved} to contract ${contractId}`
					: `Unlinked fund from contract ${contractId}`,
				targetType: "contract",
				targetId: contractId,
				targetLabel: contractId,
			});
			return { result: { contractId, fundId: saved, linked: Boolean(saved) } };
		},
	},
];
