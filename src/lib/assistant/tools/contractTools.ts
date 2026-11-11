import { PERMISSIONS } from "@/constants/permissions";
import {
	analyzeContractDocument,
	answerContractQuestion,
} from "@/lib/ai/contract-assistant";
import { extractContractFromDocument } from "@/lib/ai/extractContractFromDocument";
import { ContractFieldUpdateService } from "@/lib/api/contracts/services/ContractFieldUpdateService";
import {
	decide,
	getWorkflowForViewer,
} from "@/lib/approvals/ContractApprovalWorkflowService";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { hasAll, searchContractsTable } from "@/lib/assistant/tools/toolUtils";
import type { ToolContext, ToolDefinition } from "@/lib/assistant/tools/types";
import {
	isClauseCategory,
	listClauses,
} from "@/lib/clauses/clause-library.service";
import { createAccess } from "@/lib/contracts/negotiation/access.service";
import { listVersions } from "@/lib/contracts/negotiation/versions.service";
import { createEnvelope, sendEnvelope } from "@/lib/esign/envelope-service";
import { parsePdfBuffer } from "@/lib/files/pdf-text";
import { listObligations } from "@/lib/funding/obligation.repository";
import type { ObligationStatus } from "@/lib/funding/types";
import {
	compareClauseWithGemini,
	extractClausesWithGemini,
} from "@/lib/playbook/compare-with-gemini";
import { pickStandardForClause } from "@/lib/playbook/deviation-scoring";
import { scoreOrgContractDeviations } from "@/lib/playbook/score-org-contract";
import { suggestRedlineForClause } from "@/lib/playbook/suggest-redline";
import { renewContractAfterExpiry } from "@/lib/renewals/renewDocument";
import { logAuditEvent } from "@/lib/services/audit-logger";
import { mailgunService } from "@/lib/services/mailgun";
import { getBlueprint, isBlueprintId } from "@/lib/templates/blueprint-catalog";
import {
	createWizardSession,
	saveWizardSession,
	submitWizard,
} from "@/lib/templates/wizard.service";
import { constructFileUrl } from "@/lib/utils";

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

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ContractDetail = {
	contractId: string;
	contractName: string;
	description: string;
	contractType: string;
	vendor: string;
	amount: string;
	contractNumber: string;
	contractExpiryDate: string;
	status: string;
	lifecycleStatus: string;
	contractOwnerId: string;
	fileId: string;
	fileUrl: string;
	fileExtension: string;
};

/** Org-scoped contract fetch with the same shape as /api/contracts/get-details. */
async function fetchContractDetail(
	ctx: ToolContext,
	contractId: string,
): Promise<ContractDetail | null> {
	const { tablesDB } = await createAdminClient();
	const databaseId = appwriteConfig.databaseId || "default-db";
	const contract = await tablesDB.getRow({
		databaseId,
		tableId: appwriteConfig.contractsCollectionId || "contracts",
		rowId: contractId,
	});
	if (!contract || (contract as { orgId?: string }).orgId !== ctx.orgId) {
		return null;
	}

	let fileUrl = "";
	let fileExtension = "pdf";
	if (contract.fileId) {
		try {
			const fileDoc = await tablesDB.getRow({
				databaseId,
				tableId: appwriteConfig.filesCollectionId || "files",
				rowId: contract.fileId,
				queries: [],
			});
			if (fileDoc?.url) fileUrl = fileDoc.url;
			if (fileDoc?.extension) fileExtension = fileDoc.extension;
		} catch {
			try {
				fileUrl = constructFileUrl(contract.fileId);
			} catch {
				// no readable file url; leave blank
			}
		}
	}

	return {
		contractId: contract.$id,
		contractName: contract.contractName || "Unnamed Contract",
		description: contract.description || "",
		contractType: contract.contractType || "",
		vendor: contract.vendor || "",
		amount: contract.amount || "",
		contractNumber: contract.contractNumber || "",
		contractExpiryDate: contract.contractExpiryDate || "",
		status: contract.status || "",
		lifecycleStatus: contract.lifecycleStatus || "",
		contractOwnerId: String(contract.contractOwnerId || contract.owner || ""),
		fileId: contract.fileId || "",
		fileUrl,
		fileExtension,
	};
}

