/**
 * User-Roles Schema
 * Junction table mapping roles to users within organization context
 */

export interface UserRole {
  $id: string;
  userId: string;
  roleId: string;
  orgId: string; // Organization context for the role assignment
  assignedAt: string;
  assignedBy: string;
}

export const USER_ROLES_ATTRIBUTES = [
  {
    key: 'userId',
    type: 'string' as const,
    size: 255,
    required: true,
  },
  {
    key: 'roleId',
    type: 'string' as const,
    size: 255,
    required: true,
  },
  {
    key: 'orgId',
    type: 'string' as const,
    size: 255,
    required: true,
  },
  {
    key: 'assignedBy',
    type: 'string' as const,
    size: 255,
    required: true,
  },
] as const;

