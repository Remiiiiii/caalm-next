import type { CalendarPermissionMap, UserRole } from "@/constants/rbac";
import type { CalendarEvent } from "@/lib/actions/calendar.actions";
import { getUserByAccountId } from "@/lib/actions/user.actions";
import {
	getUserDefaultOrganization,
	getUserPermissions,
} from "@/lib/rbac/permissions";
import {
	type CalendarPermissionAction,
	hasCalendarPermission,
	isCalendarEventOwner,
	resolveCalendarPermissions,
	resolvePermissionKey,
} from "./permissions";

export type CalendarPermissionEvaluation = {
	allowed: boolean;
	/** Legacy calendar role label for logs only; authz uses permission keys. */
	userRole: UserRole | null;
	permissions: CalendarPermissionMap | null;
	userId: string | null;
	reason?: "user_not_found" | "permission_denied" | "pending_approval";
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
		console.error(
			"[evaluateCalendarPermission] User not found for accountId:",
			userAccountId,
		);
		return {
			allowed: false,
			userRole: null,
			permissions: null,
			userId: null,
			reason: "user_not_found",
		};
	}

	const defaultOrg = await getUserDefaultOrganization(user.$id);
	const heldPermissions = await getUserPermissions(user.$id, defaultOrg?.orgId);

	// Ensure overrides is an array (parse from JSON string if needed)
	let overrides = event?.overrides || [];
	if (typeof overrides === "string") {
		try {
			overrides = JSON.parse(overrides);
		} catch (error) {
			console.error(
				"[evaluateCalendarPermission] Error parsing overrides:",
				error,
			);
			overrides = [];
		}
	}
	if (!Array.isArray(overrides)) {
		console.warn(
			"[evaluateCalendarPermission] overrides is not an array:",
			overrides,
		);
		overrides = [];
	}

	const isOwner = isCalendarEventOwner({
		userId: user.$id,
		userAccountId,
		event,
	});

	const permissions = resolveCalendarPermissions({
		heldPermissions,
		isEventOwner: isOwner,
		overrides,
		context: {
			userId: user.$id,
			teamIds,
		},
	});

	const permissionKey = resolvePermissionKey(action);
	let allowed = hasCalendarPermission(permissions, permissionKey);

	// Owners can cancel their own events when they have delete_own / cancel
	// (already reflected above). Keep creator cancel as a last-resort for
	// events created before delete_own was assigned, matching prior behavior.
	if (!allowed && action === "cancel" && isOwner) {
		allowed = true;
	}

	if (!allowed) {
		console.error("[evaluateCalendarPermission] Permission denied:", {
			permissionKey,
			permissions,
			heldCount: heldPermissions.length,
			isOwner,
			eventId: event?.$id,
		});
		return {
			allowed,
			userRole: null,
			permissions,
			userId: user.$id,
			reason: "permission_denied",
		};
	}

	// Block updates if event has a pending approval, but allow cancellations
	if (
		event?.requiresApproval &&
		event.approvalStatus === "pending" &&
		action === "update"
	) {
		return {
			allowed: false,
			userRole: null,
			permissions,
			userId: user.$id,
			reason: "pending_approval",
			requiredApproval: true,
		};
	}

	return {
		allowed: true,
		userRole: null,
		permissions,
		userId: user.$id,
	};
};
