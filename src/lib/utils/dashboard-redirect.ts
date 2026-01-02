/**
 * Utility functions for dashboard redirects based on user roles
 */

import { getHighestPriorityRole } from '@/lib/utils/role-priority';

/**
 * Map role names to dashboard URLs
 */
const ROLE_TO_DASHBOARD_MAP: Record<string, string> = {
  'Super Admin': '/dashboard/superadmin',
  'Organization Admin': '/dashboard/organizationadmin',
  'Department Manager': '/dashboard/departmentmanager',
  Viewer: '/dashboard/viewer',
  IT: '/dashboard/it',
};

// Client-side cache for dashboard URLs (5 minute TTL)
const dashboardUrlCache = new Map<string, { url: string; timestamp: number }>();

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
    // Check client-side cache first
    const cacheKey = `${userId}:${orgId}`;
    const cached = dashboardUrlCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 300000) {
      return cached.url;
    }

    // Fetch user's roles from the API (now cached server-side)
    const response = await fetch(
      `/api/users/${userId}/roles${orgId ? `?orgId=${orgId}` : ''}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'force-cache', // Use browser cache
      }
    );

    if (!response.ok) {
      return '/dashboard';
    }

    const data = await response.json();

    let dashboardUrl = '/dashboard';
    if (data.success && data.data?.roles && data.data.roles.length > 0) {
      // Convert role objects to the format expected by getHighestPriorityRole
      const roles = data.data.roles.map((r: any) => ({ roleName: r.name }));
      const selectedRole = getHighestPriorityRole(roles);

      if (selectedRole && ROLE_TO_DASHBOARD_MAP[selectedRole]) {
        dashboardUrl = ROLE_TO_DASHBOARD_MAP[selectedRole];
      }
    }

    // Cache the result
    dashboardUrlCache.set(cacheKey, { url: dashboardUrl, timestamp: Date.now() });
    
    return dashboardUrl;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching dashboard URL for user:', error);
    }
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
