/**
 * Navigation Permission Mappings
 * Maps navigation items to required permissions
 */

import { PERMISSIONS } from './permissions';
import type { PermissionKey } from './permissions';

export interface NavigationItem {
  name: string;
  icon: string;
  url: string;
  permissions: PermissionKey[]; // Array of permissions (user needs ANY of these)
  requireAll?: boolean; // If true, user needs ALL permissions
}

export interface NavigationSection {
  header: string;
  items: NavigationItem[];
}

/**
 * Navigation configuration with permission-based access control
 */
export const PERMISSION_BASED_NAV: NavigationSection[] = [
  {
    header: 'Dashboard',
    items: [
      {
        name: 'Executive',
        icon: '/assets/icons/dashboard.svg',
        url: '/dashboard/executive',
        permissions: [PERMISSIONS.CALENDAR.VIEW_ALL, PERMISSIONS.CONTRACTS.VIEW],
      },
      {
        name: 'Manager',
        icon: '/assets/icons/dashboard.svg',
        url: '/dashboard/manager',
        permissions: [PERMISSIONS.CALENDAR.VIEW_TEAM, PERMISSIONS.CONTRACTS.VIEW],
      },
      {
        name: 'Admin',
        icon: '/assets/icons/dashboard.svg',
        url: '/dashboard/admin',
        permissions: [
          PERMISSIONS.USERS.VIEW,
          PERMISSIONS.USERS.ASSIGN_ROLES,
          PERMISSIONS.SETTINGS.VIEW,
        ],
      },
    ],
  },
  {
    header: 'Calendar',
    items: [
      {
        name: 'Calendar View',
        icon: '/assets/icons/calendar.svg',
        url: '/calendar',
        permissions: [
          PERMISSIONS.CALENDAR.VIEW_OWN,
          PERMISSIONS.CALENDAR.VIEW_TEAM,
          PERMISSIONS.CALENDAR.VIEW_ALL,
        ],
      },
    ],
  },
  {
    header: 'Contracts',
    items: [
      {
        name: 'All Contracts',
        icon: '/assets/icons/documents.svg',
        url: '/contracts',
        permissions: [PERMISSIONS.CONTRACTS.VIEW],
      },
      {
        name: 'My Contracts',
        icon: '/assets/icons/my-contracts.svg',
        url: '/my-contracts',
        permissions: [PERMISSIONS.CONTRACTS.VIEW],
      },
      {
        name: 'Proposals & Approvals',
        icon: '/assets/icons/edit.svg',
        url: '/contracts/approvals',
        permissions: [PERMISSIONS.CONTRACTS.APPROVE, PERMISSIONS.CONTRACTS.REVIEW],
      },
      {
        name: 'Advanced Resources',
        icon: '/assets/icons/search.svg',
        url: '/contracts/advanced-resources',
        permissions: [PERMISSIONS.CONTRACTS.VIEW],
      },
    ],
  },
  {
    header: 'Team',
    items: [
      {
        name: 'User Management',
        icon: '/assets/icons/users.svg',
        url: '/dashboard/user-management',
        permissions: [PERMISSIONS.USERS.VIEW],
      },
      {
        name: 'Role Management',
        icon: '/assets/icons/users.svg',
        url: '/dashboard/admin/roles',
        permissions: [PERMISSIONS.USERS.ASSIGN_ROLES],
      },
      {
        name: 'Assign Tasks',
        icon: '/assets/icons/task.svg',
        url: '/team/tasks',
        permissions: [PERMISSIONS.EVENTS.CREATE, PERMISSIONS.EVENTS.INVITE],
      },
    ],
  },
  {
    header: 'Audits',
    items: [
      {
        name: 'Training & Certifications',
        icon: '/assets/icons/calendar.svg',
        url: '/audits/training',
        permissions: [PERMISSIONS.AUDIT.VIEW],
      },
      {
        name: 'Audit Logs',
        icon: '/assets/icons/documents.svg',
        url: '/audits/audit',
        permissions: [PERMISSIONS.AUDIT.VIEW],
      },
      {
        name: 'Compliance Status',
        icon: '/assets/icons/file-check.svg',
        url: '/audits/status',
        permissions: [PERMISSIONS.CONTRACTS.VIEW, PERMISSIONS.AUDIT.VIEW],
      },
    ],
  },
];

/**
 * Helper function to check if user has permission for navigation item
 */
export function hasNavigationPermission(
  userPermissions: PermissionKey[],
  item: NavigationItem
): boolean {
  if (item.permissions.length === 0) return true; // No permission required

  if (item.requireAll) {
    // User needs ALL permissions
    return item.permissions.every((perm) => userPermissions.includes(perm));
  } else {
    // User needs ANY permission
    return item.permissions.some((perm) => userPermissions.includes(perm));
  }
}

