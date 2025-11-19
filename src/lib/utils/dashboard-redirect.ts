/**
 * Utility functions for dashboard redirects based on user roles
 */

/**
 * Map role names to dashboard URLs
 */
const ROLE_TO_DASHBOARD_MAP: Record<string, string> = {
  'Super Admin': '/dashboard/superadmin',
  'Organization Admin': '/dashboard/organizationadmin',
  'Department Manager': '/dashboard/departmentmanager',
  Viewer: '/dashboard/viewer',
};

/**
 * Get dashboard URL for a user based on their role
 * @param userId - User ID
 * @param orgId - Organization ID (optional, defaults to 'default_organization')
 * @returns Dashboard URL or '/dashboard' as fallback
 */
export async function getDashboardUrlForUser(
  userId: string,
  orgId: string = 'default_organization'
): Promise<string> {
  try {
    // Fetch user's roles from the API
    const response = await fetch(
      `/api/users/${userId}/roles${orgId ? `?orgId=${orgId}` : ''}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch user roles for dashboard redirect');
      return '/dashboard';
    }

    const data = await response.json();

    if (data.success && data.data?.roles && data.data.roles.length > 0) {
      // Get the first role name (users typically have one primary role)
      const roleName = data.data.roles[0]?.name;

      if (roleName && ROLE_TO_DASHBOARD_MAP[roleName]) {
        return ROLE_TO_DASHBOARD_MAP[roleName];
      }

      // If role name doesn't match, try to find any matching role
      for (const role of data.data.roles) {
        if (role.name && ROLE_TO_DASHBOARD_MAP[role.name]) {
          return ROLE_TO_DASHBOARD_MAP[role.name];
        }
      }
    }

    // Fallback to default dashboard
    return '/dashboard';
  } catch (error) {
    console.error('Error fetching dashboard URL for user:', error);
    return '/dashboard';
  }
}

/**
 * Get dashboard URL from role name (for client-side use)
 * @param roleName - Role name
 * @returns Dashboard URL or '/dashboard' as fallback
 */
export function getDashboardUrlFromRoleName(
  roleName: string | null | undefined
): string {
  if (!roleName) {
    return '/dashboard';
  }

  return ROLE_TO_DASHBOARD_MAP[roleName] || '/dashboard';
}
