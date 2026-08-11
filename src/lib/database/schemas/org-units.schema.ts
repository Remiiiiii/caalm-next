/**
 * Org units, cost centers, and placement history schemas.
 */

export type OrgUnitType = "division" | "department" | "program" | "team";

export interface OrgUnit {
	$id: string;
	orgId: string;
	type: OrgUnitType;
	parentId?: string | null;
	code: string;
	name: string;
	active: boolean;
	sortOrder?: number;
	$createdAt?: string;
	$updatedAt?: string;
}

export interface CostCenter {
	$id: string;
	orgId: string;
	code: string;
	name: string;
	active: boolean;
	$createdAt?: string;
	$updatedAt?: string;
}

export interface OrgUnitHistoryEntry {
	$id: string;
	orgId: string;
	userId: string;
	fromOrgUnitId?: string | null;
	toOrgUnitId?: string | null;
	changedBy: string;
	reason?: string | null;
	changedAt: string;
}

export const ORG_UNIT_TYPES: OrgUnitType[] = [
	"department",
	"division",
	"program",
	"team",
];
