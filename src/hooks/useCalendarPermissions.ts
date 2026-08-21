import { useMemo } from "react";
import type {
	CalendarPermissionMap,
	PermissionOverrideRecord,
} from "@/constants/rbac";
import { usePermissions } from "@/hooks/usePermissions";
import { resolveCalendarPermissions } from "@/lib/auth/permissions";

type UseCalendarPermissionsArgs = {
	eventOverrides?: PermissionOverrideRecord[];
	userId?: string;
	teamIds?: string[];
	/** When resolving for a specific event, pass whether the user owns it. */
	isEventOwner?: boolean;
};

const EMPTY_PERMISSIONS: CalendarPermissionMap = {
	viewSensitiveDetails: false,
	createEvent: false,
	updateEvent: false,
	cancelEvent: false,
	manageParticipants: false,
};

/**
 * Calendar gates from the org permission catalog (not legacy role names).
 */
export const useCalendarPermissions = ({
	eventOverrides = [],
	userId,
	teamIds = [],
	isEventOwner = false,
}: UseCalendarPermissionsArgs = {}) => {
	const { permissions: heldPermissions, loading } = usePermissions();

	const permissions = useMemo(() => {
		if (loading) {
			return EMPTY_PERMISSIONS;
		}

		return resolveCalendarPermissions({
			heldPermissions,
			isEventOwner,
			overrides: eventOverrides,
			context: {
				userId: userId || "",
				teamIds,
			},
		});
	}, [eventOverrides, heldPermissions, loading, userId, teamIds, isEventOwner]);

	return {
		permissions,
		loading,
	};
};
