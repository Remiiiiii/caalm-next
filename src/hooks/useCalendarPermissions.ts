import { useMemo } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import {
  CalendarPermissionMap,
  PermissionOverrideRecord,
  UserRole,
} from '@/constants/rbac';
import { resolveCalendarPermissions } from '@/lib/auth/permissions';

type UseCalendarPermissionsArgs = {
  eventOverrides?: PermissionOverrideRecord[];
  userId?: string;
  teamIds?: string[];
};

const EMPTY_PERMISSIONS: CalendarPermissionMap = {
  viewSensitiveDetails: false,
  createEvent: false,
  updateEvent: false,
  cancelEvent: false,
  manageParticipants: false,
};

export const useCalendarPermissions = ({
  eventOverrides = [],
  userId,
  teamIds = [],
}: UseCalendarPermissionsArgs = {}) => {
  const { role, loading } = useUserRole();

  const permissions = useMemo(() => {
    if (loading) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[useCalendarPermissions] Still loading, returning empty permissions');
      }
      return EMPTY_PERMISSIONS;
    }

    const resolved = resolveCalendarPermissions({
      role: role as UserRole,
      overrides: eventOverrides,
      context: {
        userId: userId || '',
        teamIds,
      },
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('[useCalendarPermissions] Resolved permissions:', {
        role,
        userId,
        permissions: resolved,
        createEvent: resolved.createEvent,
      });
    }

    return resolved;
  }, [eventOverrides, role, loading, userId, teamIds]);

  return {
    permissions,
    loading,
  };
};


