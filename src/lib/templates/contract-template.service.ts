import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { TEMPLATE_TABLE_IDS } from "@/lib/templates/constants";
import {
	BLUEPRINT_IDS,
	type BlueprintId,
	type ClauseSlot,
	CONDITION_OPS,
	type ContractTemplate,
	type CreateTemplateInput,
	type ListTemplatesFilters,
	MERGE_FIELD_KEYS,
	type SlotCondition,
	TEMPLATE_STATUSES,
	type TemplateStatus,
	type UpdateTemplateInput,
} from "@/types/contract-templates";
import {
	persistScratchAgreementDocx,
	SCRATCH_AGREEMENT_BLUEPRINT_ID,
} from "@/lib/templates/scratch-agreement";

export function isTemplateStatus(value: unknown): value is TemplateStatus {
	return (
		typeof value === "string" &&
		(TEMPLATE_STATUSES as readonly string[]).includes(value)
	);
}

function tableId(): string {
	return (
		appwriteConfig.contractTemplatesCollectionId || TEMPLATE_TABLE_IDS.templates
	);
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

export function parseClauseSlots(raw: unknown): ClauseSlot[] {
	let parsed: unknown = raw;
	if (typeof raw === "string") {
		if (!raw.trim()) return [];
		try {
			parsed = JSON.parse(raw);
		} catch {
			throw new Error("clauseSlots must be valid JSON");
		}
	}
	if (!Array.isArray(parsed)) {
		throw new Error("clauseSlots must be an array");
	}

	return parsed.map((item, index) => {
		if (!item || typeof item !== "object") {
			throw new Error(`clauseSlots[${index}] is invalid`);
		}
		const row = item as Record<string, unknown>;
		const familyId = String(row.familyId || "").trim();
		if (!familyId) {
			throw new Error(`clauseSlots[${index}].familyId is required`);
		}
		const slot: ClauseSlot = {
			familyId,
			required: row.required !== false,
		};
		if (row.condition && typeof row.condition === "object") {
			const condition = row.condition as Record<string, unknown>;
			const field = String(condition.field || "");
			const op = String(condition.op || "");
			if (
				!(MERGE_FIELD_KEYS as readonly string[]).includes(field) &&
				field !== "amountNumber"
			) {
				throw new Error(`clauseSlots[${index}] has an unknown condition field`);
			}
			if (!(CONDITION_OPS as readonly string[]).includes(op)) {
				throw new Error(`clauseSlots[${index}] has an unknown condition op`);
			}
			slot.condition = {
				field: field as SlotCondition["field"],
				op: op as SlotCondition["op"],
				value: String(condition.value ?? ""),
			};
		}
		return slot;
	});
}

export function stringifyClauseSlots(slots: ClauseSlot[]): string {
	return JSON.stringify(slots);
}

function isBlueprintId(value: string): value is BlueprintId {
	return (BLUEPRINT_IDS as readonly string[]).includes(value);
}

function mapRow(row: Record<string, unknown>): ContractTemplate {
	const blueprintRaw =
		typeof row.blueprintId === "string" ? row.blueprintId.trim() : "";
	return {
		$id: String(row.$id),
		$createdAt: String(row.$createdAt || ""),
		$updatedAt: String(row.$updatedAt || ""),
		orgId: String(row.orgId || ""),
		name: String(row.name || ""),
		description: String(row.description || ""),
		contractType: String(row.contractType || "other"),
		status: isTemplateStatus(row.status) ? row.status : "draft",
		clauseSlots: parseClauseSlots(row.clauseSlots),
		blueprintId: isBlueprintId(blueprintRaw) ? blueprintRaw : null,
		docxFileId:
			typeof row.docxFileId === "string" && row.docxFileId.trim()
				? row.docxFileId.trim()
				: null,
		createdBy: String(row.createdBy || ""),
		updatedBy: String(row.updatedBy || ""),
	};
}

export function buildListTemplateQueries(
	filters: ListTemplatesFilters,
): string[] {
	const queries = [Query.equal("orgId", filters.orgId)];
	if (filters.status) {
		queries.push(Query.equal("status", filters.status));
	}
	if (filters.contractType) {
		queries.push(Query.equal("contractType", filters.contractType));
	}
	queries.push(Query.orderDesc("$updatedAt"));
	queries.push(Query.limit(filters.limit ?? 200));
	return queries;
}

export function buildCreateTemplateData(
	input: CreateTemplateInput,
	ctx: { orgId: string; userId: string },
): Record<string, unknown> {
	const name = input.name.trim();
	if (!name) throw new Error("name is required");
	const contractType = input.contractType.trim();
	if (!contractType) throw new Error("contractType is required");
	const status = input.status ?? "draft";
	if (!isTemplateStatus(status) || status === "archived") {
		throw new Error("status must be draft or published");
	}
	const scratch = Boolean(input.scratchAgreement);
	const slots = parseClauseSlots(input.clauseSlots ?? []);
	if (!scratch && slots.length === 0) {
		throw new Error("Add at least one clause to the template");
	}

	const data: Record<string, unknown> = {
		orgId: ctx.orgId,
		name,
		description: input.description?.trim() || "",
		contractType,
		status,
		clauseSlots: stringifyClauseSlots(slots),
		createdBy: ctx.userId,
		updatedBy: ctx.userId,
	};
	if (scratch) {
		data.blueprintId = SCRATCH_AGREEMENT_BLUEPRINT_ID;
	}
	return data;
}

export async function listTemplates(
	filters: ListTemplatesFilters,
): Promise<ContractTemplate[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries: buildListTemplateQueries(filters),
	});
	const search = filters.search?.trim().toLowerCase();
	return (result.rows as unknown as Record<string, unknown>[])
		.map(mapRow)
		.filter((template) => {
			if (!search) return true;
			return (
				template.name.toLowerCase().includes(search) ||
				template.description.toLowerCase().includes(search) ||
				template.contractType.toLowerCase().includes(search)
			);
		});
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
	const rowId = ID.unique();
	const baseData = buildCreateTemplateData(input.data, {
		orgId: input.orgId,
		userId: input.userId,
	});
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId,
		data: baseData,
	});
	let template = mapRow(row as unknown as Record<string, unknown>);

	if (input.data.scratchAgreement) {
		const docxFileId = await persistScratchAgreementDocx({
			orgId: input.orgId,
			templateId: template.$id,
		});
		const updated = await tablesDB.updateRow({
			databaseId: dbId(),
			tableId: tableId(),
			rowId: template.$id,
			data: {
				docxFileId,
				blueprintId: SCRATCH_AGREEMENT_BLUEPRINT_ID,
				updatedBy: input.userId,
			},
		});
		template = mapRow(updated as unknown as Record<string, unknown>);
	}

	return template;
}

