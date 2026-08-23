/**
 * Permission Checking Utilities
 * Organization-aware permission checking functions
 * Optimized with Redis caching and parallel queries
 */

"use server";

import { Query } from "node-appwrite";
import { cache } from "react";
import type { PermissionKey } from "@/constants/permissions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { permissionSatisfied } from "@/lib/rbac/permission-implications";
import { ROLE_DASHBOARD_FALLBACK } from "@/lib/rbac/role-dashboard-metadata";
import { CACHE_KEYS, CACHE_TTLS } from "@/lib/services/cache-keys";

// Lazy load redis-cache to avoid bundling in client components
const getOrSet = async <T>(
	key: string,
	fetchFn: () => Promise<T>,
	ttl: number,
): Promise<T> => {
	if (typeof window === "undefined") {
		// Server-side: use Redis cache
		const { getOrSet: redisGetOrSet } = await import(
			"@/lib/services/redis-cache"
		);
		return redisGetOrSet(key, fetchFn, ttl);
	} else {
		// Client-side: just fetch (shouldn't happen but safe fallback)
		return fetchFn();
	}
};

/**
 * Like getOrSet, but never persists empty arrays.
 * Empty RBAC results are often transient (identity mismatch, cold roles);
 * caching them locks users out of nav/dashboards for the full TTL.
 */
const getOrSetNonEmptyArray = async <T>(
	key: string,
	fetchFn: () => Promise<T[]>,
	ttl: number,
): Promise<T[]> => {
	if (typeof window !== "undefined") {
		return fetchFn();
	}

	const { get, set, del } = await import("@/lib/services/redis-cache");
	const cached = await get<T[]>(key);
	if (cached !== null && Array.isArray(cached) && cached.length > 0) {
		return cached;
	}
	if (cached !== null && Array.isArray(cached) && cached.length === 0) {
		await del(key);
	}

	const fresh = await fetchFn();
	if (fresh.length > 0) {
		try {
			await set(key, fresh, ttl);
		} catch {
			// ignore cache write failures
		}
	}
	return fresh;
};

/**
 * Normalize profile document $id → Auth accountId.
 * Callers may pass either. `user_roles.userId` and `user_organizations.userId`
 * are inconsistent in production (Auth accountId vs users-table $id), so
 * role/org lookups query both candidate IDs.
 */
export async function resolveAuthAccountId(userId: string): Promise<string> {
	if (!userId) return userId;

	try {
		const { tablesDB } = await createAdminClient();
		const databaseId = appwriteConfig.databaseId || "default-db";
		const tableId = appwriteConfig.usersCollectionId || "users";

		try {
			const profile = await tablesDB.getRow({
				databaseId,
				tableId,
				rowId: userId,
			});
			const accountId = String(
				(profile as { accountId?: string }).accountId || "",
			).trim();
			if (accountId) return accountId;
		} catch {
			// Not a users-table document id — may already be an accountId
		}

		const byAccount = await tablesDB.listRows({
			databaseId,
			tableId,
			queries: [Query.equal("accountId", userId), Query.limit(1)],
		});
		if (byAccount.rows[0]) {
			return String(
				(byAccount.rows[0] as { accountId?: string }).accountId || userId,
			);
		}
	} catch (error) {
		console.error("[resolveAuthAccountId] Error:", error);
	}

	return userId;
}

/**
 * Check if user has a specific permission in an organization
 */
export async function hasPermission(
	userId: string,
	permissionKey: PermissionKey,
	orgId?: string,
): Promise<boolean> {
	if (!userId || !permissionKey) {
		return false;
	}

	try {
		const permissions = await getUserPermissions(userId, orgId);
		return permissionSatisfied(permissions, permissionKey);
	} catch (error) {
		console.error("[hasPermission] Error checking permission:", error);
		return false;
	}
}

/**
 * Check if user has any of the specified permissions in an organization
 */
export async function hasAnyPermission(
	userId: string,
	permissionKeys: PermissionKey[],
	orgId?: string,
): Promise<boolean> {
	if (!userId || !permissionKeys.length) {
		return false;
	}

	try {
		const permissions = await getUserPermissions(userId, orgId);
		return permissionKeys.some((key) =>
			permissionSatisfied(permissions, key),
		);
	} catch (error) {
		console.error("[hasAnyPermission] Error checking permissions:", error);
		return false;
	}
}

/**
 * Check if user has all of the specified permissions in an organization
 */
export async function hasAllPermissions(
	userId: string,
	permissionKeys: PermissionKey[],
	orgId?: string,
): Promise<boolean> {
	if (!userId || !permissionKeys.length) {
		return false;
	}

	try {
		const permissions = await getUserPermissions(userId, orgId);
		return permissionKeys.every((key) =>
			permissionSatisfied(permissions, key),
		);
	} catch (error) {
		console.error("[hasAllPermissions] Error checking permissions:", error);
		return false;
	}
}

