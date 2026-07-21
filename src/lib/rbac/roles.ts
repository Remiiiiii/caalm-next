/**
 * Role Management Functions
 * Organization-scoped role management
 */

import { ID, type Models, Query } from "node-appwrite";
import type { PermissionKey } from "@/constants/permissions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

export interface Role {
	$id: string;
	name: string;
	description?: string;
	orgId?: string | null;
	isSystemRole: boolean;
	createdAt: string;
	updatedAt: string;
	createdBy: string;
	/** Lower = higher rank for default dashboard (optional; Appwrite column) */
	priority?: number;
	/** Default home path e.g. /dashboard/superadmin (optional; Appwrite column) */
	homeDashboardPath?: string | null;
}

/**
 * Create a new role
 */
export async function createRole({
	name,
	description,
	orgId,
	isSystemRole = false,
	createdBy,
}: {
	name: string;
	description?: string;
	orgId?: string | null;
	isSystemRole?: boolean;
	createdBy: string;
}): Promise<Role> {
	const { tablesDB } = await createAdminClient();

	const role = await tablesDB.createRow({
		databaseId: appwriteConfig.databaseId || "default-db",
		tableId: "roles",
		rowId: ID.unique(),
		data: {
			name,
			description: description || "",
			orgId: orgId || null,
			isSystemRole,
			createdBy,
		},
	});

	return role as unknown as Role;
}

/**
 * Get role by ID
 */
export async function getRole(roleId: string): Promise<Role | null> {
	try {
		const { tablesDB } = await createAdminClient();

		const role = await tablesDB.getRow({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: "roles",
			rowId: roleId,
		});

		return role as unknown as Role;
	} catch (error) {
		console.error("[getRole] Error:", error);
		return null;
	}
}

/**
 * List roles for an organization (or system roles if orgId is null)
 */
export async function listRoles(orgId?: string | null): Promise<Role[]> {
	const { tablesDB } = await createAdminClient();

	const queries = [];
	if (orgId === undefined) {
		// Get all roles (system and org-specific)
		queries.push(Query.isNull("orgId"));
	} else if (orgId === null) {
		// Get only system roles
		queries.push(Query.isNull("orgId"));
	} else {
		// Get org-specific roles and system roles
		queries.push(
			Query.or([Query.equal("orgId", orgId), Query.isNull("orgId")]),
		);
	}

	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId || "default-db",
		tableId: "roles",
		queries,
	});

	return result.rows as unknown as Role[];
}

/**
 * Count user_roles rows per roleId for an organization (assignment cardinality).
 * Paginates to handle large orgs.
 */
export async function getRoleMemberCountsForOrg(
	orgId: string,
): Promise<Record<string, number>> {
	const counts: Record<string, number> = {};
	if (!orgId?.trim()) {
		return counts;
	}

	const { tablesDB } = await createAdminClient();
	const databaseId = appwriteConfig.databaseId || "default-db";
	const pageSize = 100;
	let offset = 0;

	for (;;) {
		const result = await tablesDB.listRows({
			databaseId,
			tableId: "user_roles",
			queries: [
				Query.equal("orgId", orgId),
				Query.limit(pageSize),
				Query.offset(offset),
			],
		});

		for (const row of result.rows) {
			const rid = (row as { roleId?: string }).roleId;
			if (rid) {
				counts[rid] = (counts[rid] ?? 0) + 1;
			}
		}

		if (result.rows.length < pageSize) {
			break;
		}
		offset += pageSize;
		// Safety cap — adjust if a single org can exceed this
		if (offset > 50_000) {
			console.warn(
				"[getRoleMemberCountsForOrg] Stopped pagination at 50k assignments",
			);
			break;
		}
	}

	return counts;
}

/**
 * Update a role
 */
export async function updateRole(
	roleId: string,
	updates: {
		name?: string;
		description?: string;
	},
): Promise<Role | null> {
	try {
		const { tablesDB } = await createAdminClient();

		const role = await tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: "roles",
			rowId: roleId,
			data: updates,
		});

		return role as unknown as Role;
	} catch (error) {
		console.error("[updateRole] Error:", error);
		return null;
	}
}

/**
 * Delete a role (only if not a system role)
 */
export async function deleteRole(roleId: string): Promise<boolean> {
	try {
		const role = await getRole(roleId);
		if (!role) {
			return false;
		}

		if (role.isSystemRole) {
			throw new Error("Cannot delete system role");
		}

		const { tablesDB } = await createAdminClient();

		// Check if role is assigned to any users
		const userRoles = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: "user_roles",
			queries: [Query.equal("roleId", roleId)],
		});

		if (userRoles.total > 0) {
			throw new Error("Cannot delete role that is assigned to users");
		}

		// Delete role-permission associations
		const rolePermissions = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: "role_permissions",
			queries: [Query.equal("roleId", roleId)],
		});

		for (const rp of rolePermissions.rows) {
			await tablesDB.deleteRow({
				databaseId: appwriteConfig.databaseId || "default-db",
				tableId: "role_permissions",
				rowId: rp.$id,
			});
		}

		// Delete the role
		await tablesDB.deleteRow({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: "roles",
			rowId: roleId,
		});

		return true;
	} catch (error) {
		console.error("[deleteRole] Error:", error);
		throw error;
	}
}

