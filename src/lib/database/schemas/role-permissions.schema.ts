/**
 * Role-Permissions Schema
 * Junction table mapping permissions to roles
 */

export interface RolePermission {
  $id: string;
  roleId: string;
  permissionId: string;
  createdAt: string;
}

export const ROLE_PERMISSIONS_ATTRIBUTES = [
  {
    key: 'roleId',
    type: 'string' as const,
    size: 255,
    required: true,
  },
  {
    key: 'permissionId',
    type: 'string' as const,
    size: 255,
    required: true,
  },
] as const;

