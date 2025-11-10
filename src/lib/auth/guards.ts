import { CalendarEvent } from '@/lib/actions/calendar.actions';
import { getUserByAccountId } from '@/lib/actions/user.actions';
import {
  resolveCalendarPermissions,
  hasCalendarPermission,
  resolvePermissionKey,
  CalendarPermissionAction,
} from './permissions';
import { CalendarPermissionMap, UserRole } from '@/constants/rbac';

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
  const user = await getUserByAccountId(userAccountId);

  if (!user) {
    return {
      allowed: false,
      userRole: null,
      permissions: null,
      userId: null,
      reason: 'user_not_found',
    };
  }

  const permissions = resolveCalendarPermissions({
    role: user.role,
    overrides: event?.overrides || [],
    context: {
      userId: user.$id,
      teamIds,
    },
  });

  const permissionKey = resolvePermissionKey(action);
  const allowed = hasCalendarPermission(permissions, permissionKey);

  if (!allowed) {
    return {
      allowed,
      userRole: user.role,
      permissions,
      userId: user.$id,
      reason: 'permission_denied',
    };
  }

  if (
    event &&
    event.requiresApproval &&
    event.approvalStatus === 'pending' &&
    (action === 'update' || action === 'cancel')
  ) {
    return {
      allowed: false,
      userRole: user.role,
      permissions,
      userId: user.$id,
      reason: 'pending_approval',
      requiredApproval: true,
    };
  }

  return {
    allowed: true,
    userRole: user.role,
    permissions,
    userId: user.$id,
  };
};