const ROLE_PERM_LIST_CHUNK = 100;
/** Parallel Appwrite writes per batch (stay under typical rate limits). */
const ROLE_PERM_WRITE_CONCURRENCY = 24;

async function runInConcurrencyBatches<T>(
	items: T[],
	concurrency: number,
	fn: (item: T) => Promise<unknown>,
): Promise<void> {
	for (let i = 0; i < items.length; i += concurrency) {
		const chunk = items.slice(i, i + concurrency);
		await Promise.all(chunk.map((item) => fn(item)));
	}
}

/**
 * Assign permissions to a role
 */
export async function assignPermissionsToRole(
	roleId: string,
	permissionKeys: PermissionKey[],
): Promise<boolean> {
	try {
		const { tablesDB } = await createAdminClient();
		const databaseId = appwriteConfig.databaseId || "default-db";
		const permissionsTableId =
			appwriteConfig.permissionsCollectionId || "permissions";

		const keys = [
			...new Set(
				permissionKeys.map((k) => String(k).trim()).filter((k) => k.length > 0),
			),
		] as PermissionKey[];

		// Remove existing role_permissions: list in pages, delete each page in parallel
		// (repeated first page until empty avoids offset skew after deletes).
		let clearPasses = 0;
		const maxClearPasses = 200;
		while (clearPasses < maxClearPasses) {
			clearPasses += 1;
			const existing = await tablesDB.listRows({
				databaseId,
				tableId: "role_permissions",
				queries: [
					Query.equal("roleId", roleId),
					Query.limit(ROLE_PERM_LIST_CHUNK),
				],
			});
			if (existing.rows.length === 0) {
				break;
			}
			await runInConcurrencyBatches(
				existing.rows,
				ROLE_PERM_WRITE_CONCURRENCY,
				(rp) =>
					tablesDB.deleteRow({
						databaseId,
						tableId: "role_permissions",
						rowId: (rp as { $id: string }).$id,
					}),
			);
		}

		if (keys.length === 0) {
			return true;
		}

		// Batch key lookups — Query.equal("key", array) is not reliable across SDK versions
		const BATCH_SIZE = 50;
		const permissionIdSet = new Set<string>();

		const keyBatches: PermissionKey[][] = [];
		for (let i = 0; i < keys.length; i += BATCH_SIZE) {
			keyBatches.push(keys.slice(i, i + BATCH_SIZE));
		}

		const lookupResults = await Promise.all(
			keyBatches.map((batch) => {
				const keyQueries =
					batch.length === 1
						? [Query.equal("key", batch[0]!)]
						: [Query.or(batch.map((k) => Query.equal("key", k)))];
				return tablesDB.listRows({
					databaseId,
					tableId: permissionsTableId,
					queries: [...keyQueries, Query.limit(200)],
				});
			}),
		);

		for (const permissions of lookupResults) {
			for (const row of permissions.rows) {
				const id = (row as { $id?: string }).$id;
				if (id) permissionIdSet.add(id);
			}
		}

		const newIds = [...permissionIdSet];
		await runInConcurrencyBatches(
			newIds,
			ROLE_PERM_WRITE_CONCURRENCY,
			(permissionId) =>
				tablesDB.createRow<Models.DefaultRow>({
					databaseId,
					tableId: "role_permissions",
					rowId: ID.unique(),
					data: {
						roleId,
						permissionId,
					},
				}),
		);

		return true;
	} catch (error) {
		console.error("[assignPermissionsToRole] Error:", error);
		return false;
	}
}

/**
 * Get permissions for a role
 */
export async function getRolePermissions(
	roleId: string,
): Promise<PermissionKey[]> {
	try {
		const { tablesDB } = await createAdminClient();

		const rolePermissions = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: "role_permissions",
			queries: [Query.equal("roleId", roleId), Query.limit(200)],
		});

		const permissionIds = rolePermissions.rows.map(
			(rp: any) => rp.permissionId,
		);

		if (!permissionIds.length) {
			return [];
		}

		// Build query for permission IDs - batch queries to avoid Query.or() limit and string length limit

		const allPermissions: any[] = [];
		// Batch size of 50 to avoid Appwrite's 4096 character query string limit
		const BATCH_SIZE = 50;

		// Process in batches
		for (let i = 0; i < permissionIds.length; i += BATCH_SIZE) {
			const batch = permissionIds.slice(i, i + BATCH_SIZE);
			const permissionQueries = [];

			if (batch.length === 1) {
				permissionQueries.push(Query.equal("$id", batch[0]));
			} else {
				permissionQueries.push(
					Query.or(batch.map((permId) => Query.equal("$id", permId))),
				);
			}
			permissionQueries.push(Query.limit(BATCH_SIZE));

			const permissions = await tablesDB.listRows({
				databaseId: appwriteConfig.databaseId || "default-db",
				tableId: appwriteConfig.permissionsCollectionId || "permissions",
				queries: permissionQueries,
			});

			allPermissions.push(...permissions.rows);
		}

		return allPermissions.map((p: any) => p.key) as PermissionKey[];
	} catch (error) {
		console.error("[getRolePermissions] Error:", error);
		return [];
	}
}
