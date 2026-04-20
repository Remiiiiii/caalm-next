import { type NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	getUserDefaultOrganization,
	getUserPermissions,
	getUserRoles,
} from "@/lib/rbac/permissions";
import CacheManager from "@/lib/services/cache-manager";

/**
 * Diagnose RBAC issues and clear cache
 * GET /api/admin/rbac/diagnose?action=check|clear|test
 *
 * Note: This endpoint checks for Super Admin role directly (bypassing permission checks)
 * to allow diagnosing RBAC issues when permissions might be misconfigured.
 */
export async function GET(request: NextRequest) {
	try {
		// Check authentication
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		// Check if user has Super Admin role (direct role check, bypassing permissions)
		const defaultOrg = await getUserDefaultOrganization(user.$id);
		if (!defaultOrg) {
			return NextResponse.json(
				{ error: "User has no default organization" },
				{ status: 403 },
			);
		}

		const userRoles = await getUserRoles(user.$id, defaultOrg.orgId);
		const isSuperAdmin = userRoles.some(
			(ur) => ur.roleId === "role_super_admin",
		);

		if (!isSuperAdmin) {
			return NextResponse.json(
				{ error: "Super Admin role required for diagnostic access" },
				{ status: 403 },
			);
		}

		const { searchParams } = new URL(request.url);
		const action = searchParams.get("action") || "check";
		const userId = searchParams.get("userId");

		const { tablesDB } = await createAdminClient();

		if (action === "clear") {
			// Clear all RBAC cache
			if (userId) {
				await CacheManager.invalidateRBAC(userId);
			} else {
				await CacheManager.invalidateRBAC();
			}

			return NextResponse.json({
				success: true,
				message: userId
					? `RBAC cache cleared for user: ${userId}`
					: "All RBAC cache cleared",
				action: "clear",
			});
		}

		if (action === "test") {
			// Test permissions fetch for current user or specified user
			const testUserId = userId || user.$id;

			if (!testUserId) {
				return NextResponse.json(
					{ success: false, error: "User ID required for testing" },
					{ status: 400 },
				);
			}

			// Get default org first (needed for cache clearing)
			const defaultOrg = await getUserDefaultOrganization(testUserId);
			if (!defaultOrg) {
				return NextResponse.json({
					success: false,
					error: "User has no default organization",
					userId: testUserId,
				});
			}

			// Clear cache with orgId to ensure proper cache clearing
			await CacheManager.invalidateRBAC(testUserId, defaultOrg.orgId);

			const userRoles = await getUserRoles(testUserId, defaultOrg.orgId);
			const roleIds = userRoles.map((ur) => ur.roleId);

			// Get role_permissions for debugging
			const rolePermissionQueries = [];
			if (roleIds.length === 1) {
				rolePermissionQueries.push(Query.equal("roleId", roleIds[0]));
			} else if (roleIds.length > 1) {
				rolePermissionQueries.push(
					Query.or(roleIds.map((roleId) => Query.equal("roleId", roleId))),
				);
			}
			rolePermissionQueries.push(Query.limit(200));

			const rolePermissions = await tablesDB.listRows({
				databaseId: appwriteConfig.databaseId || "default-db",
				tableId: "role_permissions",
				queries: rolePermissionQueries,
			});

			const permissionIds = [
				...new Set(rolePermissions.rows.map((rp: any) => rp.permissionId)),
			];

			// Get permissions - batch queries to avoid Query.or() limit and string length limit
			const allPermissions: any[] = [];
			// Batch size of 50 to avoid Appwrite's 4096 character query string limit
			const BATCH_SIZE = 50;

			if (permissionIds.length > 0) {
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
			}

			const permissionsResult = { rows: allPermissions };

			// Fetch permissions using the function
			const permissions = await getUserPermissions(testUserId);

			return NextResponse.json({
				success: true,
				action: "test",
				userId: testUserId,
				orgId: defaultOrg.orgId,
				userRoles: userRoles,
				roleIds: roleIds,
				rolePermissionsCount: rolePermissions.rows.length,
				permissionIdsCount: permissionIds.length,
				permissionIds: permissionIds.slice(0, 10), // First 10 for debugging
				permissionsFoundCount: permissionsResult.rows.length,
				permissionsCount: permissions.length,
				permissions: permissions,
			});
		}

		// Default action: check for orphaned entries
		const issues: {
			orphanedRolePermissions: Array<{
				documentId: string;
				roleId: string;
				permissionId: string;
				issue: string;
			}>;
			missingPermissions: string[];
			missingRoles: string[];
			summary: {
				totalRolePermissions: number;
				totalPermissions: number;
				totalRoles: number;
				orphanedCount: number;
			};
		} = {
			orphanedRolePermissions: [],
			missingPermissions: [],
			missingRoles: [],
			summary: {
				totalRolePermissions: 0,
				totalPermissions: 0,
				totalRoles: 0,
				orphanedCount: 0,
			},
		};

		// Get all role_permissions
		const rolePermissions = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: "role_permissions",
			queries: [Query.limit(500)],
		});

		// Get all permissions
		const permissions = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: appwriteConfig.permissionsCollectionId || "permissions",
			queries: [Query.limit(200)],
		});

		// Get all roles
		const roles = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: "roles",
			queries: [Query.limit(100)],
		});

		// Create lookup sets
		const permissionIds = new Set(permissions.rows.map((p: any) => p.$id));
		const roleIds = new Set(roles.rows.map((r: any) => r.$id));

		// Check for orphaned entries
		for (const rp of rolePermissions.rows) {
			const permissionExists = permissionIds.has(rp.permissionId);
			const roleExists = roleIds.has(rp.roleId);

			if (!permissionExists || !roleExists) {
				issues.orphanedRolePermissions.push({
					documentId: rp.$id,
					roleId: rp.roleId,
					permissionId: rp.permissionId,
					issue:
						!permissionExists && !roleExists
							? "Both permission and role missing"
							: !permissionExists
								? "Permission missing"
								: "Role missing",
				});
			}
		}

		// Find missing permission IDs
		const referencedPermissionIds = new Set(
			rolePermissions.rows.map((rp: any) => rp.permissionId),
		);
		for (const permId of referencedPermissionIds) {
			if (!permissionIds.has(permId)) {
				issues.missingPermissions.push(permId);
			}
		}

		// Find missing role IDs
		const referencedRoleIds = new Set(
			rolePermissions.rows.map((rp: any) => rp.roleId),
		);
		for (const roleId of referencedRoleIds) {
			if (!roleIds.has(roleId)) {
				issues.missingRoles.push(roleId);
			}
		}

		// Count role_permissions by role
		const rolePermissionCounts: Record<string, number> = {};
		for (const rp of rolePermissions.rows) {
			rolePermissionCounts[rp.roleId] =
				(rolePermissionCounts[rp.roleId] || 0) + 1;
		}

		issues.summary = {
			totalRolePermissions: rolePermissions.total,
			totalPermissions: permissions.total,
			totalRoles: roles.total,
			orphanedCount: issues.orphanedRolePermissions.length,
		};

		return NextResponse.json({
			success: true,
			action: "check",
			issues,
			rolePermissionCounts,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("[RBAC Diagnose] Error:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
