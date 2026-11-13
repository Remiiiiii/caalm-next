import { PERMISSIONS } from "@/constants/permissions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { hasAll, searchContractsTable } from "@/lib/assistant/tools/toolUtils";
import type { ToolContext, ToolDefinition } from "@/lib/assistant/tools/types";
import {
	archiveClause,
	createClause,
	getClauseById,
	isClauseCategory,
	listClauses,
	updateClause,
} from "@/lib/clauses/clause-library.service";
import { parsePdfBuffer } from "@/lib/files/pdf-text";
import { extractClausesWithGemini } from "@/lib/playbook/compare-with-gemini";
import { logAuditEvent } from "@/lib/services/audit-logger";
import {
	archiveTemplate,
	createTemplate,
	getTemplateById,
	listTemplates,
	updateTemplate,
} from "@/lib/templates/contract-template.service";
import {
	getWizardSession,
	getWizardSessionForContract,
	saveWizardSession,
} from "@/lib/templates/wizard.service";
import { constructFileUrl } from "@/lib/utils";
import type { Clause } from "@/types/clauses";
import type { ContractTemplate } from "@/types/contract-templates";

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

async function auditLibrary(
	ctx: ToolContext,
	opts: {
		action: "create" | "update" | "delete";
		eventKey: string;
		title: string;
		summary: string;
		targetType: "clause" | "contract_template";
		targetId: string;
		targetLabel: string;
		metadata?: Record<string, unknown>;
	},
) {
	await logAuditEvent({
		event_id: `assistant_${opts.eventKey}_${opts.targetId}_${Date.now()}`,
		event_title: opts.title,
		action: opts.action,
		source: "caalm",
		user_id: ctx.user.$id,
		user_name: actorName(ctx),
		user_email: ctx.user.email || "",
		status: "success",
		orgId: ctx.orgId,
		module: "governance",
		target_type: opts.targetType,
		target_id: opts.targetId,
		target_label: opts.targetLabel,
		summary: opts.summary,
		metadata: { source: "ai_assistant", ...opts.metadata },
	}).catch(() => undefined);
}

/** Resolve exactly one org-scoped clause by id or fuzzy title/body search. */
async function resolveOneClause(
	ctx: ToolContext,
	args: { clauseId?: unknown; query?: unknown },
): Promise<{ clause?: Clause; error?: string }> {
	const clauseId = String(args.clauseId ?? "").trim();
	if (clauseId) {
		const clause = await getClauseById(clauseId);
		if (!clause || clause.orgId !== ctx.orgId) {
			return { error: `No clause found with id "${clauseId}".` };
		}
		return { clause };
	}
	const query = String(args.query ?? "").trim();
	if (!query) return { error: "Which clause? Give a title or id." };

	const matches = await listClauses({
		orgId: ctx.orgId,
		search: query,
		currentOnly: true,
	});
	if (matches.length === 0) return { error: `No clauses match "${query}".` };
	if (matches.length > 1) {
		return {
			error: `Several clauses match "${query}": ${matches
				.slice(0, 3)
				.map((m) => m.title)
				.join(", ")}. Be more specific or use the clause id.`,
		};
	}
	return { clause: matches[0] };
}

/** Resolve exactly one org-scoped contract template by id or fuzzy name search. */
async function resolveOneTemplate(
	ctx: ToolContext,
	args: { templateId?: unknown; query?: unknown },
): Promise<{ template?: ContractTemplate; error?: string }> {
	const templateId = String(args.templateId ?? "").trim();
	if (templateId) {
		const template = await getTemplateById(templateId);
		if (!template || template.orgId !== ctx.orgId) {
			return { error: `No template found with id "${templateId}".` };
		}
		return { template };
	}
	const query = String(args.query ?? "").trim();
	if (!query) return { error: "Which template? Give a name or id." };

	const matches = await listTemplates({ orgId: ctx.orgId, search: query });
	if (matches.length === 0) return { error: `No templates match "${query}".` };
	if (matches.length > 1) {
		return {
			error: `Several templates match "${query}": ${matches
				.slice(0, 3)
				.map((m) => m.name)
				.join(", ")}. Be more specific or use the template id.`,
		};
	}
	return { template: matches[0] };
}

