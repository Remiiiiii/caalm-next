/**
 * Role Management Functions
 * Organization-scoped role management
 */

import { ID, Query } from "node-appwrite";
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

/**
 * Assign permissions to a role
 */
export async function assignPermissionsToRole(
	roleId: string,
	permissionKeys: PermissionKey[],
): Promise<boolean> {
	try {
		const { tablesDB } = await createAdminClient();

		// Get permission IDs from keys
		const permissions = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: appwriteConfig.permissionsCollectionId || "permissions",
			queries: [Query.equal("key", permissionKeys)],
		});

		const permissionIds = permissions.rows.map((p: any) => p.$id);

		// Remove existing permissions for this role
		const existing = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: "role_permissions",
			queries: [Query.equal("roleId", roleId)],
		});

		for (const rp of existing.rows) {
			await tablesDB.deleteRow({
				databaseId: appwriteConfig.databaseId || "default-db",
				tableId: "role_permissions",
				rowId: rp.$id,
			});
		}

		// Add new permissions
		for (const permissionId of permissionIds) {
			await tablesDB.createRow({
				databaseId: appwriteConfig.databaseId || "default-db",
				tableId: "role_permissions",
				rowId: ID.unique(),
				data: {
					roleId,
					permissionId,
				},
			});
		}

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
