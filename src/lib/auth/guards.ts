import { CalendarEvent } from '@/lib/actions/calendar.actions';
import { getUserByAccountId } from '@/lib/actions/user.actions';
import {
  resolveCalendarPermissions,
  hasCalendarPermission,
  resolvePermissionKey,
  CalendarPermissionAction,
} from './permissions';
import { CalendarPermissionMap, UserRole } from '@/constants/rbac';
import { getUserRoles, getUserDefaultOrganization } from '@/lib/rbac/permissions';

export type CalendarPermissionEvaluation = {
  allowed: boolean;
  userRole: UserRole | null;
  permissions: CalendarPermissionMap | null;
  userId: string | null;
  reason?: 'user_not_found' | 'permission_denied' | 'pending_approval';
  requiredApproval?: boolean;
};

type EvaluateCalendarPermissionArgs = {
  userAccountId: string;
  action: CalendarPermissionAction;
  event?: CalendarEvent | null;
  teamIds?: string[];
};

export const evaluateCalendarPermission = async ({
  userAccountId,
  action,
  event,
  teamIds = [],
}: EvaluateCalendarPermissionArgs): Promise<CalendarPermissionEvaluation> => {
  console.log('[evaluateCalendarPermission] Checking permission:', {
    userAccountId,
    action,
    eventId: event?.$id,
  });

  const user = await getUserByAccountId(userAccountId);

  if (!user) {
    console.error(
      '[evaluateCalendarPermission] User not found for accountId:',
      userAccountId
    );
    return {
      allowed: false,
      userRole: null,
      permissions: null,
      userId: null,
      reason: 'user_not_found',
    };
  }

  // Get user's role from database
  const defaultOrg = await getUserDefaultOrganization(user.$id);
  const userRoles = defaultOrg ? await getUserRoles(user.$id, defaultOrg.orgId) : [];
  const roleName = userRoles[0]?.roleName || '';
  
  // Map new RBAC roles to legacy calendar roles for compatibility
  // This is temporary until calendar permissions are fully migrated
  let calendarRole: UserRole = 'viewer';
  if (roleName === 'Super Admin' || roleName === 'Organization Admin') {
    calendarRole = 'admin';
  } else if (roleName === 'Department Manager') {
    calendarRole = 'approver';
  } else if (roleName === 'Viewer') {
    calendarRole = 'viewer';
  }

  console.log('[evaluateCalendarPermission] User found:', {
    userId: user.$id,
    roleName,
    calendarRole,
    email: user.email,
  });

  // Ensure overrides is an array (parse from JSON string if needed)
  let overrides = event?.overrides || [];
  if (typeof overrides === 'string') {
    try {
      overrides = JSON.parse(overrides);
    } catch (error) {
      console.error(
        '[evaluateCalendarPermission] Error parsing overrides:',
        error
      );
      overrides = [];
    }
  }
  if (!Array.isArray(overrides)) {
    console.warn(
      '[evaluateCalendarPermission] overrides is not an array:',
      overrides
    );
    overrides = [];
  }

  const permissions = resolveCalendarPermissions({
    role: calendarRole,
    overrides: overrides,
    context: {
      userId: user.$id,
      teamIds,
    },
  });

  const permissionKey = resolvePermissionKey(action);
  let allowed = hasCalendarPermission(permissions, permissionKey);

  // Special case: allow event creators to cancel their own events even without cancelEvent permission
  if (!allowed && action === 'cancel' && event) {
    const isEventCreator =
      (user.$id && event.createdByUserId === user.$id) ||
      (userAccountId &&
        (event.createdByAccountId === userAccountId ||
          event.createdBy === userAccountId));

    if (isEventCreator) {
      console.log(
        '[evaluateCalendarPermission] Allowing event creator to cancel their own event:',
        {
          userId: user.$id,
          userAccountId,
          eventId: event.$id,
          eventCreatedBy: event.createdBy,
          eventCreatedByAccountId: event.createdByAccountId,
          eventCreatedByUserId: event.createdByUserId,
        }
      );
      allowed = true;
    }
  }

  console.log('[evaluateCalendarPermission] Permission check:', {
    permissionKey,
    allowed,
    permissions,
    isEventCreator:
      event &&
      action === 'cancel' &&
      ((user.$id && event.createdByUserId === user.$id) ||
        (userAccountId &&
          (event.createdByAccountId === userAccountId ||
            event.createdBy === userAccountId))),
  });

  if (!allowed) {
    console.error('[evaluateCalendarPermission] Permission denied:', {
      userRole: calendarRole,
      roleName,
      permissionKey,
      permissions,
      eventId: event?.$id,
      eventCreatedBy: event?.createdBy,
      eventCreatedByAccountId: event?.createdByAccountId,
      eventCreatedByUserId: event?.createdByUserId,
    });
    return {
      allowed,
      userRole: calendarRole,
      permissions,
      userId: user.$id,
      reason: 'permission_denied',
    };
  }

  // Block updates if event has a pending approval, but allow cancellations
  // (cancellation creates its own approval request)
  if (
    event &&
    event.requiresApproval &&
    event.approvalStatus === 'pending' &&
    action === 'update'
  ) {
    return {
      allowed: false,
      userRole: calendarRole,
      permissions,
      userId: user.$id,
      reason: 'pending_approval',
      requiredApproval: true,
    };
  }

  // Allow cancellation even if there's a pending approval for creation
  // The cancellation will create its own approval request if needed

  return {
    allowed: true,
    userRole: calendarRole,
    permissions,
    userId: user.$id,
  };
};