/** Minimal org-scoped contract file lookup, mirroring contractTools.ts's fetchContractDetail. */
async function resolveContractFile(
	ctx: ToolContext,
	args: { contractId?: unknown; query?: unknown },
): Promise<{
	contractId?: string;
	contractName?: string;
	fileUrl?: string;
	error?: string;
}> {
	let contractId = String(args.contractId ?? "").trim();
	if (!contractId) {
		const query = String(args.query ?? "").trim();
		if (!query) return { error: "Which contract? Give a name or id." };
		const matches = await searchContractsTable(ctx, query);
		if (matches.length === 0)
			return { error: `No contracts match "${query}".` };
		if (matches.length > 1) {
			return {
				error: `Several contracts match "${query}": ${matches
					.slice(0, 3)
					.map((m) => m.name)
					.join(", ")}. Be more specific or use the contract id.`,
			};
		}
		contractId = String(matches[0].id);
	}

	const { tablesDB } = await createAdminClient();
	const databaseId = appwriteConfig.databaseId || "default-db";
	const contract = (await tablesDB
		.getRow({
			databaseId,
			tableId: appwriteConfig.contractsCollectionId || "contracts",
			rowId: contractId,
		})
		.catch(() => null)) as Record<string, unknown> | null;
	if (!contract || String(contract.orgId || "") !== ctx.orgId) {
		return { error: `No contract found with id "${contractId}".` };
	}
	const contractName = String(contract.contractName || "Contract");
	if (!contract.fileId) {
		return {
			contractId,
			contractName,
			error: `"${contractName}" has no attached document to pull clauses from.`,
		};
	}
	let fileUrl = "";
	try {
		const fileDoc = await tablesDB.getRow({
			databaseId,
			tableId: appwriteConfig.filesCollectionId || "files",
			rowId: String(contract.fileId),
		});
		fileUrl = String(fileDoc?.url || constructFileUrl(String(contract.fileId)));
	} catch {
		fileUrl = constructFileUrl(String(contract.fileId));
	}
	return { contractId, contractName, fileUrl };
}

