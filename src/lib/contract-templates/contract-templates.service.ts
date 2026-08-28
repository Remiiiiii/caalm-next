import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { FileService } from "@/lib/api/contracts/services/FileService";
import { ContractTypeMapper } from "@/lib/api/contracts/services/ContractTypeMapper";
import { assertCanCreateContract } from "@/lib/billing/planLimits";
import { listClauses } from "@/lib/clauses/clause-library.service";
import { getContractTypeConfig } from "@/lib/contracts/contractTypeConfigs";
import type { Clause } from "@/types/clauses";
import {
	TEMPLATE_STATUSES,
	type AssembledClauseSnapshot,
	type ApplyTemplateResult,
	type ClauseRef,
	type ContractTemplate,
	type CreateTemplateInput,
	type ListTemplatesFilters,
	type TemplateStatus,
	type UpdateTemplateInput,
} from "@/types/contract-templates";

const CLAUSE_REFS_MAX = 8000;
const DESCRIPTION_MAX = 1000;
const KEY_OBLIGATION_MAX = 100;

export class TemplateApplyError extends Error {
	status: number;

	constructor(message: string, status = 400) {
		super(message);
		this.name = "TemplateApplyError";
		this.status = status;
	}
}

export function isTemplateStatus(value: unknown): value is TemplateStatus {
	return (
		typeof value === "string" &&
		(TEMPLATE_STATUSES as readonly string[]).includes(value)
	);
}

export function isValidContractTypeId(value: unknown): value is string {
	return typeof value === "string" && Boolean(getContractTypeConfig(value));
}

