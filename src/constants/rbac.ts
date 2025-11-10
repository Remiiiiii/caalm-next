export type CalendarSensitivity = 'standard' | 'restricted' | 'confidential';

export type CalendarApprovalStatus =
  | 'not_required'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'changes_requested';

export type PermissionOverridePrincipalType = 'user' | 'team';

export type CalendarPermissionKey =
  | 'viewSensitiveDetails'
  | 'createEvent'
  | 'updateEvent'
  | 'cancelEvent'
  | 'manageParticipants';

export type CalendarPermissionMap = Record<CalendarPermissionKey, boolean>;

export type UserRole =
  | 'scheduler'
  | 'reviewer'
  | 'approver'
  | 'viewer'
  | 'admin';

export const USER_ROLES: UserRole[] = [
  'admin',
  'approver',
  'reviewer',
  'scheduler',
  'viewer',
];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  scheduler: 'Scheduler',
  reviewer: 'Reviewer',
  approver: 'Approver',
  viewer: 'Viewer',
};

export const isUserRole = (value: string): value is UserRole => {
  return USER_ROLES.includes(value as UserRole);
};

export const ROLE_HIERARCHY: UserRole[] = [
  'admin',
  'approver',
  'reviewer',
  'scheduler',
  'viewer',
];

export const CALENDAR_ROLE_PERMISSIONS: Record<
  UserRole,
  CalendarPermissionMap
> = {
  admin: {
    viewSensitiveDetails: true,
    createEvent: true,
    updateEvent: true,
    cancelEvent: true,
    manageParticipants: true,
  },
  approver: {
    viewSensitiveDetails: true,
    createEvent: true,
    updateEvent: true,
    cancelEvent: true,
    manageParticipants: true,
  },
  reviewer: {
    viewSensitiveDetails: true,
    createEvent: true,
    updateEvent: true,
    cancelEvent: false,
    manageParticipants: true,
  },
  scheduler: {
    viewSensitiveDetails: false,
    createEvent: true,
    updateEvent: true,
    cancelEvent: false,
    manageParticipants: true,
  },
  viewer: {
    viewSensitiveDetails: false,
    createEvent: false,
    updateEvent: false,
    cancelEvent: false,
    manageParticipants: false,
  },
};

export interface PermissionOverrideRecord {
  principalId: string;
  principalType: PermissionOverridePrincipalType;
  permissions: CalendarPermissionMap;
  grantedBy: string;
  grantedAt: string;
  expiresAt?: string;
}

export interface CalendarAccessPolicy {
  eventId: string;
  sensitivityLevel: CalendarSensitivity;
  defaultRoles: UserRole[];
  overrides: PermissionOverrideRecord[];
}

export const SENSITIVITY_LABELS: Record<CalendarSensitivity, string> = {
  standard: 'Standard',
  restricted: 'Restricted',
  confidential: 'Confidential',
};

const LEGACY_ROLE_MAPPING: Record<string, UserRole> = {
  admin: 'admin',
  executive: 'approver',
  approver: 'approver',
  reviewer: 'reviewer',
  manager: 'reviewer',
  scheduler: 'scheduler',
  coordinator: 'scheduler',
  staff: 'scheduler',
  contributor: 'scheduler',
  viewer: 'viewer',
};

export const isLegacyRole = (role?: string | null): boolean => {
  if (!role) {
    return false;
  }
  return Boolean(LEGACY_ROLE_MAPPING[role.toLowerCase()]);
};

export const normalizeUserRole = (role?: string | null): UserRole => {
  if (!role) {
    return 'viewer';
  }
  // Trim whitespace and convert to lowercase for consistent matching
  const normalizedKey = role.trim().toLowerCase();
  const mappedRole = LEGACY_ROLE_MAPPING[normalizedKey] || 'viewer';
  
  // Log normalization for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('[normalizeUserRole]', {
      input: role,
      normalized: normalizedKey,
      mapped: mappedRole,
    });
  }
  
  return mappedRole;
};

export type LegacyRole = 'executive' | 'manager' | 'admin' | 'viewer';

export const mapUserRoleToLegacy = (role?: UserRole): LegacyRole => {
  switch (role) {
    case 'admin':
      return 'admin';
    case 'approver':
      return 'executive';
    case 'reviewer':
      return 'manager';
    case 'scheduler':
      return 'manager';
    default:
      return 'viewer';
  }
};

