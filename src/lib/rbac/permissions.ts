/**
 * Permission Checking Utilities
 * Organization-aware permission checking functions
 */

import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';
import type { PermissionKey } from '@/constants/permissions';

/**
 * Check if user has a specific permission in an organization
 */
export async function hasPermission(
  userId: string,
  permissionKey: PermissionKey,
  orgId?: string
): Promise<boolean> {
  if (!userId || !permissionKey) {
    return false;
  }

  try {
    const permissions = await getUserPermissions(userId, orgId);
    return permissions.includes(permissionKey);
  } catch (error) {
    console.error('[hasPermission] Error checking permission:', error);
    return false;
  }
}

/**
 * Check if user has any of the specified permissions in an organization
 */
export async function hasAnyPermission(
  userId: string,
  permissionKeys: PermissionKey[],
  orgId?: string
): Promise<boolean> {
  if (!userId || !permissionKeys.length) {
    return false;
  }

  try {
    const permissions = await getUserPermissions(userId, orgId);
    return permissionKeys.some((key) => permissions.includes(key));
  } catch (error) {
    console.error('[hasAnyPermission] Error checking permissions:', error);
    return false;
  }
}

/**
 * Check if user has all of the specified permissions in an organization
 */
export async function hasAllPermissions(
  userId: string,
  permissionKeys: PermissionKey[],
  orgId?: string
): Promise<boolean> {
  if (!userId || !permissionKeys.length) {
    return false;
  }

  try {
    const permissions = await getUserPermissions(userId, orgId);
    return permissionKeys.every((key) => permissions.includes(key));
  } catch (error) {
    console.error('[hasAllPermissions] Error checking permissions:', error);
    return false;
  }
}

/**
 * Get all effective permissions for a user in an organization
 * Returns array of permission keys
 */
export async function getUserPermissions(
  userId: string,
  orgId?: string
): Promise<PermissionKey[]> {
  if (!userId) {
    return [];
  }

  try {
    const { tablesDB } = await createAdminClient();

    // If orgId not provided, get user's default organization
    let targetOrgId = orgId;
    if (!targetOrgId) {
      const defaultOrg = await getUserDefaultOrganization(userId);
      if (!defaultOrg) {
        return [];
      }
      targetOrgId = defaultOrg.orgId;
    }

    // Validate user belongs to organization
    const hasAccess = await validateUserOrgAccess(userId, targetOrgId);
    if (!hasAccess) {
      return [];
    }

    // Get all roles assigned to user in this organization
    const userRoles = await getUserRoles(userId, targetOrgId);
    if (!userRoles.length) {
      return [];
    }

    const roleIds = userRoles.map((ur) => ur.roleId);

    // Get all permissions for these roles
    const rolePermissions = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId || 'default-db',
      tableId: 'role_permissions',
      queries: [
        Query.equal('roleId', roleIds),
      ],
    });

    const permissionIds = [
      ...new Set(rolePermissions.rows.map((rp: any) => rp.permissionId)),
    ];

    if (!permissionIds.length) {
      return [];
    }

    // Get permission keys
    const permissions = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId || 'default-db',
      tableId: 'permissions',
      queries: [
        Query.equal('$id', permissionIds),
      ],
    });

    return permissions.rows.map((p: any) => p.key) as PermissionKey[];
  } catch (error) {
    console.error('[getUserPermissions] Error fetching permissions:', error);
    return [];
  }
}

/**
 * Get all roles assigned to a user in an organization
 */
export async function getUserRoles(
  userId: string,
  orgId: string
): Promise<Array<{ roleId: string; roleName?: string }>> {
  if (!userId || !orgId) {
    return [];
  }

  try {
    const { tablesDB } = await createAdminClient();

    const userRoles = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId || 'default-db',
      tableId: 'user_roles',
      queries: [
        Query.equal('userId', userId),
        Query.equal('orgId', orgId),
      ],
    });

    // Fetch role names
    const rolesWithNames = await Promise.all(
      userRoles.rows.map(async (ur: any) => {
        try {
          const role = await tablesDB.getRow({
            databaseId: appwriteConfig.databaseId || 'default-db',
            tableId: 'roles',
            rowId: ur.roleId,
          });
          return {
            roleId: ur.roleId,
            roleName: (role as any)?.name || null,
          };
        } catch {
          return {
            roleId: ur.roleId,
            roleName: null,
          };
        }
      })
    );

    return rolesWithNames;
  } catch (error) {
    console.error('[getUserRoles] Error fetching roles:', error);
    return [];
  }
}

/**
 * Get all organizations a user belongs to
 */
export async function getUserOrganizations(
  userId: string
): Promise<Array<{ orgId: string; orgRole: string; isDefault: boolean }>> {
  if (!userId) {
    return [];
  }

  try {
    const { tablesDB } = await createAdminClient();

    const userOrgs = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId || 'default-db',
      tableId: 'user_organizations',
      queries: [Query.equal('userId', userId)],
    });

    return userOrgs.rows.map((uo: any) => ({
      orgId: uo.orgId,
      orgRole: uo.orgRole,
      isDefault: uo.isDefault || false,
    }));
  } catch (error) {
    console.error('[getUserOrganizations] Error fetching organizations:', error);
    return [];
  }
}

/**
 * Get user's default organization
 */
export async function getUserDefaultOrganization(
  userId: string
): Promise<{ orgId: string; orgRole: string } | null> {
  if (!userId) {
    return null;
  }

  try {
    const orgs = await getUserOrganizations(userId);
    const defaultOrg = orgs.find((o) => o.isDefault);
    
    if (defaultOrg) {
      return {
        orgId: defaultOrg.orgId,
        orgRole: defaultOrg.orgRole,
      };
    }

    // If no default, return first organization
    if (orgs.length > 0) {
      return {
        orgId: orgs[0].orgId,
        orgRole: orgs[0].orgRole,
      };
    }

    return null;
  } catch (error) {
    console.error('[getUserDefaultOrganization] Error:', error);
    return null;
  }
}

/**
 * Validate that a user belongs to an organization
 */
export async function validateUserOrgAccess(
  userId: string,
  orgId: string
): Promise<boolean> {
  if (!userId || !orgId) {
    return false;
  }

  try {
    const orgs = await getUserOrganizations(userId);
    return orgs.some((o) => o.orgId === orgId);
  } catch (error) {
    console.error('[validateUserOrgAccess] Error:', error);
    return false;
  }
}

