/**
 * Default System Roles
 * Seed data for default system roles with permission assignments
 */

import { createRole, assignPermissionsToRole } from '@/lib/rbac/roles';
import { PERMISSIONS } from '@/constants/permissions';

export interface DefaultRoleDefinition {
  name: string;
  description: string;
  isSystemRole: boolean;
  permissions: string[];
}

export const DEFAULT_ROLES: DefaultRoleDefinition[] = [
  {
    name: 'Super Admin',
    description: 'Full system access with all permissions',
    isSystemRole: true,
    permissions: Object.values(PERMISSIONS).flatMap((category) =>
      Object.values(category)
    ),
  },
  {
    name: 'Organization Admin',
    description: 'Full access within organization',
    isSystemRole: true,
    permissions: Object.values(PERMISSIONS).flatMap((category) =>
      Object.values(category)
    ),
  },
  {
    name: 'Department Manager',
    description: 'Manage department operations, approve events and contracts',
    isSystemRole: true,
    permissions: [
      PERMISSIONS.CALENDAR.VIEW_TEAM,
      PERMISSIONS.CALENDAR.EDIT_ALL,
      PERMISSIONS.EVENTS.APPROVE,
      PERMISSIONS.EVENTS.RESCHEDULE,
      PERMISSIONS.CONTRACTS.REVIEW,
      PERMISSIONS.CONTRACTS.APPROVE,
      PERMISSIONS.USERS.VIEW,
      PERMISSIONS.USERS.INVITE,
    ],
  },
  {
    name: 'Viewer',
    description: 'Read-only access',
    isSystemRole: true,
    permissions: [
      PERMISSIONS.CALENDAR.VIEW_OWN,
      PERMISSIONS.CONTRACTS.VIEW,
    ],
  },
  {
    name: 'IT',
    description: 'IT/Software Engineering staff with access to monitoring, CI/CD, security, and system administration',
    isSystemRole: true,
    permissions: [
      PERMISSIONS.IT.VIEW_RATE_LIMITS,
      PERMISSIONS.IT.VIEW_SYSTEM_LOGS,
      PERMISSIONS.IT.MANAGE_API_KEYS,
      PERMISSIONS.IT.VIEW_ANALYTICS,
      PERMISSIONS.IT.MANAGE_DEPLOYMENTS,
      PERMISSIONS.IT.VIEW_MONITORING,
      PERMISSIONS.IT.MANAGE_CI_CD,
      PERMISSIONS.IT.VIEW_SECURITY,
      PERMISSIONS.IT.MANAGE_DATABASE,
      PERMISSIONS.IT.VIEW_INCIDENTS,
      PERMISSIONS.AUDIT.VIEW,
    ],
  },
];

/**
 * Seed default system roles
 */
export async function seedDefaultRoles(createdBy: string): Promise<void> {
  console.log('Seeding default system roles...');

  for (const roleDef of DEFAULT_ROLES) {
    try {
      // Check if role already exists
      const { listRoles } = await import('@/lib/rbac/roles');
      const existingRoles = await listRoles(null); // Get system roles
      const existing = existingRoles.find((r) => r.name === roleDef.name);

      let roleId: string;
      if (existing) {
        console.log(`Role "${roleDef.name}" already exists, skipping creation`);
        roleId = existing.$id;
      } else {
        const role = await createRole({
          name: roleDef.name,
          description: roleDef.description,
          orgId: null, // System role
          isSystemRole: roleDef.isSystemRole,
          createdBy,
        });
        roleId = role.$id;
        console.log(`Created role: ${roleDef.name}`);
      }

      // Assign permissions
      await assignPermissionsToRole(roleId, roleDef.permissions as any);
      console.log(`Assigned ${roleDef.permissions.length} permissions to ${roleDef.name}`);
    } catch (error) {
      console.error(`Error seeding role "${roleDef.name}":`, error);
      throw error;
    }
  }

  console.log('✓ Default roles seeded successfully');
}