export async function updateTemplate(input: {
	template: ContractTemplate;
	userId: string;
	data: UpdateTemplateInput;
}): Promise<ContractTemplate> {
	if (input.template.status === "archived") {
		throw new Error("Archived templates cannot be edited");
	}
	const name = (input.data.name ?? input.template.name).trim();
	if (!name) throw new Error("name is required");
	const contractType = (
		input.data.contractType ?? input.template.contractType
	).trim();
	if (!contractType) throw new Error("contractType is required");
	const status = input.data.status ?? input.template.status;
	if (!isTemplateStatus(status)) throw new Error("Invalid status");
	if (status === "archived") {
		throw new Error("Use archive instead of setting status to archived");
	}
	const slots = parseClauseSlots(
		input.data.clauseSlots ?? input.template.clauseSlots,
	);
	const hasAgreementDoc = Boolean(input.template.docxFileId);
	if (slots.length === 0 && !hasAgreementDoc) {
		throw new Error("Add at least one clause to the template");
	}

	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: input.template.$id,
		data: {
			name,
			description:
				input.data.description !== undefined
					? input.data.description.trim()
					: input.template.description,
			contractType,
			status,
			clauseSlots: stringifyClauseSlots(slots),
			updatedBy: input.userId,
		},
	});
	return mapRow(row as unknown as Record<string, unknown>);
}

export async function archiveTemplate(input: {
	template: ContractTemplate;
	userId: string;
}): Promise<ContractTemplate> {
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: input.template.$id,
		data: {
			status: "archived",
			updatedBy: input.userId,
		},
	});
	return mapRow(row as unknown as Record<string, unknown>);
}