/** Resolve exactly one org-scoped contract by id or fuzzy name search. */
async function resolveOneContract(
	ctx: ToolContext,
	args: { contractId?: string; query?: string },
): Promise<{ contract?: ContractDetail; error?: string }> {
	const contractId = String(args.contractId ?? "").trim();
	if (contractId) {
		const contract = await fetchContractDetail(ctx, contractId);
		if (!contract)
			return { error: `No contract found with id "${contractId}".` };
		return { contract };
	}

	const query = String(args.query ?? "").trim();
	if (!query) {
		return { error: "Which contract? Give a name or id." };
	}
	const matches = await searchContractsTable(ctx, query);
	if (matches.length === 0) {
		return { error: `No contracts match "${query}".` };
	}
	if (matches.length > 1) {
		return {
			error: `Several contracts match "${query}": ${matches
				.slice(0, 3)
				.map((m) => m.name)
				.join(", ")}. Be more specific or use the contract id.`,
		};
	}
	const contract = await fetchContractDetail(ctx, String(matches[0].id));
	if (!contract)
		return { error: `No contract found with id "${matches[0].id}".` };
	return { contract };
}

export const CONTRACT_TOOLS: ToolDefinition[] = [
	{
		name: "get_contract",
		description:
			"Return one contract's full record (key dates, parties, value, status). Requires contracts.view.",
		requiredPermissions: [PERMISSIONS.CONTRACTS.VIEW],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				contractId: { type: "string", description: "Contract document id" },
				query: { type: "string", description: "Contract name search" },
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.CONTRACTS.VIEW])) {
				return asError(
					"You cannot view contracts. Ask an admin for the contracts.view permission.",
				);
			}
			const found = await resolveOneContract(ctx, args);
			if (found.error || !found.contract) {
				return asError(found.error ?? "Contract not found.");
			}
			return { result: { contract: found.contract } };
		},
	},
	{
		name: "ask_contract",
		description:
			"Answer a question about one contract's text with citations. Requires contracts.view. Read-only; always cites source.",
		requiredPermissions: [PERMISSIONS.CONTRACTS.VIEW],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				contractId: { type: "string", description: "Contract document id" },
				query: { type: "string", description: "Contract name search" },
				question: {
					type: "string",
					description: "Question about the contract",
				},
			},
			required: ["question"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.CONTRACTS.VIEW])) {
				return asError(
					"You cannot view contracts. Ask an admin for the contracts.view permission.",
				);
			}
			const question = String(args.question ?? "").trim();
			if (!question)
				return asError("What would you like to know about the contract?");

			const found = await resolveOneContract(ctx, args);
			if (found.error || !found.contract) {
				return asError(found.error ?? "Contract not found.");
			}
			const contract = found.contract;
			if (!contract.fileUrl) {
				return asError(
					`"${contract.contractName}" has no readable file attached yet.`,
				);
			}

			try {
				const response = await fetch(contract.fileUrl);
				if (!response.ok) {
					return asError("Could not load the contract file.");
				}
				const buffer = Buffer.from(await response.arrayBuffer());
				const parsed = await parsePdfBuffer(buffer, contract.contractName);
				const answer = await answerContractQuestion({
					question,
					fileName: contract.contractName,
					pageTexts: parsed.pageTexts,
				});
				return {
					result: {
						contractId: contract.contractId,
						answerMarkdown: answer.answerMarkdown,
						citations: answer.citations,
						suggestedQuestions: answer.suggestedQuestions,
					},
				};
			} catch (error) {
				return asError(
					error instanceof Error
						? error.message
						: "Failed to answer that question about the contract.",
				);
			}
		},
	},
	{
		name: "create_contract",
		description:
			"Start a contract from an approved template blueprint. Requires contracts.create. Confirm before writing; audits create.",
		requiredPermissions: [PERMISSIONS.CONTRACTS.CREATE],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				blueprintId: {
					type: "string",
					description:
						"Template blueprint id: vendor, grant, government, lease, consulting, mou, donation, independent_contractor, fiscal_sponsorship, or employment",
				},
				contractName: { type: "string" },
				department: { type: "string" },
				counterparty: { type: "string" },
				amount: { type: "string" },
				currency: { type: "string" },
				startDate: { type: "string" },
				expiryDate: { type: "string" },
				governingLaw: { type: "string" },
				description: { type: "string" },
			},
			required: ["blueprintId", "contractName"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.CONTRACTS.CREATE])) {
				return asError(
					"You cannot create contracts. Ask an admin for the contracts.create permission.",
				);
			}
			const blueprintId = String(args.blueprintId ?? "").trim();
			if (!isBlueprintId(blueprintId) || !getBlueprint(blueprintId)) {
				return asError(
					"blueprintId must be one of: vendor, grant, government, lease, consulting, mou, donation, independent_contractor, fiscal_sponsorship, employment.",
				);
			}
			const contractName = String(args.contractName ?? "").trim();
			if (!contractName) return asError("What should the contract be named?");

			try {
				const session = await createWizardSession({
					orgId: ctx.orgId,
					userId: ctx.user.$id,
					blueprintId,
				});

				const intakeFields = [
					"department",
					"counterparty",
					"amount",
					"currency",
					"startDate",
					"expiryDate",
					"governingLaw",
					"description",
				] as const;
				const intake = { ...session.payload.intake, contractName };
				for (const field of intakeFields) {
					if (args[field] !== undefined) {
						intake[field] = String(args[field]);
					}
				}

				const saved = await saveWizardSession({
					session,
					orgId: ctx.orgId,
					userId: ctx.user.$id,
					payload: { ...session.payload, intake },
				});

				const submitted = await submitWizard({
					session: saved,
					orgId: ctx.orgId,
					userId: ctx.user.$id,
					userName: actorName(ctx),
					userEmail: ctx.user.email || "",
				});

				await logAuditEvent({
					event_id: `assistant_contract_create_${submitted.contractId}`,
					event_title: `Assistant created contract: ${contractName}`,
					action: "create",
					source: "caalm",
					user_id: ctx.user.$id,
					user_name: actorName(ctx),
					user_email: ctx.user.email || "",
					status: "success",
					orgId: ctx.orgId,
					module: "contracts",
					target_type: "contract",
					target_id: submitted.contractId,
					target_label: contractName,
					summary: `${actorName(ctx)} created contract "${contractName}" from the ${blueprintId} template`,
					metadata: { source: "ai_assistant", blueprintId },
				}).catch(() => undefined);

				return {
					result: { contractId: submitted.contractId, contractName },
				};
			} catch (error) {
				return asError(
					error instanceof Error
						? error.message
						: "Failed to create the contract.",
				);
			}
		},
	},
	{
		name: "update_contract_fields",
		description:
			"Edit metadata fields (name, vendor, amount, expiry date, description, status) on one contract. Requires contracts.edit. Confirm before writing; audits.",
		requiredPermissions: [PERMISSIONS.CONTRACTS.EDIT],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				contractId: { type: "string", description: "Contract document id" },
				query: { type: "string", description: "Contract name search" },
				contractName: { type: "string" },
				vendor: { type: "string" },
				amount: { type: "string" },
				contractExpiryDate: { type: "string", description: "YYYY-MM-DD" },
				description: { type: "string" },
				status: { type: "string" },
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.CONTRACTS.EDIT])) {
				return asError(
					"You cannot edit contracts. Ask an admin for the contracts.edit permission.",
				);
			}
			const found = await resolveOneContract(ctx, args);
			if (found.error || !found.contract) {
				return asError(found.error ?? "Contract not found.");
			}

			const patch: Record<string, string> = {};
			for (const field of [
				"contractName",
				"vendor",
				"amount",
				"contractExpiryDate",
				"description",
				"status",
			] as const) {
				if (args[field] !== undefined) {
					const value = String(args[field]).trim();
					if (field === "contractName" && !value) {
						return asError("Contract name cannot be empty.");
					}
					patch[field] = value;
				}
			}
			if (Object.keys(patch).length === 0) {
				return asError(
					"Say which field to change: name, vendor, amount, expiry date, description, or status.",
				);
			}
			if (patch.amount !== undefined && Number.isNaN(Number(patch.amount))) {
				return asError("Amount must be a number.");
			}
			if (
				patch.contractExpiryDate !== undefined &&
				Number.isNaN(new Date(patch.contractExpiryDate).getTime())
			) {
				return asError("Expiry date must be a valid date (YYYY-MM-DD).");
			}

			try {
				await ContractFieldUpdateService.updateContractFields({
					contractId: found.contract.contractId,
					orgId: ctx.orgId,
					patch,
				});
				await logAuditEvent({
					event_id: `assistant_contract_update_${found.contract.contractId}`,
					event_title: `Assistant updated contract: ${found.contract.contractName}`,
					action: "update",
					source: "caalm",
					user_id: ctx.user.$id,
					user_name: actorName(ctx),
					user_email: ctx.user.email || "",
					status: "success",
					orgId: ctx.orgId,
					module: "contracts",
					target_type: "contract",
					target_id: found.contract.contractId,
					target_label: found.contract.contractName,
					summary: `${actorName(ctx)} updated fields on "${found.contract.contractName}" (${Object.keys(patch).join(", ")})`,
					metadata: { source: "ai_assistant", fields: Object.keys(patch) },
				}).catch(() => undefined);

				return {
					result: {
						contractId: found.contract.contractId,
						updatedFields: Object.keys(patch),
					},
				};
			} catch (error) {
				return asError(
					error instanceof Error
						? error.message
						: "Failed to update the contract.",
				);
			}
		},
	},
	{
		name: "bulk_update_contracts",
		description:
			"Update fields across several contracts from a search result, with a preview. Requires contracts.edit. Not available yet — no bulk-update backend exists.",
		requiredPermissions: [PERMISSIONS.CONTRACTS.EDIT],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				contractIds: {
					type: "array",
					items: { type: "string" },
					description: "Contract document ids to update",
				},
				contractName: { type: "string" },
				vendor: { type: "string" },
				amount: { type: "string" },
				contractExpiryDate: { type: "string" },
				description: { type: "string" },
				status: { type: "string" },
			},
			required: ["contractIds"],
		},
		handler: async (ctx) => {
			if (!hasAll(ctx, [PERMISSIONS.CONTRACTS.EDIT])) {
				return asError(
					"You cannot edit contracts. Ask an admin for the contracts.edit permission.",
				);
			}
			return {
				result: {
					message:
						"Bulk contract updates aren't available yet. Update contracts one at a time with update_contract_fields.",
					succeeded: 0,
					failed: 0,
					skipped: 0,
				},
			};
		},
	},
	{
		name: "extract_contract_terms",
		description:
			"AI-extract dates, parties, and value from a contract's file into fields for human review. Requires contracts.edit. Never auto-saves — review then use update_contract_fields.",
		requiredPermissions: [PERMISSIONS.CONTRACTS.EDIT],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				contractId: { type: "string", description: "Contract document id" },
				query: { type: "string", description: "Contract name search" },
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.CONTRACTS.EDIT])) {
				return asError(
					"You cannot edit contracts. Ask an admin for the contracts.edit permission.",
				);
			}
			const found = await resolveOneContract(ctx, args);
			if (found.error || !found.contract) {
				return asError(found.error ?? "Contract not found.");
			}
			const contract = found.contract;
			if (!contract.fileUrl) {
				return asError(
					`"${contract.contractName}" has no readable file attached yet.`,
				);
			}
			try {
				const response = await fetch(contract.fileUrl);
				if (!response.ok) {
					return asError("Could not load the contract file.");
				}
				const buffer = Buffer.from(await response.arrayBuffer());
				const extraction = await extractContractFromDocument({
					buffer,
					fileName: `${contract.contractName}.${contract.fileExtension || "pdf"}`,
				});
				return {
					result: {
						contractId: contract.contractId,
						fields: extraction.fields,
						extractedData: extraction.extractedData,
						overallConfidence: extraction.overallConfidence,
						lowConfidenceFields: extraction.lowConfidenceFields,
						message:
							"Review these fields — nothing was saved. Use update_contract_fields to apply any you confirm.",
					},
				};
			} catch (error) {
				return asError(
					error instanceof Error
						? error.message
						: "Failed to extract terms from the contract.",
				);
			}
		},
	},
	{
		name: "summarize_contract",
		description:
			"Plain-language summary of one contract's key terms, with citations. Requires contracts.view. Read-only.",
		requiredPermissions: [PERMISSIONS.CONTRACTS.VIEW],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				contractId: { type: "string", description: "Contract document id" },
				query: { type: "string", description: "Contract name search" },
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.CONTRACTS.VIEW])) {
				return asError(
					"You cannot view contracts. Ask an admin for the contracts.view permission.",
				);
			}
			const found = await resolveOneContract(ctx, args);
			if (found.error || !found.contract) {
				return asError(found.error ?? "Contract not found.");
			}
			const contract = found.contract;
			if (!contract.fileUrl) {
				return asError(
					`"${contract.contractName}" has no readable file attached yet.`,
				);
			}
			try {
				const response = await fetch(contract.fileUrl);
				if (!response.ok) {
					return asError("Could not load the contract file.");
				}
				const buffer = Buffer.from(await response.arrayBuffer());
				const parsed = await parsePdfBuffer(buffer, contract.contractName);
				const analysis = await analyzeContractDocument({
					fileName: contract.contractName,
					pageTexts: parsed.pageTexts,
				});
				return {
					result: {
						contractId: contract.contractId,
						summaryMarkdown: analysis.summaryMarkdown,
						citations: analysis.citations,
					},
				};
			} catch (error) {
				return asError(
					error instanceof Error
						? error.message
						: "Failed to summarize the contract.",
				);
			}
		},
	},
	{
		name: "compare_contract_versions",
		description:
			"Show what changed between two saved versions of a contract. Requires contracts.view. Read-only; org-scoped.",
		requiredPermissions: [PERMISSIONS.CONTRACTS.VIEW],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				contractId: { type: "string", description: "Contract document id" },
				query: { type: "string", description: "Contract name search" },
				fromVersion: {
					type: "number",
					description:
						"Older version number (defaults to the second-most-recent)",
				},
				toVersion: {
					type: "number",
					description: "Newer version number (defaults to the most recent)",
				},
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.CONTRACTS.VIEW])) {
				return asError(
					"You cannot view contracts. Ask an admin for the contracts.view permission.",
				);
			}
			const found = await resolveOneContract(ctx, args);
			if (found.error || !found.contract) {
				return asError(found.error ?? "Contract not found.");
			}
			const contract = found.contract;
			const versions = (await listVersions(contract.contractId)).filter(
				(v) => v.orgId === ctx.orgId,
			);
			if (versions.length < 2) {
				return asError(
					`"${contract.contractName}" only has ${versions.length} saved version${versions.length === 1 ? "" : "s"} — nothing to compare yet.`,
				);
			}
			const sorted = [...versions].sort(
				(a, b) => a.versionNumber - b.versionNumber,
			);
			const toVersion =
				args.toVersion != null
					? sorted.find((v) => v.versionNumber === Number(args.toVersion))
					: sorted[sorted.length - 1];
			const fromVersion =
				args.fromVersion != null
					? sorted.find((v) => v.versionNumber === Number(args.fromVersion))
					: sorted[sorted.length - 2];
			if (!fromVersion || !toVersion) {
				return asError("Could not find both versions to compare.");
			}
			const diff = diffLines(
				fromVersion.extractedText,
				toVersion.extractedText,
			);
			return {
				result: {
					contractId: contract.contractId,
					fromVersion: fromVersion.versionNumber,
					toVersion: toVersion.versionNumber,
					fromChangeSummary: fromVersion.changeSummary,
					toChangeSummary: toVersion.changeSummary,
					added: diff.added,
					removed: diff.removed,
					unchangedLineCount: diff.unchangedCount,
				},
			};
		},
	},
	{
		name: "check_playbook_deviations",
		description:
			"Flag clauses in a contract that deviate from the org's playbook standards, with an explanation for each. Requires contracts.review. Read-only analysis; no auto-edit.",
		requiredPermissions: [PERMISSIONS.CONTRACTS.REVIEW],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				contractId: { type: "string", description: "Contract document id" },
				query: { type: "string", description: "Contract name search" },
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.CONTRACTS.REVIEW])) {
				return asError(
					"You cannot review contracts. Ask an admin for the contracts.review permission.",
				);
			}
			const found = await resolveOneContract(ctx, args);
			if (found.error || !found.contract) {
				return asError(found.error ?? "Contract not found.");
			}
			const contract = found.contract;
			if (!contract.fileUrl) {
				return asError(
					`"${contract.contractName}" has no readable file attached yet.`,
				);
			}
			try {
				const response = await fetch(contract.fileUrl);
				if (!response.ok) {
					return asError("Could not load the contract file.");
				}
				const buffer = Buffer.from(await response.arrayBuffer());
				const parsed = await parsePdfBuffer(buffer, contract.contractName);
				const report = await scoreOrgContractDeviations({
					orgId: ctx.orgId,
					content: parsed.text,
				});
				return {
					result: {
						contractId: contract.contractId,
						deviations: report.deviations,
						summary: report.summary,
					},
				};
			} catch (error) {
				return asError(
					error instanceof Error
						? error.message
						: "Failed to check this contract against the playbook.",
				);
			}
		},
	},
	{
		name: "suggest_redlines",
		description:
			"Propose redline edits against the org's clause library playbook, for human review. Requires contracts.review. Proposals only — never saves without confirm.",
		requiredPermissions: [PERMISSIONS.CONTRACTS.REVIEW],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				contractId: { type: "string", description: "Contract document id" },
				query: { type: "string", description: "Contract name search" },
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.CONTRACTS.REVIEW])) {
				return asError(
					"You cannot review contracts. Ask an admin for the contracts.review permission.",
				);
			}
			const found = await resolveOneContract(ctx, args);
			if (found.error || !found.contract) {
				return asError(found.error ?? "Contract not found.");
			}
			const contract = found.contract;
			if (!contract.fileUrl) {
				return asError(
					`"${contract.contractName}" has no readable file attached yet.`,
				);
			}
			try {
				const response = await fetch(contract.fileUrl);
				if (!response.ok) {
					return asError("Could not load the contract file.");
				}
				const buffer = Buffer.from(await response.arrayBuffer());
				const parsed = await parsePdfBuffer(buffer, contract.contractName);
				const extracted = await extractClausesWithGemini(parsed.text);
				const standards = await listClauses({
					orgId: ctx.orgId,
					status: "active",
					currentOnly: true,
				});
				// shortcut: caps at 10 clauses per call to bound Gemini round-trips; upgrade to pagination if contracts regularly exceed this.
				const proposals: Array<{
					clauseTitle: string;
					category: string;
					rationale: string;
					differingPoints: string[];
					suggestedText: string;
					explanation: string;
				}> = [];
				for (const clause of extracted.slice(0, 10)) {
					const standard = pickStandardForClause(clause, standards);
					if (!standard || !isClauseCategory(clause.category ?? "")) continue;
					const compare = await compareClauseWithGemini(clause, standard);
					if (compare.verdict !== "deviate") continue;
					const redline = await suggestRedlineForClause(clause, standard);
					proposals.push({
						clauseTitle: clause.title ?? "",
						category: clause.category ?? "",
						rationale: compare.rationale,
						differingPoints: compare.differingPoints,
						suggestedText: redline.suggestedText,
						explanation: redline.explanation,
					});
				}
				return {
					result: {
						contractId: contract.contractId,
						proposals,
						message:
							proposals.length === 0
								? "No clauses deviate from the playbook, or none matched a standard to redline against."
								: "These are proposals only — nothing was saved. Apply any you confirm manually.",
					},
				};
			} catch (error) {
				return asError(
					error instanceof Error
						? error.message
						: "Failed to suggest redlines for this contract.",
				);
			}
		},
	},
	{
		name: "list_contract_obligations",
		description:
			"List post-signature obligations (renewal, reporting, deliverable, compliance, payment) for a contract. Requires contracts.view. Read-only, org-scoped. To create a follow-up task, use create_task_for_contract.",
		requiredPermissions: [PERMISSIONS.CONTRACTS.VIEW],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				contractId: { type: "string", description: "Contract document id" },
				query: { type: "string", description: "Contract name search" },
				status: {
					type: "string",
					description:
						"Optional filter: open, in_progress, done, waived, overdue",
				},
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.CONTRACTS.VIEW])) {
				return asError(
					"You cannot view contracts. Ask an admin for the contracts.view permission.",
				);
			}
			const found = await resolveOneContract(ctx, args);
			if (found.error || !found.contract) {
				return asError(found.error ?? "Contract not found.");
			}
			const obligations = await listObligations({
				orgId: ctx.orgId,
				contractId: found.contract.contractId,
				status: args.status
					? (String(args.status) as ObligationStatus)
					: undefined,
			});
			return {
				result: { contractId: found.contract.contractId, obligations },
			};
		},
	},
	{
		name: "send_counterparty_invite",
		description:
			"Start negotiation by emailing a secure counterparty invite link to review and comment on a contract draft. Requires contracts.edit. Confirm before sending; audits; link is scoped to the contract and org.",
		requiredPermissions: [PERMISSIONS.CONTRACTS.EDIT],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				contractId: { type: "string", description: "Contract document id" },
				query: { type: "string", description: "Contract name search" },
				email: { type: "string", description: "Counterparty email" },
				name: { type: "string", description: "Counterparty full name" },
				message: { type: "string", description: "Optional note to include" },
			},
			required: ["email", "name"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.CONTRACTS.EDIT])) {
				return asError(
					"You cannot edit contracts. Ask an admin for the contracts.edit permission.",
				);
			}
			const email = String(args.email ?? "")
				.trim()
				.toLowerCase();
			const name = String(args.name ?? "").trim();
			if (!EMAIL_RE.test(email)) {
				return asError("Give a valid counterparty email address.");
			}
			if (!name) return asError("Give the counterparty's full name.");

			const found = await resolveOneContract(ctx, args);
			if (found.error || !found.contract) {
				return asError(found.error ?? "Contract not found.");
			}
			const contract = found.contract;
			const message = String(args.message ?? "")
				.trim()
				.slice(0, 2000);

			try {
				const { access, urlPath } = await createAccess({
					contractId: contract.contractId,
					orgId: ctx.orgId,
					invitees: [{ email, name }],
					createdBy: ctx.user.$id,
				});
				const baseUrl =
					process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "";
				const link = `${baseUrl}${urlPath}`;
				const text = [
					`You have been invited to review "${contract.contractName}" in CAALM.`,
					message ? `\n${message}` : "",
					`\nOpen the draft: ${link}`,
					"\nThis secure link expires in 14 days. You can view the draft and leave comments without a CAALM login.",
				].join("");
				const html = [
					`<p>You have been invited to review <strong>${escapeHtml(contract.contractName)}</strong> in CAALM.</p>`,
					message
						? `<p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>`
						: "",
					`<p><a href="${escapeHtml(link)}">Open the draft</a></p>`,
					"<p>This secure link expires in 14 days. You can view the draft and leave comments without a CAALM login.</p>",
				].join("");
				await mailgunService.sendEmail({
					to: email,
					subject: `[CAALM] Review requested: ${contract.contractName}`,
					text,
					html,
				});

				await logAuditEvent({
					event_id: `assistant_contract_invite_${contract.contractId}_${Date.now()}`,
					event_title: `Assistant invited counterparty to review: ${contract.contractName}`,
					action: "create",
					source: "caalm",
					user_id: ctx.user.$id,
					user_name: actorName(ctx),
					user_email: ctx.user.email || "",
					status: "success",
					orgId: ctx.orgId,
					module: "contracts",
					target_type: "contract",
					target_id: contract.contractId,
					target_label: contract.contractName,
					summary: `${actorName(ctx)} invited ${email} to review "${contract.contractName}"`,
					metadata: { source: "ai_assistant", email },
				}).catch(() => undefined);

				return {
					result: {
						contractId: contract.contractId,
						email,
						expiresAt: access.expiresAt,
						sent: true,
					},
				};
			} catch (error) {
				return asError(
					error instanceof Error
						? error.message
						: "Failed to send the counterparty invite.",
				);
			}
		},
	},
	{
		name: "send_for_signature",
		description:
			"Prepare and send a contract for e-signature to one or more signers, and report envelope status. Requires contracts.sign. Confirm signers before sending; audits send.",
		requiredPermissions: [PERMISSIONS.CONTRACTS.SIGN],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				contractId: { type: "string", description: "Contract document id" },
				query: { type: "string", description: "Contract name search" },
				signers: {
					type: "array",
					items: {
						type: "object",
						properties: {
							email: { type: "string" },
							name: { type: "string" },
						},
					},
					description: "At least one signer: [{email, name}]",
				},
			},
			required: ["signers"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.CONTRACTS.SIGN])) {
				return asError(
					"You cannot send contracts for signature. Ask an admin for the contracts.sign permission.",
				);
			}
			const rawSigners = Array.isArray(args.signers) ? args.signers : [];
			const signers = rawSigners
				.map((s) => ({
					email: String((s as { email?: string }).email ?? "")
						.trim()
						.toLowerCase(),
					name: String((s as { name?: string }).name ?? "").trim(),
				}))
				.filter((s) => s.email && s.name);
			if (signers.length === 0) {
				return asError("Give at least one signer with an email and full name.");
			}
			const invalid = signers.find((s) => !EMAIL_RE.test(s.email));
			if (invalid) return asError(`"${invalid.email}" is not a valid email.`);

			const found = await resolveOneContract(ctx, args);
			if (found.error || !found.contract) {
				return asError(found.error ?? "Contract not found.");
			}
			const contract = found.contract;
			if (!contract.fileId) {
				return asError(
					`"${contract.contractName}" has no attached file to sign yet.`,
				);
			}

			try {
				const envelope = await createEnvelope({
					orgId: ctx.orgId,
					resourceType: "contract",
					resourceId: contract.contractId,
					documentFileId: contract.fileId,
					createdBy: ctx.user.$id,
					title: contract.contractName,
					recipients: signers.map((s, index) => ({
						email: s.email,
						name: s.name,
						role: "signer",
						order: index + 1,
					})),
				});
				const sent = await sendEnvelope(envelope.$id);

				await logAuditEvent({
					event_id: `assistant_contract_esign_${contract.contractId}_${sent.$id}`,
					event_title: `Assistant sent contract for signature: ${contract.contractName}`,
					action: "update",
					source: "caalm",
					user_id: ctx.user.$id,
					user_name: actorName(ctx),
					user_email: ctx.user.email || "",
					status: "success",
					orgId: ctx.orgId,
					module: "contracts",
					target_type: "contract",
					target_id: contract.contractId,
					target_label: contract.contractName,
					summary: `${actorName(ctx)} sent "${contract.contractName}" for signature to ${signers.map((s) => s.email).join(", ")}`,
					metadata: { source: "ai_assistant", envelopeId: sent.$id },
				}).catch(() => undefined);

				return {
					result: {
						contractId: contract.contractId,
						envelopeId: sent.$id,
						status: sent.status,
					},
				};
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "Failed to send this contract for signature.";
				return asError(
					message.includes("missing signature fields")
						? `${message}. Add signature fields to the document in the e-sign editor before sending.`
						: message,
				);
			}
		},
	},
	{
		name: "approve_contract",
		description:
			"Approve, reject, or request changes on a contract at its current approval step, with a comment. Requires contracts.approve. Confirms decision; audits; no role bypass.",
		requiredPermissions: [PERMISSIONS.CONTRACTS.APPROVE],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				contractId: { type: "string", description: "Contract document id" },
				query: { type: "string", description: "Contract name search" },
				decision: {
					type: "string",
					enum: ["approved", "changes_requested", "rejected"],
				},
				notes: {
					type: "string",
					description: "Required for rejected or changes_requested",
				},
			},
			required: ["decision"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.CONTRACTS.APPROVE])) {
				return asError(
					"You cannot approve contracts. Ask an admin for the contracts.approve permission.",
				);
			}
			const decision = String(args.decision ?? "") as
				| "approved"
				| "changes_requested"
				| "rejected";
			if (!["approved", "changes_requested", "rejected"].includes(decision)) {
				return asError(
					"decision must be one of: approved, changes_requested, rejected.",
				);
			}
			const found = await resolveOneContract(ctx, args);
			if (found.error || !found.contract) {
				return asError(found.error ?? "Contract not found.");
			}
			const contract = found.contract;
			const notes = args.notes ? String(args.notes).trim() : undefined;
			const viewerUserId =
				(ctx.user as { accountId?: string }).accountId || ctx.user.$id;

			try {
				const before = await getWorkflowForViewer(
					contract.contractId,
					viewerUserId,
					{ isAdminOverride: false },
				);
				if (
					!before.canDecideAsAssignee &&
					!before.canAdminOverrideActiveStep &&
					!before.canAdminOverrideCompleted
				) {
					return asError(
						"You are not the assignee for the current approval step on this contract.",
					);
				}
				if (decision === "rejected" && !before.canReject) {
					return asError("Rejecting is not allowed at this approval step.");
				}

				const outcome = await decide({
					contractId: contract.contractId,
					viewerUserId,
					decision,
					notes,
				});

				await logAuditEvent({
					event_id: `assistant_contract_approval_${contract.contractId}_${Date.now()}`,
					event_title: `Assistant recorded approval decision: ${contract.contractName}`,
					action: "update",
					source: "caalm",
					user_id: ctx.user.$id,
					user_name: actorName(ctx),
					user_email: ctx.user.email || "",
					status: "success",
					orgId: ctx.orgId,
					module: "contracts",
					target_type: "contract",
					target_id: contract.contractId,
					target_label: contract.contractName,
					summary: `${actorName(ctx)} recorded "${decision}" on "${contract.contractName}"`,
					metadata: { source: "ai_assistant", decision, notes },
				}).catch(() => undefined);

				return {
					result: {
						contractId: contract.contractId,
						decision,
						contractStatus: outcome.contractStatus,
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
		name: "renew_contract",
		description:
			"Renew a contract with a new expiry date, restarting approval. Requires contracts.edit. Confirm before writing; audits; never auto-renews without a human.",
		requiredPermissions: [PERMISSIONS.CONTRACTS.EDIT],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				contractId: { type: "string", description: "Contract document id" },
				query: { type: "string", description: "Contract name search" },
				newExpiryDate: { type: "string", description: "YYYY-MM-DD" },
				notes: { type: "string" },
			},
			required: ["newExpiryDate"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.CONTRACTS.EDIT])) {
				return asError(
					"You cannot edit contracts. Ask an admin for the contracts.edit permission.",
				);
			}
			const newExpiryDate = String(args.newExpiryDate ?? "").trim();
			if (!newExpiryDate || Number.isNaN(new Date(newExpiryDate).getTime())) {
				return asError("Give a valid new expiry date (YYYY-MM-DD).");
			}
			const found = await resolveOneContract(ctx, args);
			if (found.error || !found.contract) {
				return asError(found.error ?? "Contract not found.");
			}
			const contract = found.contract;

			try {
				await renewContractAfterExpiry({
					contractId: contract.contractId,
					orgId: ctx.orgId,
					newExpiryDate,
					notes: args.notes ? String(args.notes).trim() : undefined,
					renewedBy: ctx.user.$id,
					userName: actorName(ctx),
					userEmail: ctx.user.email || "",
				});
				return {
					result: {
						contractId: contract.contractId,
						newExpiryDate,
						renewed: true,
					},
				};
			} catch (error) {
				return asError(
					error instanceof Error
						? error.message
						: "Failed to renew this contract.",
				);
			}
		},
	},
];

