/**
 * Per-tenant org unit catalog, cost centers, placement assignment, and history.
 */

import { ID, Query } from "node-appwrite";
import {
	CONTRACT_DEPARTMENTS,
	DIVISION_TO_DEPARTMENT,
	USER_DIVISIONS,
	type UserDivision,
	formatDivisionName,
} from "../../../constants";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type {
	CostCenter,
	OrgUnit,
	OrgUnitHistoryEntry,
	OrgUnitType,
} from "@/lib/database/schemas/org-units.schema";
import {
	normalizeOrgPlacement,
	pairsMismatch,
} from "@/lib/org/org-unit-validation";

const db = () => appwriteConfig.databaseId || "default-db";
const orgUnitsTable = () => appwriteConfig.orgUnitsCollectionId || "org_units";
const costCentersTable = () =>
	appwriteConfig.costCentersCollectionId || "cost_centers";
const historyTable = () =>
	appwriteConfig.orgUnitHistoryCollectionId || "org_unit_history";
const usersTable = () => appwriteConfig.usersCollectionId || "users";

function asOrgUnit(row: Record<string, unknown>): OrgUnit {
	return {
		$id: String(row.$id),
		orgId: String(row.orgId),
		type: row.type as OrgUnitType,
		parentId: (row.parentId as string | null | undefined) ?? null,
		code: String(row.code),
		name: String(row.name),
		active: row.active !== false,
		sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : 0,
		$createdAt: row.$createdAt as string | undefined,
		$updatedAt: row.$updatedAt as string | undefined,
	};
}

function asCostCenter(row: Record<string, unknown>): CostCenter {
	return {
		$id: String(row.$id),
		orgId: String(row.orgId),
		code: String(row.code),
		name: String(row.name),
		active: row.active !== false,
		$createdAt: row.$createdAt as string | undefined,
		$updatedAt: row.$updatedAt as string | undefined,
	};
}

export async function listOrgUnits(
	orgId: string,
	opts?: { includeInactive?: boolean },
): Promise<OrgUnit[]> {
	const { tablesDB } = await createAdminClient();
	const queries = [Query.equal("orgId", orgId), Query.limit(500)];
	const result = await tablesDB.listRows({
		databaseId: db(),
		tableId: orgUnitsTable(),
		queries,
	});
	const units = (result.rows || []).map((r) =>
		asOrgUnit(r as unknown as Record<string, unknown>),
	);
	if (opts?.includeInactive) return units;
	return units.filter((u) => u.active);
}

export async function getOrgUnitById(
	id: string,
): Promise<OrgUnit | null> {
	const { tablesDB } = await createAdminClient();
	try {
		const row = await tablesDB.getRow({
			databaseId: db(),
			tableId: orgUnitsTable(),
			rowId: id,
		});
		return asOrgUnit(row as unknown as Record<string, unknown>);
	} catch {
		return null;
	}
}

export async function findOrgUnitByCode(
	orgId: string,
	code: string,
): Promise<OrgUnit | null> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: db(),
		tableId: orgUnitsTable(),
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("code", code),
			Query.limit(1),
		],
	});
	if (!result.total) return null;
	return asOrgUnit(result.rows[0] as unknown as Record<string, unknown>);
}

export async function createOrgUnit(input: {
	orgId: string;
	type: OrgUnitType;
	code: string;
	name: string;
	parentId?: string | null;
	sortOrder?: number;
}): Promise<OrgUnit> {
	const { tablesDB } = await createAdminClient();
	const code = input.code.trim();
	const existing = await findOrgUnitByCode(input.orgId, code);
	if (existing) {
		throw new Error(`Org unit code "${code}" already exists for this organization.`);
	}
	if (input.parentId) {
		const parent = await getOrgUnitById(input.parentId);
		if (!parent || parent.orgId !== input.orgId) {
			throw new Error("Parent org unit not found in this organization.");
		}
	}
	const row = await tablesDB.createRow({
		databaseId: db(),
		tableId: orgUnitsTable(),
		rowId: ID.unique(),
		data: {
			orgId: input.orgId,
			type: input.type,
			code,
			name: input.name.trim(),
			parentId: input.parentId || null,
			active: true,
			sortOrder: input.sortOrder ?? 0,
		},
	});
	return asOrgUnit(row as unknown as Record<string, unknown>);
}

export async function updateOrgUnit(
	id: string,
	patch: {
		name?: string;
		parentId?: string | null;
		active?: boolean;
		sortOrder?: number;
		type?: OrgUnitType;
	},
): Promise<OrgUnit> {
	const { tablesDB } = await createAdminClient();
	const current = await getOrgUnitById(id);
	if (!current) throw new Error("Org unit not found");

	const data: Record<string, unknown> = {};
	if (patch.name !== undefined) data.name = patch.name.trim();
	if (patch.parentId !== undefined) data.parentId = patch.parentId;
	if (patch.active !== undefined) data.active = patch.active;
	if (patch.sortOrder !== undefined) data.sortOrder = patch.sortOrder;
	if (patch.type !== undefined) data.type = patch.type;

	const row = await tablesDB.updateRow({
		databaseId: db(),
		tableId: orgUnitsTable(),
		rowId: id,
		data,
	});
	return asOrgUnit(row as unknown as Record<string, unknown>);
}