function tableId(): string {
	return appwriteConfig.contractTemplatesCollectionId || "69c8f502001b3c4d5e02";
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

export function parseClauseRefs(raw: unknown): ClauseRef[] {
	if (typeof raw !== "string" || !raw.trim()) {
		throw new Error("clauseRefs is required");
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error("clauseRefs must be valid JSON");
	}
	if (!Array.isArray(parsed) || parsed.length === 0) {
		throw new Error("Add at least one clause");
	}

	const refs: ClauseRef[] = [];
	const seen = new Set<string>();
	for (const item of parsed) {
		if (!item || typeof item !== "object") {
			throw new Error("Each clause ref must be an object");
		}
		const familyId = String(
			(item as { familyId?: unknown }).familyId || "",
		).trim();
		const sortOrder = Number((item as { sortOrder?: unknown }).sortOrder);
		if (!familyId) throw new Error("Each clause ref needs a familyId");
		if (!Number.isFinite(sortOrder)) {
			throw new Error("Each clause ref needs a sortOrder");
		}
		if (seen.has(familyId)) {
			throw new Error("Duplicate clause family in template");
		}
		seen.add(familyId);
		refs.push({ familyId, sortOrder });
	}

	return refs.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function serializeClauseRefs(refs: ClauseRef[]): string {
	const normalized = parseClauseRefs(JSON.stringify(refs));
	const encoded = JSON.stringify(normalized);
	if (encoded.length > CLAUSE_REFS_MAX) {
		throw new Error("Too many clauses on this template");
	}
	return encoded;
}

export function assembleTemplateDocument(input: {
	templateTitle: string;
	clauses: AssembledClauseSnapshot[];
}): string {
	const heading = `# ${input.templateTitle.trim() || "Contract"}`;
	const intro =
		"Assembled from the clause library. Wording is snapshotted at apply time.";
	const sections = input.clauses.map((clause, index) => {
		const title = clause.title.trim() || `Clause ${index + 1}`;
		return `## ${index + 1}. ${title}\n\n_Category: ${clause.category} · Version ${clause.version} · ${clause.clauseId}_\n\n${clause.body.trim()}`;
	});
	return [heading, intro, ...sections].join("\n\n");
}

export function snapshotsFromClauses(
	clauses: Clause[],
): AssembledClauseSnapshot[] {
	return clauses.map((clause) => ({
		clauseId: clause.$id,
		familyId: clause.familyId,
		version: clause.version,
		title: clause.title,
		category: clause.category,
		body: clause.body,
	}));
}

export function resolveActiveClausesForRefs(
	refs: ClauseRef[],
	activeCurrent: Clause[],
): Clause[] {
	if (refs.length === 0) {
		throw new TemplateApplyError("Add at least one clause");
	}
	const byFamily = new Map<string, Clause>();
	for (const clause of activeCurrent) {
		if (
			clause.status === "active" &&
			clause.isCurrent &&
			!byFamily.has(clause.familyId)
		) {
			byFamily.set(clause.familyId, clause);
		}
	}

	const resolved: Clause[] = [];
	const missing: string[] = [];
	for (const ref of refs) {
		const clause = byFamily.get(ref.familyId);
		if (!clause) {
			missing.push(ref.familyId);
			continue;
		}
		resolved.push(clause);
	}
	if (missing.length > 0) {
		throw new TemplateApplyError(
			"Every clause on this template must have a current active version",
		);
	}
	return resolved;
}

export function buildApplyContractPayload(input: {
	template: Pick<ContractTemplate, "$id" | "title" | "contractTypeId">;
	contractName: string;
	orgId: string;
	userId: string;
	fileId: string;
	clauses: AssembledClauseSnapshot[];
}): Record<string, unknown> {
	const typeConfig = getContractTypeConfig(input.template.contractTypeId);
	const mappedType = ContractTypeMapper.map(typeConfig?.label);
	const description =
		`Assembled from ${input.template.title} (${input.clauses.length} clauses).`.slice(
			0,
			DESCRIPTION_MAX,
		);

	// Contracts.contractExpiryDate is required in Appwrite (same default as ContractService).
	const contractExpiryDate = new Date().toISOString().split("T")[0];

	return {
		contractName: input.contractName.slice(0, 255),
		orgId: input.orgId,
		lifecycleStatus: "draft",
		status: "pending-review",
		description,
		contractOwnerId: input.userId,
		contractType: mappedType,
		templateUsed: input.template.$id.slice(0, 255),
		keyObligations: input.clauses.map((clause) =>
			clause.title.slice(0, KEY_OBLIGATION_MAX),
		),
		fileId: input.fileId,
		currencyCode: "USD",
		priority: "Medium",
		contractExpiryDate,
		// Required Appwrite scalars that the upload wizard normally fills.
		contractNumber: `TPL-${input.template.$id}`.slice(0, 50),
		department: "Administration",
		amount: 0,
	};
}

function mapRow(row: Record<string, unknown>): ContractTemplate {
	return {
		$id: String(row.$id),
		$createdAt: String(row.$createdAt || ""),
		$updatedAt: String(row.$updatedAt || ""),
		orgId: String(row.orgId || ""),
		title: String(row.title || ""),
		description: row.description ? String(row.description) : undefined,
		status: isTemplateStatus(row.status) ? row.status : "draft",
		contractTypeId: String(row.contractTypeId || ""),
		clauseRefs: parseClauseRefs(row.clauseRefs),
		createdBy: String(row.createdBy || ""),
		updatedBy: String(row.updatedBy || ""),
	};
}

export function buildListQueries(filters: ListTemplatesFilters): string[] {
	const queries = [Query.equal("orgId", filters.orgId)];
	if (filters.status) {
		queries.push(Query.equal("status", filters.status));
	} else {
		queries.push(Query.notEqual("status", "archived"));
	}
	queries.push(Query.orderDesc("$updatedAt"));
	queries.push(Query.limit(filters.limit ?? 200));
	return queries;
}

export function buildCreateTemplateData(
	input: CreateTemplateInput,
	ctx: { orgId: string; userId: string },
): Record<string, unknown> {
	const title = input.title.trim();
	if (!title) throw new Error("title is required");
	if (!isValidContractTypeId(input.contractTypeId)) {
		throw new Error("Invalid contract type");
	}
	const status = input.status ?? "draft";
	if (status === "archived") {
		throw new Error("Cannot create an archived template");
	}

	return {
		orgId: ctx.orgId,
		title,
		description: input.description?.trim() || null,
		status,
		contractTypeId: input.contractTypeId,
		clauseRefs: serializeClauseRefs(input.clauseRefs),
		createdBy: ctx.userId,
		updatedBy: ctx.userId,
	};
}

export function planTemplateUpdate(
	template: ContractTemplate,
	input: UpdateTemplateInput,
	userId: string,
): { rowId: string; patch: Record<string, unknown> } {
	const title = input.title != null ? input.title.trim() : template.title;
	if (!title) throw new Error("title is required");

	const contractTypeId = input.contractTypeId ?? template.contractTypeId;
	if (!isValidContractTypeId(contractTypeId)) {
		throw new Error("Invalid contract type");
	}

	const status = input.status ?? template.status;
	if (!isTemplateStatus(status)) {
		throw new Error("Invalid status");
	}
	if (template.status === "archived" && status !== "archived") {
		throw new Error("Archived templates cannot be restored from this screen");
	}

	const refs = input.clauseRefs ?? template.clauseRefs;
	const description =
		input.description !== undefined
			? input.description.trim() || null
			: template.description || null;

	return {
		rowId: template.$id,
		patch: {
			title,
			description,
			status,
			contractTypeId,
			clauseRefs: serializeClauseRefs(refs),
			updatedBy: userId,
		},
	};
}

export function planTemplateArchive(
	template: ContractTemplate,
	userId: string,
): { rowId: string; patch: Record<string, unknown> } {
	return {
		rowId: template.$id,
		patch: {
			status: "archived",
			updatedBy: userId,
		},
	};
}

function matchesSearch(template: ContractTemplate, search?: string): boolean {
	const q = search?.trim().toLowerCase();
	if (!q) return true;
	return (
		template.title.toLowerCase().includes(q) ||
		(template.description || "").toLowerCase().includes(q)
	);
}

export async function listTemplates(
	filters: ListTemplatesFilters,
): Promise<ContractTemplate[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries: buildListQueries(filters),
	});
	return (result.rows as unknown as Record<string, unknown>[])
		.map(mapRow)
		.filter((template) => matchesSearch(template, filters.search));
}

