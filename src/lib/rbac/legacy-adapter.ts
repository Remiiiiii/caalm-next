/**
 * Legacy Role Adapter
 * Maps old roles to new permissions for backward compatibility
 */

import { normalizeUserRole, UserRole } from '@/constants/rbac';
import { PERMISSIONS } from '@/constants/permissions';
import type { PermissionKey } from '@/constants/permissions';

/**
 * Map legacy role to permission set
 * Used during migration period to maintain backward compatibility
 */
export function getLegacyRolePermissions(role: string | null | undefined): PermissionKey[] {
  const normalizedRole = normalizeUserRole(role);

  switch (normalizedRole) {
    case 'admin':
      return Object.values(PERMISSIONS).flatMap((category) =>
        Object.values(category)
      ) as PermissionKey[];

    case 'approver':
      return [
        PERMISSIONS.CALENDAR.VIEW_ALL,
        PERMISSIONS.CALENDAR.CREATE,
        PERMISSIONS.CALENDAR.EDIT_ALL,
        PERMISSIONS.CALENDAR.DELETE_ALL,
        PERMISSIONS.EVENTS.APPROVE,
        PERMISSIONS.EVENTS.RESCHEDULE,
        PERMISSIONS.EVENTS.CANCEL,
        PERMISSIONS.CONTRACTS.VIEW,
        PERMISSIONS.CONTRACTS.APPROVE,
        PERMISSIONS.AUDIT.VIEW,
      ];

    case 'reviewer':
      return [
        PERMISSIONS.CALENDAR.VIEW_TEAM,
        PERMISSIONS.CALENDAR.CREATE,
        PERMISSIONS.CALENDAR.EDIT_OWN,
        PERMISSIONS.EVENTS.APPROVE,
        PERMISSIONS.CONTRACTS.VIEW,
        PERMISSIONS.CONTRACTS.REVIEW,
      ];

    case 'scheduler':
      return [
        PERMISSIONS.CALENDAR.VIEW_OWN,
        PERMISSIONS.CALENDAR.CREATE,
        PERMISSIONS.CALENDAR.EDIT_OWN,
        PERMISSIONS.EVENTS.CREATE,
        PERMISSIONS.EVENTS.INVITE,
      ];

    case 'viewer':
    default:
      return [
        PERMISSIONS.CALENDAR.VIEW_OWN,
        PERMISSIONS.CONTRACTS.VIEW,
      ];
  }
}

/**
 * Check if a legacy role has a specific permission
 */
export function legacyRoleHasPermission(
  role: string | null | undefined,
  permission: PermissionKey
): boolean {
  const permissions = getLegacyRolePermissions(role);
  return permissions.includes(permission);
}

