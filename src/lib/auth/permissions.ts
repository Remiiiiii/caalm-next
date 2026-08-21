/**
 * Calendar permission resolution.
 *
 * Authz is driven by the org permission catalog (PERMISSIONS.CALENDAR / EVENTS),
 * not by legacy role-name → admin/approver/viewer bridges.
 */

import { PERMISSIONS, type PermissionKey } from "@/constants/permissions";
import {
	CALENDAR_ROLE_PERMISSIONS,
	type CalendarPermissionKey,
	type CalendarPermissionMap,
	type PermissionOverrideRecord,
	type UserRole,
} from "@/constants/rbac";
import { permissionSatisfied } from "@/lib/rbac/permission-implications";

export type CalendarPermissionAction =
	| "viewSensitive"
	| "create"
	| "update"
	| "cancel"
	| "manageParticipants";

const ACTION_TO_PERMISSION_KEY: Record<
	CalendarPermissionAction,
	CalendarPermissionKey
> = {
	viewSensitive: "viewSensitiveDetails",
	create: "createEvent",
	update: "updateEvent",
	cancel: "cancelEvent",
	manageParticipants: "manageParticipants",
};

type PrincipalContext = {
	userId: string;
	teamIds?: string[];
};

type ResolveCalendarPermissionsArgs = {
	/** @deprecated Prefer heldPermissions from the org catalog. */
	role?: UserRole;
	/** Org permission keys held by the user (catalog source of truth). */
	heldPermissions?: Iterable<string>;
	/** True when the target event is owned by this user. */
	isEventOwner?: boolean;
	overrides?: PermissionOverrideRecord[];
	context: PrincipalContext;
};

const clonePermissionMap = (
	permissions: CalendarPermissionMap,
): CalendarPermissionMap => ({
	viewSensitiveDetails: permissions.viewSensitiveDetails,
	createEvent: permissions.createEvent,
	updateEvent: permissions.updateEvent,
	cancelEvent: permissions.cancelEvent,
	manageParticipants: permissions.manageParticipants,
});

const EMPTY_PERMISSIONS: CalendarPermissionMap = {
	viewSensitiveDetails: false,
	createEvent: false,
	updateEvent: false,
	cancelEvent: false,
	manageParticipants: false,
};

const applyOverride = (
	current: CalendarPermissionMap,
	override: PermissionOverrideRecord,
): CalendarPermissionMap => {
	const next = clonePermissionMap(current);

	(Object.keys(override.permissions) as CalendarPermissionKey[]).forEach(
		(key) => {
			if (typeof override.permissions[key] === "boolean") {
				next[key] = override.permissions[key];
			}
		},
	);

	return next;
};

const matchesPrincipal = (
	override: PermissionOverrideRecord,
	context: PrincipalContext,
) => {
	if (override.principalType === "user") {
		return override.principalId === context.userId;
	}

	if (!context.teamIds || context.teamIds.length === 0) {
		return false;
	}

	return context.teamIds.includes(override.principalId);
};

function holds(held: Iterable<string>, key: PermissionKey): boolean {
	return permissionSatisfied(held, key);
}

/**
 * Build the legacy CalendarPermissionMap shape from org catalog keys.
 * Keeps UI/API consumers stable while authz is permission-based.
 */
export function buildCalendarPermissionMapFromCatalog(params: {
	held: Iterable<string>;
	isEventOwner?: boolean;
}): CalendarPermissionMap {
	const { held, isEventOwner = false } = params;

	const canCreate =
		holds(held, PERMISSIONS.CALENDAR.CREATE) ||
		holds(held, PERMISSIONS.EVENTS.CREATE);

	const canEditAll = holds(held, PERMISSIONS.CALENDAR.EDIT_ALL);
	const canEditOwn = holds(held, PERMISSIONS.CALENDAR.EDIT_OWN) || canEditAll;
	const canReschedule = holds(held, PERMISSIONS.EVENTS.RESCHEDULE);

	const canDeleteAll = holds(held, PERMISSIONS.CALENDAR.DELETE_ALL);
	const canDeleteOwn =
		holds(held, PERMISSIONS.CALENDAR.DELETE_OWN) || canDeleteAll;
	const canCancelEvent = holds(held, PERMISSIONS.EVENTS.CANCEL);

	const canInvite = holds(held, PERMISSIONS.EVENTS.INVITE);

	const canViewTeam =
		holds(held, PERMISSIONS.CALENDAR.VIEW_TEAM) ||
		holds(held, PERMISSIONS.CALENDAR.VIEW_ALL);
	const canApprove = holds(held, PERMISSIONS.EVENTS.APPROVE);

	return {
		createEvent: canCreate,
		// EDIT_OWN / RESCHEDULE apply when the user owns the event (or always for EDIT_ALL)
		updateEvent: canEditAll || canReschedule || (isEventOwner && canEditOwn),
		cancelEvent:
			canDeleteAll || canCancelEvent || (isEventOwner && canDeleteOwn),
		manageParticipants: canInvite || canCreate || canEditAll,
		// Restricted event details: team/all viewers, editors, approvers, creators
		viewSensitiveDetails:
			canViewTeam ||
			canEditAll ||
			canApprove ||
			canCreate ||
			(isEventOwner && canEditOwn),
	};
}

/**
 * Resolve calendar capability map.
 * Prefer `heldPermissions` (org catalog). Legacy `role` is fallback only.
 */
export const resolveCalendarPermissions = ({
	role,
	heldPermissions,
	isEventOwner = false,
	overrides = [],
	context,
}: ResolveCalendarPermissionsArgs): CalendarPermissionMap => {
	let basePermissions: CalendarPermissionMap;

	if (heldPermissions) {
		basePermissions = buildCalendarPermissionMapFromCatalog({
			held: heldPermissions,
			isEventOwner,
		});
	} else if (role) {
		const validRole = role in CALENDAR_ROLE_PERMISSIONS ? role : "viewer";
		if (role !== validRole) {
			console.warn(
				"[resolveCalendarPermissions] Invalid legacy role, using viewer:",
				{ provided: role, fallback: validRole },
			);
		}
		basePermissions = clonePermissionMap(CALENDAR_ROLE_PERMISSIONS[validRole]);
	} else {
		basePermissions = clonePermissionMap(EMPTY_PERMISSIONS);
	}

	if (!overrides.length) {
		return basePermissions;
	}

	return overrides
		.filter((override) => matchesPrincipal(override, context))
		.reduce((acc, override) => applyOverride(acc, override), basePermissions);
};

export const hasCalendarPermission = (
	permissions: CalendarPermissionMap,
	key: CalendarPermissionKey,
) => {
	return Boolean(permissions[key]);
};

export const resolvePermissionKey = (
	action: CalendarPermissionAction,
): CalendarPermissionKey => ACTION_TO_PERMISSION_KEY[action];

/** True when the event was created by this user (document id or auth account id). */
export function isCalendarEventOwner(params: {
	userId?: string | null;
	userAccountId?: string | null;
	event?: {
		createdByUserId?: string | null;
		createdByAccountId?: string | null;
		createdBy?: string | null;
	} | null;
}): boolean {
	const { userId, userAccountId, event } = params;
	if (!event) return false;

	if (userId && event.createdByUserId === userId) return true;
	if (
		userAccountId &&
		(event.createdByAccountId === userAccountId ||
			event.createdBy === userAccountId)
	) {
		return true;
	}
	if (userId && event.createdBy === userId) return true;
	return false;
}
