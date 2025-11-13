/**
 * Role Display Utilities
 * Functions to fetch and display role names dynamically
 */

import { getRole } from '@/lib/rbac/roles';

/**
 * Get role name from roleId
 * Falls back to capitalized roleId if role not found
 */
export async function getRoleDisplayName(roleId: string | null | undefined): Promise<string> {
  if (!roleId) {
    return '';
  }

  try {
    const role = await getRole(roleId);
    return role?.name || capitalizeRoleId(roleId);
  } catch (error) {
    console.error('[getRoleDisplayName] Error:', error);
    return capitalizeRoleId(roleId);
  }
}

/**
 * Capitalize roleId as fallback
 */
function capitalizeRoleId(roleId: string): string {
  // Remove 'role_' prefix if present
  const cleaned = roleId.replace(/^role_/, '');
  // Replace underscores with spaces and capitalize
  return cleaned
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get role name from legacy role string
 * This is a client-side fallback for legacy role values
 */
export function getLegacyRoleDisplayName(role: string | null | undefined): string {
  if (!role) {
    return '';
  }

  // Handle legacy role mappings
  const roleMap: Record<string, string> = {
    'super-admin': 'Super Admin',
    'organization-admin': 'Organization Admin',
    'department-manager': 'Department Manager',
    scheduler: 'Scheduler',
    reviewer: 'Reviewer',
    viewer: 'Viewer',
    executive: 'Executive',
    manager: 'Manager',
    admin: 'Admin',
    'head_admin': 'Executive',
    'hr_admin': 'Admin',
  };

  const normalized = role.toLowerCase().trim();
  if (roleMap[normalized]) {
    return roleMap[normalized];
  }

  // Fallback: capitalize first letter
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

