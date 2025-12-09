import {
  CALENDAR_ROLE_PERMISSIONS,
  CalendarPermissionKey,
  CalendarPermissionMap,
  PermissionOverrideRecord,
  UserRole,
} from '@/constants/rbac';

export type CalendarPermissionAction =
  | 'viewSensitive'
  | 'create'
  | 'update'
  | 'cancel'
  | 'manageParticipants';

const ACTION_TO_PERMISSION_KEY: Record<
  CalendarPermissionAction,
  CalendarPermissionKey
> = {
  viewSensitive: 'viewSensitiveDetails',
  create: 'createEvent',
  update: 'updateEvent',
  cancel: 'cancelEvent',
  manageParticipants: 'manageParticipants',
};

type PrincipalContext = {
  userId: string;
  teamIds?: string[];
};

type ResolveCalendarPermissionsArgs = {
  role: UserRole;
  overrides?: PermissionOverrideRecord[];
  context: PrincipalContext;
};

const clonePermissionMap = (
  permissions: CalendarPermissionMap
): CalendarPermissionMap => ({
  viewSensitiveDetails: permissions.viewSensitiveDetails,
  createEvent: permissions.createEvent,
  updateEvent: permissions.updateEvent,
  cancelEvent: permissions.cancelEvent,
  manageParticipants: permissions.manageParticipants,
});

const applyOverride = (
  current: CalendarPermissionMap,
  override: PermissionOverrideRecord
): CalendarPermissionMap => {
  const next = clonePermissionMap(current);

  (Object.keys(override.permissions) as CalendarPermissionKey[]).forEach(
    (key) => {
      if (typeof override.permissions[key] === 'boolean') {
        next[key] = override.permissions[key];
      }
    }
  );

  return next;
};

const matchesPrincipal = (
  override: PermissionOverrideRecord,
  context: PrincipalContext
) => {
  if (override.principalType === 'user') {
    return override.principalId === context.userId;
  }

  if (!context.teamIds || context.teamIds.length === 0) {
    return false;
  }

  return context.teamIds.includes(override.principalId);
};

export const resolveCalendarPermissions = ({
  role,
  overrides = [],
  context,
}: ResolveCalendarPermissionsArgs): CalendarPermissionMap => {
  // Ensure role is valid, fallback to viewer if not
  const validRole = role in CALENDAR_ROLE_PERMISSIONS 
    ? role 
    : 'viewer';
  
  if (role !== validRole) {
    console.warn('[resolveCalendarPermissions] Invalid role, using viewer:', {
      provided: role,
      fallback: validRole,
    });
  }
  
  const basePermissions = clonePermissionMap(
    CALENDAR_ROLE_PERMISSIONS[validRole]
  );


  if (!overrides.length) {
    return basePermissions;
  }

  return overrides
    .filter((override) => matchesPrincipal(override, context))
    .reduce((acc, override) => applyOverride(acc, override), basePermissions);
};

export const hasCalendarPermission = (
  permissions: CalendarPermissionMap,
  key: CalendarPermissionKey
) => {
  return Boolean(permissions[key]);
};

export const resolvePermissionKey = (
  action: CalendarPermissionAction
): CalendarPermissionKey => ACTION_TO_PERMISSION_KEY[action];