/** Simple line-level diff between two versions' extracted text. */
function diffLines(
	a: string,
	b: string,
): { added: string[]; removed: string[]; unchangedCount: number } {
	// shortcut: caps each side at 2000 lines for an O(n*m) LCS; upgrade to a
	// streaming/word-diff library if contracts regularly exceed this.
	const MAX_LINES = 2000;
	const linesA = a.split("\n").slice(0, MAX_LINES);
	const linesB = b.split("\n").slice(0, MAX_LINES);
	const n = linesA.length;
	const m = linesB.length;
	const lcs: number[][] = Array.from({ length: n + 1 }, () =>
		new Array(m + 1).fill(0),
	);
	for (let i = n - 1; i >= 0; i--) {
		for (let j = m - 1; j >= 0; j--) {
			lcs[i][j] =
				linesA[i] === linesB[j]
					? lcs[i + 1][j + 1] + 1
					: Math.max(lcs[i + 1][j], lcs[i][j + 1]);
		}
	}
	const added: string[] = [];
	const removed: string[] = [];
	let unchangedCount = 0;
	let i = 0;
	let j = 0;
	while (i < n && j < m) {
		if (linesA[i] === linesB[j]) {
			unchangedCount++;
			i++;
			j++;
		} else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
			if (linesA[i].trim()) removed.push(linesA[i]);
			i++;
		} else {
			if (linesB[j].trim()) added.push(linesB[j]);
			j++;
		}
	}
	while (i < n) {
		if (linesA[i].trim()) removed.push(linesA[i]);
		i++;
	}
	while (j < m) {
		if (linesB[j].trim()) added.push(linesB[j]);
		j++;
	}
	return { added, removed, unchangedCount };
}