export async function softDeleteOrgUnit(id: string): Promise<OrgUnit> {
	const { tablesDB } = await createAdminClient();
	const users = await tablesDB.listRows({
		databaseId: db(),
		tableId: usersTable(),
		queries: [Query.equal("primaryOrgUnitId", id), Query.limit(1)],
	});
	if (users.total > 0) {
		throw new Error(
			"Cannot archive: users still have this unit as their primary org unit.",
		);
	}
	return updateOrgUnit(id, { active: false });
}

/**
 * Idempotent seed of CONTRACT_DEPARTMENTS + USER_DIVISIONS for an org.
 */
export async function seedDefaultOrgUnits(orgId: string): Promise<{
	created: number;
	skipped: number;
}> {
	let created = 0;
	let skipped = 0;
	const departmentIds = new Map<string, string>();

	for (let i = 0; i < CONTRACT_DEPARTMENTS.length; i++) {
		const code = CONTRACT_DEPARTMENTS[i];
		const existing = await findOrgUnitByCode(orgId, code);
		if (existing) {
			departmentIds.set(code, existing.$id);
			skipped++;
			continue;
		}
		const unit = await createOrgUnit({
			orgId,
			type: "department",
			code,
			name: code,
			parentId: null,
			sortOrder: i,
		});
		departmentIds.set(code, unit.$id);
		created++;
	}

	for (let i = 0; i < USER_DIVISIONS.length; i++) {
		const code = USER_DIVISIONS[i];
		const existing = await findOrgUnitByCode(orgId, code);
		if (existing) {
			skipped++;
			continue;
		}
		const parentDept = DIVISION_TO_DEPARTMENT[code];
		const parentId = departmentIds.get(parentDept) || null;
		await createOrgUnit({
			orgId,
			type: "division",
			code,
			name: formatDivisionName(code),
			parentId,
			sortOrder: i,
		});
		created++;
	}

	return { created, skipped };
}

export async function backfillUserOrgUnitIds(orgId: string): Promise<{
	updated: number;
}> {
	const { tablesDB } = await createAdminClient();
	const units = await listOrgUnits(orgId, { includeInactive: true });
	const byCode = new Map(units.map((u) => [u.code, u]));

	const users = await tablesDB.listRows({
		databaseId: db(),
		tableId: usersTable(),
		queries: [Query.equal("orgId", orgId), Query.limit(500)],
	});

	let updated = 0;
	for (const user of users.rows || []) {
		const division = String(user.division || "").trim();
		const department = String(user.department || "").trim();
		const divUnit = division ? byCode.get(division) : undefined;
		const deptUnit = department ? byCode.get(department) : undefined;
		const primary = divUnit || deptUnit;
		const data: Record<string, unknown> = {
			departmentLabel: department || null,
			divisionLabel: division || null,
		};
		if (deptUnit) data.departmentId = deptUnit.$id;
		if (divUnit) data.divisionId = divUnit.$id;
		if (primary) data.primaryOrgUnitId = primary.$id;

		await tablesDB.updateRow({
			databaseId: db(),
			tableId: usersTable(),
			rowId: user.$id,
			data,
		});
		updated++;
	}
	return { updated };
}

export async function assignUserOrgUnit(input: {
	userId: string;
	orgUnitId: string;
	changedBy: string;
	reason?: string;
	managerUserId?: string | null;
	costCenterId?: string | null;
}): Promise<Record<string, unknown>> {
	const { tablesDB } = await createAdminClient();
	const user = await tablesDB.getRow({
		databaseId: db(),
		tableId: usersTable(),
		rowId: input.userId,
	});
	const unit = await getOrgUnitById(input.orgUnitId);
	if (!unit?.active) throw new Error("Org unit not found or inactive");
	if (user.orgId && unit.orgId !== user.orgId) {
		throw new Error("Org unit belongs to a different organization");
	}

	let departmentCode = unit.code;
	let divisionCode: string | undefined;
	let departmentId = unit.$id;
	let divisionId: string | null = null;

	if (unit.type === "department") {
		departmentCode = unit.code;
		departmentId = unit.$id;
	} else {
		divisionCode = unit.code;
		divisionId = unit.$id;
		if (unit.parentId) {
			const parent = await getOrgUnitById(unit.parentId);
			if (parent) {
				departmentCode = parent.code;
				departmentId = parent.$id;
			} else if (
				divisionCode &&
				(USER_DIVISIONS as string[]).includes(divisionCode)
			) {
				departmentCode =
					DIVISION_TO_DEPARTMENT[divisionCode as UserDivision];
			}
		} else if (
			divisionCode &&
			(USER_DIVISIONS as string[]).includes(divisionCode)
		) {
			departmentCode = DIVISION_TO_DEPARTMENT[divisionCode as UserDivision];
			const parent = await findOrgUnitByCode(unit.orgId, departmentCode);
			if (parent) departmentId = parent.$id;
		}
	}

	const placement = normalizeOrgPlacement({
		department: departmentCode,
		division: divisionCode,
		requireDepartment: true,
	});

	const fromId = (user.primaryOrgUnitId as string | undefined) || null;
	const data: Record<string, unknown> = {
		department: placement.department,
		departmentLabel: placement.department,
		primaryOrgUnitId: unit.$id,
		departmentId,
		divisionId,
		orgId: user.orgId || unit.orgId,
	};
	if (placement.division) {
		data.division = placement.division;
		data.divisionLabel = placement.division;
	}
	if (input.managerUserId !== undefined) {
		data.managerUserId = input.managerUserId;
	}
	if (input.costCenterId !== undefined) {
		data.costCenterId = input.costCenterId;
	}

	const updated = await tablesDB.updateRow({
		databaseId: db(),
		tableId: usersTable(),
		rowId: input.userId,
		data,
	});

	if (fromId !== unit.$id) {
		await tablesDB.createRow({
			databaseId: db(),
			tableId: historyTable(),
			rowId: ID.unique(),
			data: {
				orgId: unit.orgId,
				userId: input.userId,
				fromOrgUnitId: fromId,
				toOrgUnitId: unit.$id,
				changedBy: input.changedBy,
				reason: input.reason || null,
				changedAt: new Date().toISOString(),
			},
		});
	}

	return updated as unknown as Record<string, unknown>;
}

