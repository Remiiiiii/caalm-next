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
  requiresElevated?: boolean; // If true, shows lock icon when permission is missing
  hiddenForRoles?: string[]; // Roles that should not see this item
  viewerReadOnly?: boolean; // If true, Viewer role sees this as read-only
  viewerFullAccess?: boolean; // If true, Viewer gets full read access (for audits)
}

export interface NavigationSection {
  header: string;
  items: NavigationItem[];
}

/**
 * Navigation configuration with permission-based access control
 * Based on complete visibility matrix for all roles
 */
export const PERMISSION_BASED_NAV: NavigationSection[] = [
  {
    header: 'Dashboard',
    items: [
      // Dashboard items are dynamically generated based on user roles
      // See Sidebar.tsx for role-based dashboard generation
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
        // Viewers can see but it's read-only
        viewerReadOnly: true,
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
        // Hidden for Department Manager, visible for Viewer (read-only)
        hiddenForRoles: ['Department Manager'],
        viewerReadOnly: true,
      },
      {
        name: 'My Contracts',
        icon: '/assets/icons/my-contracts.svg',
        url: '/my-contracts',
        permissions: [PERMISSIONS.CONTRACTS.VIEW],
        viewerReadOnly: true,
      },
      {
        name: 'Proposals & Approvals',
        icon: '/assets/icons/edit.svg',
        url: '/contracts/approvals',
        permissions: [
          PERMISSIONS.CONTRACTS.APPROVE,
          PERMISSIONS.CONTRACTS.REVIEW,
        ],
        // Requires approval permission (shows lock icon if missing)
        requiresElevated: true,
        viewerReadOnly: true,
      },
      {
        name: 'Advanced Resources',
        icon: '/assets/icons/search.svg',
        url: '/contracts/advanced-resources',
        permissions: [PERMISSIONS.CONTRACTS.VIEW],
        // Hidden for Department Manager and Viewer
        hiddenForRoles: ['Department Manager', 'Viewer'],
      },
    ],
  },
  {
    header: 'Licenses',
    items: [
      {
        name: 'All Licenses',
        icon: '/assets/icons/license.svg',
        url: '/licenses',
        permissions: [PERMISSIONS.CONTRACTS.VIEW],
        // Hidden for Department Manager, visible for Viewer (read-only)
        hiddenForRoles: ['Department Manager'],
        viewerReadOnly: true,
      },
      {
        name: 'Department Licenses',
        icon: '/assets/icons/department.svg',
        url: '/licenses/department',
        permissions: [PERMISSIONS.CONTRACTS.VIEW],
        viewerReadOnly: true,
      },
      {
        name: 'Proposals & Approvals',
        icon: '/assets/icons/edit.svg',
        url: '/licenses/approvals',
        permissions: [
          PERMISSIONS.CONTRACTS.APPROVE,
          PERMISSIONS.CONTRACTS.REVIEW,
        ],
        requiresElevated: true,
        viewerReadOnly: true,
      },
    ],
  },
  {
    header: 'Documents',
    items: [
      {
        name: 'Uploads',
        icon: '/assets/icons/uploads.svg',
        url: '/uploads',
        permissions: [PERMISSIONS.CONTRACTS.VIEW],
        // Hidden for Viewer (prevents contamination)
        hiddenForRoles: ['Viewer'],
      },
      {
        name: 'Images',
        icon: '/assets/icons/images.svg',
        url: '/images',
        permissions: [PERMISSIONS.CONTRACTS.VIEW],
        viewerReadOnly: true,
      },
      {
        name: 'Media',
        icon: '/assets/icons/media.svg',
        url: '/media',
        permissions: [PERMISSIONS.CONTRACTS.VIEW],
        viewerReadOnly: true,
      },
      {
        name: 'Others',
        icon: '/assets/icons/others.svg',
        url: '/others',
        permissions: [PERMISSIONS.CONTRACTS.VIEW],
        viewerReadOnly: true,
      },
    ],
  },
  {
    header: 'Audits',
    items: [
      {
        name: 'Compliance Status',
        icon: '/assets/icons/compliance-status.svg',
        url: '/audits/status',
        permissions: [PERMISSIONS.AUDIT.VIEW, PERMISSIONS.CONTRACTS.VIEW],
        // Hidden for Department Manager, full read access for Viewer
        hiddenForRoles: ['Department Manager'],
        viewerReadOnly: true,
        viewerFullAccess: true, // Viewers get full read access to audits
      },
      {
        name: 'Audit Logs',
        icon: '/assets/icons/audit-logs.svg',
        url: '/audits/audit',
        permissions: [PERMISSIONS.AUDIT.VIEW],
        // Super Admin sees all orgs, Org Admin sees own org, Viewer gets full read
        hiddenForRoles: ['Department Manager'],
        viewerReadOnly: true,
        viewerFullAccess: true,
      },
    ],
  },
  {
    header: 'Team',
    items: [
      {
        name: 'User Management',
        icon: '/assets/icons/user-management.svg',
        url: '/dashboard/user-management',
        permissions: [PERMISSIONS.USERS.VIEW],
        viewerReadOnly: true,
      },
      {
        name: 'Role Management',
        icon: '/assets/icons/users.svg',
        url: '/dashboard/admin/roles',
        permissions: [PERMISSIONS.USERS.ASSIGN_ROLES],
        requiresElevated: true,
      },
      {
        name: 'Assign Tasks',
        icon: '/assets/icons/task.svg',
        url: '/team/tasks',
        permissions: [PERMISSIONS.EVENTS.CREATE, PERMISSIONS.EVENTS.INVITE],
        // Hidden for Viewer
        hiddenForRoles: ['Viewer'],
      },
    ],
  },
  {
    header: 'Reports & Analytics',
    items: [
      {
        name: 'Overview',
        icon: '/assets/icons/department.svg',
        url: '/analytics',
        permissions: [
          PERMISSIONS.CONTRACTS.VIEW,
          PERMISSIONS.CALENDAR.VIEW_ALL,
          PERMISSIONS.CALENDAR.VIEW_TEAM,
        ],
        viewerReadOnly: true,
      },
      {
        name: 'Quick View',
        icon: '/assets/icons/analytics.svg',
        url: '/analytics/quick-view',
        permissions: [
          PERMISSIONS.CONTRACTS.VIEW,
          PERMISSIONS.CALENDAR.VIEW_ALL,
          PERMISSIONS.CALENDAR.VIEW_TEAM,
        ],
        viewerReadOnly: true,
      },
      {
        name: 'C Suite',
        icon: '/assets/icons/department.svg',
        url: '/analytics/c-suite',
        permissions: [PERMISSIONS.CALENDAR.VIEW_ALL, PERMISSIONS.SETTINGS.VIEW],
        // Hidden for Department Manager, visible for Viewer (read-only)
        hiddenForRoles: ['Department Manager'],
        requiresElevated: true,
        viewerReadOnly: true,
      },
    ],
  },
  {
    header: 'Settings',
    items: [
      {
        name: 'System Settings',
        icon: '/assets/icons/settings.svg',
        url: '/settings/system',
        permissions: [PERMISSIONS.SETTINGS.VIEW, PERMISSIONS.SETTINGS.EDIT],
        // Only Super Admin
        hiddenForRoles: ['Organization Admin', 'Department Manager', 'Viewer'],
        requiresElevated: true,
      },
      {
        name: 'Organization Settings',
        icon: '/assets/icons/settings.svg',
        url: '/settings/organization',
        permissions: [PERMISSIONS.SETTINGS.VIEW, PERMISSIONS.SETTINGS.EDIT],
        // Hidden for Department Manager, read-only for Viewer
        hiddenForRoles: ['Department Manager'],
        viewerReadOnly: true,
      },
      {
        name: 'Billing & Integrations',
        icon: '/assets/icons/settings.svg',
        url: '/settings/billing',
        permissions: [
          PERMISSIONS.SETTINGS.BILLING,
          PERMISSIONS.SETTINGS.INTEGRATIONS,
        ],
        // Hidden for Department Manager and Viewer
        hiddenForRoles: ['Department Manager', 'Viewer'],
        requiresElevated: true,
      },
    ],
  },
  {
    header: 'My Roles & Permissions',
    items: [
      {
        name: 'View My Access',
        icon: '/assets/icons/users.svg',
        url: '/settings/permissions',
        permissions: [], // Everyone can view their own permissions
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
