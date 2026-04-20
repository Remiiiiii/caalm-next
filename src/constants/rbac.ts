export type CalendarSensitivity = "standard" | "restricted" | "confidential";

export type CalendarApprovalStatus =
	| "not_required"
	| "pending"
	| "approved"
	| "rejected"
	| "changes_requested";

export type PermissionOverridePrincipalType = "user" | "team";

export type CalendarPermissionKey =
	| "viewSensitiveDetails"
	| "createEvent"
	| "updateEvent"
	| "cancelEvent"
	| "manageParticipants";

export type CalendarPermissionMap = Record<CalendarPermissionKey, boolean>;

export type UserRole =
	| "scheduler"
	| "reviewer"
	| "approver"
	| "viewer"
	| "admin";

export const USER_ROLES: UserRole[] = [
	"admin",
	"approver",
	"reviewer",
	"scheduler",
	"viewer",
];

export const ROLE_LABELS: Record<UserRole, string> = {
	admin: "Admin",
	scheduler: "Scheduler",
	reviewer: "Reviewer",
	approver: "Approver",
	viewer: "Viewer",
};

export const isUserRole = (value: string): value is UserRole => {
	return USER_ROLES.includes(value as UserRole);
};

/**
 * Normalize a role string to a valid calendar role.
 * Used for calendar permissions compatibility.
 * Returns 'viewer' as default if role is invalid or null.
 */
export const normalizeUserRole = (
	role: string | null | undefined,
): UserRole => {
	if (!role) return "viewer";
	const normalized = role.trim().toLowerCase();
	return isUserRole(normalized) ? normalized : "viewer";
};

export const ROLE_HIERARCHY: UserRole[] = [
	"admin",
	"approver",
	"reviewer",
	"scheduler",
	"viewer",
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
	standard: "Standard",
	restricted: "Restricted",
	confidential: "Confidential",
};