export const CLAUSE_TOOLS: ToolDefinition[] = [
	{
		name: "search_clauses",
		description:
			"Find approved clause language in the library, or return one clause by id. Requires clauses.view. Read-only; org-scoped.",
		requiredPermissions: [PERMISSIONS.CLAUSES.VIEW],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				clauseId: { type: "string", description: "Clause document id" },
				query: { type: "string", description: "Title or body text search" },
				category: { type: "string" },
				status: { type: "string", enum: ["draft", "active", "archived"] },
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.CLAUSES.VIEW])) {
				return asError(
					"You cannot view clauses. Ask an admin for the clauses.view permission.",
				);
			}
			const clauseId = String(args.clauseId ?? "").trim();
			if (clauseId) {
				const clause = await getClauseById(clauseId);
				if (!clause || clause.orgId !== ctx.orgId) {
					return asError(`No clause found with id "${clauseId}".`);
				}
				return { result: { clause } };
			}
			const category = isClauseCategory(args.category)
				? args.category
				: undefined;
			const status =
				args.status === "draft" ||
				args.status === "active" ||
				args.status === "archived"
					? args.status
					: undefined;
			try {
				const clauses = await listClauses({
					orgId: ctx.orgId,
					search: args.query ? String(args.query) : undefined,
					category,
					status,
					currentOnly: true,
				});
				return { result: { clauses, count: clauses.length } };
			} catch (error) {
				return asError(
					error instanceof Error
						? error.message
						: "Failed to search the clause library.",
				);
			}
		},
	},
	{
		name: "create_clause",
		description:
			"Create a clause, update one (with clauseId/query), or retire one (with archive: true). Requires clauses.create (updating/retiring needs clauses.edit/clauses.delete). Confirm before writing; audits; org-scoped.",
		requiredPermissions: [PERMISSIONS.CLAUSES.CREATE],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				clauseId: {
					type: "string",
					description: "Existing clause id to update/retire",
				},
				query: { type: "string", description: "Existing clause title search" },
				archive: { type: "boolean", description: "Retire this clause" },
				title: { type: "string" },
				category: { type: "string" },
				body: { type: "string" },
				status: { type: "string", enum: ["draft", "active"] },
				changeNote: { type: "string" },
			},
		},
		handler: async (ctx, args) => {
			const hasTarget = Boolean(
				String(args.clauseId ?? "").trim() || String(args.query ?? "").trim(),
			);

			try {
				if (args.archive === true) {
					if (!hasTarget) {
						return asError("Give the clause id or title to retire.");
					}
					if (!hasAll(ctx, [PERMISSIONS.CLAUSES.DELETE])) {
						return asError(
							"You cannot retire clauses. Ask an admin for the clauses.delete permission.",
						);
					}
					const found = await resolveOneClause(ctx, args);
					if (found.error || !found.clause) {
						return asError(found.error ?? "Clause not found.");
					}
					const archived = await archiveClause({
						clause: found.clause,
						userId: ctx.user.$id,
					});
					await auditLibrary(ctx, {
						action: "delete",
						eventKey: "clause_retire",
						title: `Assistant retired clause: ${archived.title}`,
						summary: `${actorName(ctx)} retired clause "${archived.title}"`,
						targetType: "clause",
						targetId: archived.$id,
						targetLabel: archived.title,
					});
					return {
						result: {
							clauseId: archived.$id,
							title: archived.title,
							retired: true,
						},
					};
				}

				if (hasTarget) {
					if (!hasAll(ctx, [PERMISSIONS.CLAUSES.EDIT])) {
						return asError(
							"You cannot edit clauses. Ask an admin for the clauses.edit permission.",
						);
					}
					const found = await resolveOneClause(ctx, args);
					if (found.error || !found.clause) {
						return asError(found.error ?? "Clause not found.");
					}
					const updated = await updateClause({
						clause: found.clause,
						userId: ctx.user.$id,
						data: {
							title: args.title ? String(args.title) : undefined,
							category: isClauseCategory(args.category)
								? args.category
								: undefined,
							body: args.body ? String(args.body) : undefined,
							status:
								args.status === "draft" || args.status === "active"
									? args.status
									: undefined,
							changeNote: args.changeNote ? String(args.changeNote) : undefined,
						},
					});
					await auditLibrary(ctx, {
						action: "update",
						eventKey: "clause_update",
						title: `Assistant updated clause: ${updated.title}`,
						summary: `${actorName(ctx)} updated clause "${updated.title}"`,
						targetType: "clause",
						targetId: updated.$id,
						targetLabel: updated.title,
					});
					return {
						result: {
							clauseId: updated.$id,
							title: updated.title,
							updated: true,
						},
					};
				}

				if (!hasAll(ctx, [PERMISSIONS.CLAUSES.CREATE])) {
					return asError(
						"You cannot create clauses. Ask an admin for the clauses.create permission.",
					);
				}
				if (!isClauseCategory(args.category)) {
					return asError("Give a valid clause category.");
				}
				const created = await createClause({
					orgId: ctx.orgId,
					userId: ctx.user.$id,
					data: {
						title: String(args.title ?? ""),
						category: args.category,
						body: String(args.body ?? ""),
						status: args.status === "active" ? "active" : "draft",
						changeNote: args.changeNote ? String(args.changeNote) : undefined,
					},
				});
				await auditLibrary(ctx, {
					action: "create",
					eventKey: "clause_create",
					title: `Assistant created clause: ${created.title}`,
					summary: `${actorName(ctx)} created clause "${created.title}"`,
					targetType: "clause",
					targetId: created.$id,
					targetLabel: created.title,
				});
				return {
					result: {
						clauseId: created.$id,
						title: created.title,
						created: true,
					},
				};
			} catch (error) {
				return asError(
					error instanceof Error
						? error.message
						: "Failed to save this clause.",
				);
			}
		},
	},
	{
		name: "insert_clause_into_draft",
		description:
			"Insert an approved clause into an in-progress contract draft (wizard session). Requires contracts.edit. Confirm before writing; audits.",
		requiredPermissions: [PERMISSIONS.CONTRACTS.EDIT],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				sessionId: { type: "string", description: "Wizard draft session id" },
				contractId: {
					type: "string",
					description: "Contract id whose draft session to use",
				},
				clauseId: { type: "string", description: "Clause document id" },
				query: { type: "string", description: "Clause title search" },
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.CONTRACTS.EDIT])) {
				return asError(
					"You cannot edit contracts. Ask an admin for the contracts.edit permission.",
				);
			}
			const sessionId = String(args.sessionId ?? "").trim();
			const contractId = String(args.contractId ?? "").trim();
			if (!sessionId && !contractId) {
				return asError("Give the draft's session id or contract id.");
			}
			const foundClause = await resolveOneClause(ctx, args);
			if (foundClause.error || !foundClause.clause) {
				return asError(foundClause.error ?? "Clause not found.");
			}
			const clause = foundClause.clause;

			try {
				const session = sessionId
					? await getWizardSession(sessionId)
					: await getWizardSessionForContract({ contractId, orgId: ctx.orgId });
				if (!session || session.orgId !== ctx.orgId) {
					return asError("Draft session not found in this organization.");
				}
				if (
					session.payload.sections.some((s) => s.familyId === clause.familyId)
				) {
					return asError("This clause is already included in this draft.");
				}

				const payload = {
					...session.payload,
					sections: [
						...session.payload.sections,
						{
							familyId: clause.familyId,
							source: "injected" as const,
							required: false,
							enabled: true,
						},
					],
				};
				await saveWizardSession({
					session,
					orgId: ctx.orgId,
					userId: session.userId,
					payload,
					currentStep: session.currentStep,
				});

				await auditLibrary(ctx, {
					action: "update",
					eventKey: "clause_insert",
					title: `Assistant inserted a clause into a draft: ${clause.title}`,
					summary: `${actorName(ctx)} inserted clause "${clause.title}" into draft session "${session.$id}"`,
					targetType: "clause",
					targetId: clause.$id,
					targetLabel: clause.title,
					metadata: { sessionId: session.$id, contractId: session.contractId },
				});
				return {
					result: {
						sessionId: session.$id,
						clauseId: clause.$id,
						title: clause.title,
						inserted: true,
					},
				};
			} catch (error) {
				return asError(
					error instanceof Error
						? error.message
						: "Failed to insert this clause into the draft.",
				);
			}
		},
	},
	{
		name: "list_contract_templates",
		description:
			"List contract templates, or create/update/retire one with action. Requires contract_templates.view (create/update/retire need the matching permission). Confirm before writing; audits.",
		requiredPermissions: [],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				action: {
					type: "string",
					enum: ["list", "create", "update", "archive"],
					description: "Default: list",
				},
				templateId: { type: "string" },
				query: { type: "string", description: "Name search" },
				status: { type: "string", enum: ["draft", "published", "archived"] },
				contractType: { type: "string" },
				name: { type: "string" },
				description: { type: "string" },
				clauseSlots: {
					type: "array",
					items: { type: "object" },
					description: "[{familyId, required}]",
				},
				scratchAgreement: { type: "boolean" },
			},
		},
		handler: async (ctx, args) => {
			const action = String(args.action ?? "list");

			try {
				if (action === "list") {
					if (!hasAll(ctx, [PERMISSIONS.CONTRACT_TEMPLATES.VIEW])) {
						return asError(
							"You cannot view templates. Ask an admin for the contract_templates.view permission.",
						);
					}
					const templates = await listTemplates({
						orgId: ctx.orgId,
						status:
							args.status === "draft" ||
							args.status === "published" ||
							args.status === "archived"
								? args.status
								: undefined,
						contractType: args.contractType
							? String(args.contractType)
							: undefined,
						search: args.query ? String(args.query) : undefined,
					});
					return { result: { templates, count: templates.length } };
				}

				if (action === "create") {
					if (!hasAll(ctx, [PERMISSIONS.CONTRACT_TEMPLATES.CREATE])) {
						return asError(
							"You cannot create templates. Ask an admin for the contract_templates.create permission.",
						);
					}
					const created = await createTemplate({
						orgId: ctx.orgId,
						userId: ctx.user.$id,
						data: {
							name: String(args.name ?? ""),
							description: args.description
								? String(args.description)
								: undefined,
							contractType: String(args.contractType ?? ""),
							status: args.status === "published" ? "published" : "draft",
							clauseSlots: Array.isArray(args.clauseSlots)
								? (args.clauseSlots as never)
								: undefined,
							scratchAgreement: Boolean(args.scratchAgreement),
						},
					});
					await auditLibrary(ctx, {
						action: "create",
						eventKey: "template_create",
						title: `Assistant created template: ${created.name}`,
						summary: `${actorName(ctx)} created template "${created.name}"`,
						targetType: "contract_template",
						targetId: created.$id,
						targetLabel: created.name,
					});
					return {
						result: {
							templateId: created.$id,
							name: created.name,
							created: true,
						},
					};
				}

				if (action === "update") {
					if (!hasAll(ctx, [PERMISSIONS.CONTRACT_TEMPLATES.EDIT])) {
						return asError(
							"You cannot edit templates. Ask an admin for the contract_templates.edit permission.",
						);
					}
					const found = await resolveOneTemplate(ctx, args);
					if (found.error || !found.template) {
						return asError(found.error ?? "Template not found.");
					}
					const updated = await updateTemplate({
						template: found.template,
						userId: ctx.user.$id,
						data: {
							name: args.name ? String(args.name) : undefined,
							description:
								args.description !== undefined
									? String(args.description)
									: undefined,
							contractType: args.contractType
								? String(args.contractType)
								: undefined,
							status:
								args.status === "draft" || args.status === "published"
									? args.status
									: undefined,
							clauseSlots: Array.isArray(args.clauseSlots)
								? (args.clauseSlots as never)
								: undefined,
						},
					});
					await auditLibrary(ctx, {
						action: "update",
						eventKey: "template_update",
						title: `Assistant updated template: ${updated.name}`,
						summary: `${actorName(ctx)} updated template "${updated.name}"`,
						targetType: "contract_template",
						targetId: updated.$id,
						targetLabel: updated.name,
					});
					return {
						result: {
							templateId: updated.$id,
							name: updated.name,
							updated: true,
						},
					};
				}

				// action === "archive"
				if (!hasAll(ctx, [PERMISSIONS.CONTRACT_TEMPLATES.DELETE])) {
					return asError(
						"You cannot retire templates. Ask an admin for the contract_templates.delete permission.",
					);
				}
				const found = await resolveOneTemplate(ctx, args);
				if (found.error || !found.template) {
					return asError(found.error ?? "Template not found.");
				}
				const archived = await archiveTemplate({
					template: found.template,
					userId: ctx.user.$id,
				});
				await auditLibrary(ctx, {
					action: "delete",
					eventKey: "template_archive",
					title: `Assistant retired template: ${archived.name}`,
					summary: `${actorName(ctx)} retired template "${archived.name}"`,
					targetType: "contract_template",
					targetId: archived.$id,
					targetLabel: archived.name,
				});
				return {
					result: {
						templateId: archived.$id,
						name: archived.name,
						retired: true,
					},
				};
			} catch (error) {
				return asError(
					error instanceof Error
						? error.message
						: "Failed to process this template.",
				);
			}
		},
	},
	{
		name: "seed_clause_from_document",
		description:
			"Pull candidate clause language from an uploaded contract's document for review. Requires clauses.create. Never auto-saves — use create_clause to save any you confirm.",
		requiredPermissions: [PERMISSIONS.CLAUSES.CREATE],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				contractId: { type: "string", description: "Contract document id" },
				query: { type: "string", description: "Contract name search" },
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.CLAUSES.CREATE])) {
				return asError(
					"You cannot create clauses. Ask an admin for the clauses.create permission.",
				);
			}
			const found = await resolveContractFile(ctx, args);
			if (found.error || !found.fileUrl) {
				return asError(
					found.error ?? "Could not load that contract's document.",
				);
			}
			try {
				const response = await fetch(found.fileUrl);
				if (!response.ok) {
					return asError("Could not download the contract document.");
				}
				const buffer = Buffer.from(await response.arrayBuffer());
				const parsed = await parsePdfBuffer(buffer);
				const candidates = await extractClausesWithGemini(
					parsed.pageTexts.map((p) => p.text).join("\n\n"),
				);
				return {
					result: {
						contractId: found.contractId,
						candidates,
						message:
							"Review these clauses — nothing was saved. Use create_clause to save any you confirm.",
					},
				};
			} catch (error) {
				return asError(
					error instanceof Error
						? error.message
						: "Failed to extract clauses from that document.",
				);
			}
		},
	},
];
