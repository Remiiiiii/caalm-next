import { Query } from "node-appwrite";

export const SOFT_DELETE_FIELD = "deletedAt";
export const SOFT_DELETED_BY_FIELD = "deletedBy";

export type SoftDeleteListScope = "active" | "removed";

/**
 * Appwrite query that hides soft-deleted rows from lists and counts.
 * Demo Contracts is at Appwrite's attribute cap, so deletedAt did not sync
 * there. Use a no-op filter on that table so list queries still run.
 */
export function excludeSoftDeletedQuery(
	table: "contracts" | "licenses" = "contracts",
) {
	if (table === "contracts" && process.env.APP_MODE === "demo") {
		return Query.isNotNull("$id");
	}
	return Query.isNull(SOFT_DELETE_FIELD);
}

/**
 * Appwrite query that returns only soft-deleted rows (Removed lists).
 * Demo Contracts: no-op (deletedAt may be missing) so callers still get a list.
 */
export function onlySoftDeletedQuery(
	table: "contracts" | "licenses" = "contracts",
) {
	if (table === "contracts" && process.env.APP_MODE === "demo") {
		return Query.isNotNull("$id");
	}
	return Query.isNotNull(SOFT_DELETE_FIELD);
}

export function softDeleteScopeQuery(
	scope: SoftDeleteListScope,
	table: "contracts" | "licenses" = "contracts",
) {
	return scope === "removed"
		? onlySoftDeletedQuery(table)
		: excludeSoftDeletedQuery(table);
}

export function softDeleteFields(deletedBy?: string | null) {
	return {
		[SOFT_DELETE_FIELD]: new Date().toISOString(),
		[SOFT_DELETED_BY_FIELD]: deletedBy || null,
	};
}

/** Clear soft-delete markers on restore. */
export function clearSoftDeleteFields() {
	return {
		[SOFT_DELETE_FIELD]: null,
		[SOFT_DELETED_BY_FIELD]: null,
	};
}