/**
 * Get all effective permissions for a user in an organization
 * Returns array of permission keys
 * Optimized with Redis caching and parallel queries
 */
async function getUserPermissionsImpl(
	userId: string,
	orgId?: string,
): Promise<PermissionKey[]> {
	if (!userId) {
		return [];
	}

	// Get target orgId (with caching)
	let targetOrgId = orgId;
	if (!targetOrgId) {
		const defaultOrg = await getUserDefaultOrganization(userId);
		if (!defaultOrg) {
			return [];
		}
		targetOrgId = defaultOrg.orgId;
	}

	// Use Redis cache for permissions (never cache empty — see getOrSetNonEmptyArray)
	const cacheKey = CACHE_KEYS.rbac.permissions(userId, targetOrgId);
	const ttl = CACHE_TTLS.veryLong; // 15 minutes

	return getOrSetNonEmptyArray<PermissionKey>(
		cacheKey,
		async () => {
			try {
				const { tablesDB } = await createAdminClient();

				// Parallel: Validate access and get user roles
				const [hasAccess, userRoles] = await Promise.all([
					validateUserOrgAccess(userId, targetOrgId),
					getUserRoles(userId, targetOrgId),
				]);

				if (!hasAccess || !userRoles.length) {
					return [];
				}

				const roleIds = userRoles.map((ur) => ur.roleId);

				// Get all permissions for these roles
				const rolePermissionQueries = [];
				if (roleIds.length === 1) {
					rolePermissionQueries.push(Query.equal("roleId", roleIds[0]));
				} else if (roleIds.length > 1) {
					rolePermissionQueries.push(
						Query.or(roleIds.map((roleId) => Query.equal("roleId", roleId))),
					);
				}

				if (rolePermissionQueries.length === 0) {
					return [];
				}

				rolePermissionQueries.push(Query.limit(200)); // Increased to handle users with multiple roles

				const rolePermissions = await tablesDB.listRows({
					databaseId: appwriteConfig.databaseId || "default-db",
					tableId: "role_permissions",
					queries: rolePermissionQueries,
				});

				const permissionIds = [
					...new Set(rolePermissions.rows.map((rp: any) => rp.permissionId)),
				];

				if (!permissionIds.length) {
					return [];
				}

				// Get permission keys - batch queries to avoid Query.or() limit and string length limit

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
						tableId:
							appwriteConfig.permissionsCollectionId || "685ed87c0009d8189fc8",
						queries: permissionQueries,
					});

					allPermissions.push(...permissions.rows);
				}

				return allPermissions.map((p: any) => p.key) as PermissionKey[];
			} catch (error) {
				console.error(
					"[getUserPermissions] Error fetching permissions:",
					error,
				);
				return [];
			}
		},
		ttl,
	);
}

const getUserPermissionsCached = cache(getUserPermissionsImpl);

export async function getUserPermissions(
	userId: string,
	orgId?: string,
): Promise<PermissionKey[]> {
	return getUserPermissionsCached(userId, orgId);
}

/**
 * Get all roles assigned to a user in an organization
 * Optimized with Redis caching and parallel role name fetching
 */
export type UserRoleAssignment = {
	roleId: string;
	roleName?: string | null;
	/** Lower = higher rank for home dashboard (from DB or fallback map) */
	priority?: number;
	homeDashboardPath?: string | null;
};

async function getUserRolesImpl(
	userId: string,
	orgId: string,
): Promise<UserRoleAssignment[]> {
	if (!userId || !orgId) {
		return [];
	}

	const accountId = await resolveAuthAccountId(userId);
	// Roles may be stored under Auth accountId OR users-table document $id.
	const candidateIds = [...new Set([userId, accountId].filter(Boolean))];
	const cacheKey = CACHE_KEYS.rbac.userRoles(
		candidateIds.slice().sort().join("|"),
		orgId,
	);
	const ttl = CACHE_TTLS.veryLong;

	return getOrSetNonEmptyArray<UserRoleAssignment>(
		cacheKey,
		async () => {
			try {
				const { tablesDB } = await createAdminClient();

				const userRoles = await tablesDB.listRows({
					databaseId: appwriteConfig.databaseId || "default-db",
					tableId: "user_roles",
					queries: [
						candidateIds.length === 1
							? Query.equal("userId", candidateIds[0])
							: Query.or(
									candidateIds.map((id) => Query.equal("userId", id)),
								),
						Query.equal("orgId", orgId),
						Query.limit(50),
					],
				});

				if (!userRoles.rows.length) {
					return [];
				}

				const uniqueByRole = new Map<string, (typeof userRoles.rows)[0]>();
				for (const ur of userRoles.rows) {
					const roleId = String((ur as { roleId?: string }).roleId || "");
					if (roleId && !uniqueByRole.has(roleId)) {
						uniqueByRole.set(roleId, ur);
					}
				}

				const rolesWithNames = await Promise.all(
					[...uniqueByRole.values()].map(async (ur: any) => {
						try {
							const role = await tablesDB.getRow({
								databaseId: appwriteConfig.databaseId || "default-db",
								tableId: "roles",
								rowId: ur.roleId,
							});
							const r = role as Record<string, unknown> & { name?: string };
							const fb = ROLE_DASHBOARD_FALLBACK[ur.roleId];
							const dbPriority = r.priority;
							const dbHome = r.homeDashboardPath;
							return {
								roleId: ur.roleId,
								roleName: r?.name || null,
								priority:
									typeof dbPriority === "number" ? dbPriority : fb?.priority,
								homeDashboardPath:
									typeof dbHome === "string" && dbHome.trim()
										? dbHome.trim()
										: (fb?.homeDashboardPath ?? null),
							};
						} catch {
							const fb = ROLE_DASHBOARD_FALLBACK[ur.roleId];
							return {
								roleId: ur.roleId,
								roleName: null,
								priority: fb?.priority,
								homeDashboardPath: fb?.homeDashboardPath ?? null,
							};
						}
					}),
				);

				return rolesWithNames;
			} catch (error) {
				console.error("[getUserRoles] Error fetching roles:", error);
				return [];
			}
		},
		ttl,
	);
}

