/**
 * Dashboard Route Guards
 * Middleware functions for role-based dashboard route protection
 */

'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/actions/user.actions';
import { getUserRoles, getUserDefaultOrganization } from '@/lib/rbac/permissions';
import { getHighestPriorityRole } from '@/lib/utils/role-priority';

/**
 * Map dashboard paths to their required roles
 * A user must have at least one of the specified roles to access the dashboard
 */
const DASHBOARD_ROLE_MAP: Record<string, string[]> = {
  '/dashboard/superadmin': ['Super Admin'],
  '/dashboard/organizationadmin': ['Organization Admin'],
  '/dashboard/departmentmanager': ['Department Manager'],
  '/dashboard/viewer': ['Viewer'],
  '/dashboard/it': ['IT'],
};

/**
 * Get the appropriate dashboard URL for a user based on their highest priority role
 */
function getDashboardUrlForRole(roleName: string | null): string {
  if (!roleName) {
    return '/dashboard';
  }

  const roleToDashboardMap: Record<string, string> = {
    'Super Admin': '/dashboard/superadmin',
    'Organization Admin': '/dashboard/organizationadmin',
    'Department Manager': '/dashboard/departmentmanager',
    Viewer: '/dashboard/viewer',
    IT: '/dashboard/it',
  };

  return roleToDashboardMap[roleName] || '/dashboard';
}

/**
 * Check if user has access to a specific dashboard route
 * Returns redirect response if user doesn't have required role, null if authorized
 */
export async function redirectIfNotAuthorizedForDashboard(
  request: NextRequest
): Promise<NextResponse | null> {
  try {
    const { pathname } = request.nextUrl;

    // Find matching dashboard route
    const dashboardPath = Object.keys(DASHBOARD_ROLE_MAP).find((path) =>
      pathname.startsWith(path)
    );

    // If not a protected dashboard route, allow access
    if (!dashboardPath) {
      return null;
    }

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    // Get user's roles
    const defaultOrg = await getUserDefaultOrganization(user.$id);
    if (!defaultOrg) {
      // No organization access, redirect to sign-in
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    const userRoles = await getUserRoles(user.$id, defaultOrg.orgId);
    const userRoleNames = userRoles.map((r) => r.roleName).filter(Boolean) as string[];

    // Get required roles for this dashboard
    const requiredRoles = DASHBOARD_ROLE_MAP[dashboardPath];

    // Check if user has any of the required roles
    const hasRequiredRole = requiredRoles.some((role) =>
      userRoleNames.includes(role)
    );

    if (!hasRequiredRole) {
      // User doesn't have required role - redirect to their appropriate dashboard
      const highestPriorityRole = getHighestPriorityRole(userRoles);
      const redirectUrl = getDashboardUrlForRole(highestPriorityRole);

      // Log unauthorized access attempt
      console.warn(
        `[Dashboard Guard] Unauthorized access attempt by user ${user.$id} (roles: ${userRoleNames.join(', ')}) to ${pathname}. Redirecting to ${redirectUrl}`
      );

      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    // User has required role - allow access
    return null;
  } catch (error) {
    console.error('[redirectIfNotAuthorizedForDashboard] Error:', error);
    // On error, redirect to generic dashboard for safety
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
}

/**
 * Check if a user has a specific role
 */
export async function hasRole(
  userId: string,
  roleName: string
): Promise<boolean> {
  try {
    const defaultOrg = await getUserDefaultOrganization(userId);
    if (!defaultOrg) {
      return false;
    }

    const userRoles = await getUserRoles(userId, defaultOrg.orgId);
    return userRoles.some((role) => role.roleName === roleName);
  } catch (error) {
    console.error(`[hasRole] Error checking role ${roleName} for user ${userId}:`, error);
    return false;
  }
}