export async function getTemplateById(
	id: string,
): Promise<ContractTemplate | null> {
	try {
		const { tablesDB } = await createAdminClient();
		const row = await tablesDB.getRow({
			databaseId: dbId(),
			tableId: tableId(),
			rowId: id,
		});
		return mapRow(row as unknown as Record<string, unknown>);
	} catch {
		return null;
	}
}

export async function createTemplate(input: {
	orgId: string;
	userId: string;
	data: CreateTemplateInput;
}): Promise<ContractTemplate> {
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: ID.unique(),
		data: buildCreateTemplateData(input.data, {
			orgId: input.orgId,
			userId: input.userId,
		}),
	});
	return mapRow(row as unknown as Record<string, unknown>);
}

export async function updateTemplate(input: {
	template: ContractTemplate;
	userId: string;
	data: UpdateTemplateInput;
}): Promise<ContractTemplate> {
	const plan = planTemplateUpdate(input.template, input.data, input.userId);
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: plan.rowId,
		data: plan.patch,
	});
	return mapRow(row as unknown as Record<string, unknown>);
}

export async function archiveTemplate(input: {
	template: ContractTemplate;
	userId: string;
}): Promise<ContractTemplate> {
	const plan = planTemplateArchive(input.template, input.userId);
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: plan.rowId,
		data: plan.patch,
	});
	return mapRow(row as unknown as Record<string, unknown>);
}

export async function countTemplatesUsingFamily(input: {
	orgId: string;
	familyId: string;
}): Promise<number> {
	const templates = await listTemplates({ orgId: input.orgId });
	return templates.filter((template) =>
		template.clauseRefs.some((ref) => ref.familyId === input.familyId),
	).length;
}

function fileNameForTemplate(title: string, templateId: string): string {
	const slug =
		title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "")
			.slice(0, 40) || "contract";
	return `${slug}-${templateId.slice(0, 8)}.md`;
}

export async function applyTemplateToDraft(input: {
	template: ContractTemplate;
	orgId: string;
	userId: string;
	accountId: string;
	contractName?: string;
}): Promise<ApplyTemplateResult> {
	if (input.template.orgId !== input.orgId) {
		throw new TemplateApplyError("Template not found", 404);
	}
	if (input.template.status !== "active") {
		throw new TemplateApplyError("Publish the template before using it");
	}

	const activeClauses = await listClauses({
		orgId: input.orgId,
		status: "active",
		currentOnly: true,
		limit: 200,
	});
	const resolved = resolveActiveClausesForRefs(
		input.template.clauseRefs,
		activeClauses,
	);
	const snapshots = snapshotsFromClauses(resolved);
	const contractName =
		input.contractName?.trim() || input.template.title.trim();
	if (!contractName) {
		throw new TemplateApplyError("contractName is required");
	}

	await assertCanCreateContract(input.orgId);

	const markdown = assembleTemplateDocument({
		templateTitle: contractName,
		clauses: snapshots,
	});
	const buffer = Buffer.from(markdown, "utf8");
	const fileName = fileNameForTemplate(contractName, input.template.$id);
	const bucketFileId = await FileService.uploadFileToStorage(buffer, fileName);
	const fileRow = await FileService.createOrUpdateFileRow(
		input.userId,
		input.accountId,
		{
			name: fileName,
			size: buffer.byteLength,
			bucketFileId,
			contractName,
		},
	);
	const fileId = String(fileRow.$id);

	const { tablesDB } = await createAdminClient();
	const contractsTable =
		appwriteConfig.contractsCollectionId || "test-contracts";
	const contractId = ID.unique();
	const payload = buildApplyContractPayload({
		template: input.template,
		contractName,
		orgId: input.orgId,
		userId: input.userId,
		fileId,
		clauses: snapshots,
	});

	await tablesDB.createRow({
		databaseId: dbId(),
		tableId: contractsTable,
		rowId: contractId,
		data: payload,
	});

	try {
		await tablesDB.updateRow({
			databaseId: dbId(),
			tableId: appwriteConfig.filesCollectionId || "test-files",
			rowId: fileId,
			data: { contractId },
		});
	} catch {
		// File row still exists; contract is the source of truth for apply.
	}

	return {
		contractId,
		templateId: input.template.$id,
		fileId,
	};
}