const getUserRolesCached = cache(getUserRolesImpl);

export async function getUserRoles(
	userId: string,
	orgId: string,
): Promise<UserRoleAssignment[]> {
	return getUserRolesCached(userId, orgId);
}

async function getUserDefaultOrganizationImpl(
	userId: string,
): Promise<{ orgId: string; orgRole: string } | null> {
	if (!userId) {
		return null;
	}

	const cacheKey = CACHE_KEYS.rbac.defaultOrg(userId);
	const ttl = CACHE_TTLS.static;

	return getOrSet<{ orgId: string; orgRole: string } | null>(
		cacheKey,
		async () => {
			try {
				const orgs = await getUserOrganizations(userId);
				const defaultOrg = orgs.find((o) => o.isDefault);

				if (defaultOrg) {
					return {
						orgId: defaultOrg.orgId,
						orgRole: defaultOrg.orgRole,
					};
				}

				if (orgs.length > 0) {
					return {
						orgId: orgs[0].orgId,
						orgRole: orgs[0].orgRole,
					};
				}

				return null;
			} catch (error) {
				console.error("[getUserDefaultOrganization] Error:", error);
				return null;
			}
		},
		ttl,
	);
}

const getUserDefaultOrganizationCached = cache(getUserDefaultOrganizationImpl);

export async function getUserDefaultOrganization(
	userId: string,
): Promise<{ orgId: string; orgRole: string } | null> {
	return getUserDefaultOrganizationCached(userId);
}

/**
 * Get all organizations a user belongs to
 */
export async function getUserOrganizations(
	userId: string,
): Promise<Array<{ orgId: string; orgRole: string; isDefault: boolean }>> {
	if (!userId) {
		return [];
	}

	try {
		const { tablesDB } = await createAdminClient();
		const databaseId = appwriteConfig.databaseId || "default-db";
		const usersTableId = appwriteConfig.usersCollectionId || "users";
		const accountId = await resolveAuthAccountId(userId);

		let profileDocId = userId;
		try {
			const byAccount = await tablesDB.listRows({
				databaseId,
				tableId: usersTableId,
				queries: [Query.equal("accountId", accountId), Query.limit(1)],
			});
			if (byAccount.rows[0]?.$id) {
				profileDocId = String(byAccount.rows[0].$id);
			}
		} catch {
			// keep profileDocId as provided userId
		}

		// user_organizations rows may store profile $id or Auth accountId
		const candidateIds = [
			...new Set([userId, accountId, profileDocId].filter(Boolean)),
		];

		const userOrgs = await tablesDB.listRows({
			databaseId,
			tableId: "user_organizations",
			queries: [
				candidateIds.length === 1
					? Query.equal("userId", candidateIds[0])
					: Query.or(candidateIds.map((id) => Query.equal("userId", id))),
				Query.limit(100),
			],
		});

		return userOrgs.rows.map((uo: any) => ({
			orgId: uo.orgId,
			orgRole: uo.orgRole,
			isDefault: uo.isDefault || false,
		}));
	} catch (error) {
		console.error(
			"[getUserOrganizations] Error fetching organizations:",
			error,
		);
		return [];
	}
}

/**
 * Validate that a user belongs to an organization
 */
export async function validateUserOrgAccess(
	userId: string,
	orgId: string,
): Promise<boolean> {
	if (!userId || !orgId) {
		return false;
	}

	try {
		const orgs = await getUserOrganizations(userId);
		return orgs.some((o) => o.orgId === orgId);
	} catch (error) {
		console.error("[validateUserOrgAccess] Error:", error);
		return false;
	}
}
