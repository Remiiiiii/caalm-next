/**
 * Get users by role name using the new RBAC system
 * Replaces legacy role queries on users collection
 */

import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';
import { getUserDefaultOrganization } from '@/lib/rbac/permissions';

/**
 * Map legacy role names to new RBAC role names
 */
const LEGACY_ROLE_MAP: Record<string, string[]> = {
  'executive': ['Super Admin'],
  'admin': ['Organization Admin'],
  'manager': ['Department Manager'],
  'reviewer': ['Organization Admin'], // Reviewer was merged into Organization Admin
  'scheduler': ['Organization Admin'], // Scheduler was merged into Organization Admin
  'approver': ['Department Manager'],
  'viewer': ['Viewer'],
};

/**
 * Get users by role name(s) using the new RBAC system
 * @param roleNames - Array of role names (new RBAC names or legacy names)
 * @param orgId - Optional organization ID (uses default org if not provided)
 * @param additionalFilters - Additional query filters to apply
 */
export async function getUsersByRoleNames(
  roleNames: string[],
  orgId?: string,
  additionalFilters?: {
    division?: string;
    department?: string;
    status?: string;
  }
): Promise<any[]> {
  if (!roleNames || roleNames.length === 0) {
    return [];
  }

  try {
    const { tablesDB } = await createAdminClient();

    // Map legacy role names to new RBAC role names
    const mappedRoleNames = roleNames.flatMap((roleName) => {
      const normalized = roleName.toLowerCase().trim();
      return LEGACY_ROLE_MAP[normalized] || [roleName];
    });

    // Remove duplicates
    const uniqueRoleNames = [...new Set(mappedRoleNames)];

    // Get role IDs from roles table
    const roleQueries = [];
    if (uniqueRoleNames.length === 1) {
      roleQueries.push(Query.equal('name', uniqueRoleNames[0]));
    } else {
      roleQueries.push(
        Query.or(uniqueRoleNames.map((name) => Query.equal('name', name)))
      );
    }

    const roles = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId || 'default-db',
      tableId: 'roles',
      queries: roleQueries,
    });

    if (!roles.rows.length) {
      return [];
    }

    const roleIds = roles.rows.map((r: any) => r.$id);

    // Get user IDs from user_roles table
    // If orgId not provided, we'll need to check all orgs or use default
    let targetOrgId = orgId;
    if (!targetOrgId) {
      // For queries without orgId, we'll get users from all orgs
      // This is less efficient but maintains backward compatibility
      const userRolesQueries = [];
      if (roleIds.length === 1) {
        userRolesQueries.push(Query.equal('roleId', roleIds[0]));
      } else {
        userRolesQueries.push(
          Query.or(roleIds.map((roleId) => Query.equal('roleId', roleId)))
        );
      }
      userRolesQueries.push(Query.limit(1000));

      const userRoles = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: 'user_roles',
        queries: userRolesQueries,
      });

      const userIds = [...new Set(userRoles.rows.map((ur: any) => ur.userId))];

      if (userIds.length === 0) {
        return [];
      }

      // Get user documents
      const userQueries: any[] = [];
      if (userIds.length === 1) {
        userQueries.push(Query.equal('$id', userIds[0]));
      } else {
        userQueries.push(
          Query.or(userIds.map((userId) => Query.equal('$id', userId)))
        );
      }

      // Apply additional filters
      if (additionalFilters?.division) {
        userQueries.push(Query.equal('division', additionalFilters.division));
      }
      if (additionalFilters?.department) {
        userQueries.push(Query.equal('department', additionalFilters.department));
      }
      if (additionalFilters?.status) {
        userQueries.push(Query.equal('status', additionalFilters.status));
      }

      userQueries.push(Query.limit(1000));

      const users = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: appwriteConfig.usersCollectionId || 'users',
        queries: userQueries,
      });

      return users.rows;
    } else {
      // orgId provided - more efficient query
      const userRolesQueries = [
        Query.equal('orgId', targetOrgId),
      ];

      if (roleIds.length === 1) {
        userRolesQueries.push(Query.equal('roleId', roleIds[0]));
      } else {
        userRolesQueries.push(
          Query.or(roleIds.map((roleId) => Query.equal('roleId', roleId)))
        );
      }
      userRolesQueries.push(Query.limit(1000));

      const userRoles = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: 'user_roles',
        queries: userRolesQueries,
      });

      const userIds = [...new Set(userRoles.rows.map((ur: any) => ur.userId))];

      if (userIds.length === 0) {
        return [];
      }

      // Get user documents
      const userQueries: any[] = [];
      if (userIds.length === 1) {
        userQueries.push(Query.equal('$id', userIds[0]));
      } else {
        userQueries.push(
          Query.or(userIds.map((userId) => Query.equal('$id', userId)))
        );
      }

      // Apply additional filters
      if (additionalFilters?.division) {
        userQueries.push(Query.equal('division', additionalFilters.division));
      }
      if (additionalFilters?.department) {
        userQueries.push(Query.equal('department', additionalFilters.department));
      }
      if (additionalFilters?.status) {
        userQueries.push(Query.equal('status', additionalFilters.status));
      }

      userQueries.push(Query.limit(1000));

      const users = await tablesDB.listRows({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: appwriteConfig.usersCollectionId || 'users',
        queries: userQueries,
      });

      return users.rows;
    }
  } catch (error) {
    console.error('[getUsersByRoleNames] Error:', error);
    return [];
  }
}

/**
 * Get all managers (Department Managers) - convenience function
 */
export async function getAllManagers(orgId?: string): Promise<any[]> {
  return getUsersByRoleNames(['Department Manager', 'manager'], orgId, {
    status: 'active',
  });
}

/**
 * Get managers by division
 */
export async function getManagersByDivision(
  division: string,
  orgId?: string
): Promise<any[]> {
  return getUsersByRoleNames(['Department Manager', 'manager'], orgId, {
    division,
    status: 'active',
  });
}

/**
 * Get managers by department
 */
export async function getManagersByDepartment(
  department: string,
  orgId?: string
): Promise<any[]> {
  return getUsersByRoleNames(['Department Manager', 'manager'], orgId, {
    department,
    status: 'active',
  });
}

/**
 * Get executives (Super Admins) - convenience function
 */
export async function getAllExecutives(orgId?: string): Promise<any[]> {
  return getUsersByRoleNames(['Super Admin', 'executive'], orgId, {
    status: 'active',
  });
}

/**
 * Get admins (Organization Admins) - convenience function
 */
export async function getAllAdmins(orgId?: string): Promise<any[]> {
  return getUsersByRoleNames(['Organization Admin', 'admin'], orgId, {
    status: 'active',
  });
}

