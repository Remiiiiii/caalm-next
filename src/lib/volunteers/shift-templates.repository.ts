import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type {
	CreateVolunteerShiftTemplateInput,
	UpdateVolunteerShiftTemplateInput,
	VolunteerShiftTemplate,
} from "./types";

function tableId(): string {
	return (
		appwriteConfig.volunteerShiftTemplatesCollectionId ||
		"69d92301001f4e8c2b23"
	);
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

function parseStringArray(raw: unknown): string[] {
	if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
	if (typeof raw === "string" && raw.trim()) {
		try {
			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
		} catch {
			return raw
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
		}
	}
	return [];
}

function mapRow(row: Record<string, unknown>): VolunteerShiftTemplate {
	return {
		$id: String(row.$id),
		orgId: String(row.orgId || ""),
		name: String(row.name || ""),
		roleLabel: String(row.roleLabel || ""),
		durationMinutes: Number(row.durationMinutes ?? 0),
		skillsRequired: parseStringArray(row.skillsRequired),
		defaultCapacity: Number(row.defaultCapacity ?? 0),
		$createdAt: String(row.$createdAt || ""),
		$updatedAt: String(row.$updatedAt || ""),
	};
}

export async function listShiftTemplatesForOrg(
	orgId: string,
): Promise<VolunteerShiftTemplate[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries: [
			Query.equal("orgId", orgId),
			Query.orderAsc("name"),
			Query.limit(100),
		],
	});
	return (result.rows as unknown as Record<string, unknown>[]).map(mapRow);
}

export async function createShiftTemplate(
	input: CreateVolunteerShiftTemplateInput,
): Promise<VolunteerShiftTemplate> {
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: ID.unique(),
		data: {
			orgId: input.orgId,
			name: input.name.trim(),
			roleLabel: input.roleLabel.trim(),
			durationMinutes: input.durationMinutes,
			skillsRequired: input.skillsRequired ?? [],
			defaultCapacity: input.defaultCapacity,
		},
	});
	return mapRow(row as unknown as Record<string, unknown>);
}

export async function updateShiftTemplate(
	orgId: string,
	templateId: string,
	patch: UpdateVolunteerShiftTemplateInput,
): Promise<VolunteerShiftTemplate | null> {
	const { tablesDB } = await createAdminClient();
	const existing = await getShiftTemplateById(orgId, templateId);
	if (!existing) return null;
	const data: Record<string, unknown> = {};
	if (patch.name != null) data.name = patch.name.trim();
	if (patch.roleLabel != null) data.roleLabel = patch.roleLabel.trim();
	if (patch.durationMinutes != null)
		data.durationMinutes = patch.durationMinutes;
	if (patch.skillsRequired != null) data.skillsRequired = patch.skillsRequired;
	if (patch.defaultCapacity != null)
		data.defaultCapacity = patch.defaultCapacity;
	const row = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: templateId,
		data,
	});
	return mapRow(row as unknown as Record<string, unknown>);
}

export async function getShiftTemplateById(
	orgId: string,
	templateId: string,
): Promise<VolunteerShiftTemplate | null> {
	const { tablesDB } = await createAdminClient();
	try {
		const row = await tablesDB.getRow({
			databaseId: dbId(),
			tableId: tableId(),
			rowId: templateId,
		});
		const mapped = mapRow(row as unknown as Record<string, unknown>);
		if (mapped.orgId !== orgId) return null;
		return mapped;
	} catch {
		return null;
	}
}

export async function deleteShiftTemplate(
	orgId: string,
	templateId: string,
): Promise<boolean> {
	const existing = await getShiftTemplateById(orgId, templateId);
	if (!existing) return false;
	const { tablesDB } = await createAdminClient();
	await tablesDB.deleteRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: templateId,
	});
	return true;
}