export async function listOrgUnitHistory(
	userId: string,
): Promise<OrgUnitHistoryEntry[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: db(),
		tableId: historyTable(),
		queries: [
			Query.equal("userId", userId),
			Query.orderDesc("changedAt"),
			Query.limit(50),
		],
	});
	return (result.rows || []).map((row) => ({
		$id: row.$id,
		orgId: String(row.orgId),
		userId: String(row.userId),
		fromOrgUnitId: (row.fromOrgUnitId as string | null) ?? null,
		toOrgUnitId: (row.toOrgUnitId as string | null) ?? null,
		changedBy: String(row.changedBy),
		reason: (row.reason as string | null) ?? null,
		changedAt: String(row.changedAt),
	}));
}

export async function auditOrgPlacement(orgId?: string): Promise<{
	mismatched: Array<{
		userId: string;
		email?: string;
		department?: string;
		division?: string;
		missingPrimaryOrgUnitId: boolean;
	}>;
}> {
	const { tablesDB } = await createAdminClient();
	const queries = [Query.limit(500)];
	if (orgId) queries.unshift(Query.equal("orgId", orgId));
	const result = await tablesDB.listRows({
		databaseId: db(),
		tableId: usersTable(),
		queries,
	});
	const mismatched = [];
	for (const user of result.rows || []) {
		const department = user.department as string | undefined;
		const division = user.division as string | undefined;
		const missingPrimary = !user.primaryOrgUnitId;
		const badPair = pairsMismatch(department, division);
		if (badPair || missingPrimary) {
			mismatched.push({
				userId: user.$id,
				email: user.email as string | undefined,
				department,
				division,
				missingPrimaryOrgUnitId: missingPrimary,
			});
		}
	}
	return { mismatched };
}

export async function listCostCenters(
	orgId: string,
	opts?: { includeInactive?: boolean },
): Promise<CostCenter[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: db(),
		tableId: costCentersTable(),
		queries: [Query.equal("orgId", orgId), Query.limit(200)],
	});
	const items = (result.rows || []).map((r) =>
		asCostCenter(r as unknown as Record<string, unknown>),
	);
	if (opts?.includeInactive) return items;
	return items.filter((c) => c.active);
}

export async function createCostCenter(input: {
	orgId: string;
	code: string;
	name: string;
}): Promise<CostCenter> {
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.createRow({
		databaseId: db(),
		tableId: costCentersTable(),
		rowId: ID.unique(),
		data: {
			orgId: input.orgId,
			code: input.code.trim(),
			name: input.name.trim(),
			active: true,
		},
	});
	return asCostCenter(row as unknown as Record<string, unknown>);
}

export async function updateCostCenter(
	id: string,
	patch: { name?: string; active?: boolean; code?: string },
): Promise<CostCenter> {
	const { tablesDB } = await createAdminClient();
	const data: Record<string, unknown> = {};
	if (patch.name !== undefined) data.name = patch.name.trim();
	if (patch.active !== undefined) data.active = patch.active;
	if (patch.code !== undefined) data.code = patch.code.trim();
	const row = await tablesDB.updateRow({
		databaseId: db(),
		tableId: costCentersTable(),
		rowId: id,
		data,
	});
	return asCostCenter(row as unknown as Record<string, unknown>);
}

export async function getCostCenterById(
	id: string,
): Promise<CostCenter | null> {
	const { tablesDB } = await createAdminClient();
	try {
		const row = await tablesDB.getRow({
			databaseId: db(),
			tableId: costCentersTable(),
			rowId: id,
		});
		return asCostCenter(row as unknown as Record<string, unknown>);
	} catch {
		return null;
	}
}
