import { PERMISSIONS } from "@/constants/permissions";
import { answerContractQuestion } from "@/lib/ai/contract-assistant";
import { ContractFieldUpdateService } from "@/lib/api/contracts/services/ContractFieldUpdateService";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { hasAll, searchContractsTable } from "@/lib/assistant/tools/toolUtils";
import type { ToolContext, ToolDefinition } from "@/lib/assistant/tools/types";
import { parsePdfBuffer } from "@/lib/files/pdf-text";
import { logAuditEvent } from "@/lib/services/audit-logger";
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
];
