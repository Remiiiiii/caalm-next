import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "../appwrite/config";

/**
 * Shared Calendar and Delegation Actions
 * Priority 2: Shared calendars and delegation so assistants and teams can manage events collaboratively
 *
 * Outlook-style calendar sharing: Users share their primary calendar with others,
 * with granular permission levels controlling what others can see and do.
 */

/**
 * Permission levels for calendar sharing (mimics Outlook)
 * These match Microsoft Outlook's calendar sharing permission levels
 */
export type CalendarPermissionLevel =
	| "view_busy" // Can view when I'm busy (free/busy only)
	| "view_titles" // Can view titles and locations
	| "view_all" // Can view all details
	| "edit" // Can edit events
	| "delegate"; // Can manage calendar and respond on behalf of owner

/**
 * Permission level labels and descriptions for UI display
 */
export const CALENDAR_PERMISSION_LABELS: Record<
	CalendarPermissionLevel,
	{ label: string; description: string }
> = {
	view_busy: {
		label: "Can view when I'm busy",
		description: "Shows only free/busy times with no event details",
	},
	view_titles: {
		label: "Can view titles and locations",
		description:
			"Shows event titles and locations, but not descriptions or participants",
	},
	view_all: {
		label: "Can view all details",
		description:
			"Shows complete event information including descriptions and participants",
	},
	edit: {
		label: "Can edit",
		description: "Can create, modify, and delete events in your calendar",
	},
	delegate: {
		label: "Delegate",
		description:
			"Can manage your calendar and respond to meeting requests on your behalf",
	},
};

/**
 * Mapping of users to their permission levels on a calendar
 */
export interface CalendarSharePermission {
	userId: string;
	permissionLevel: CalendarPermissionLevel;
	grantedAt: string;
	grantedBy: string; // User ID who granted the permission
}

/**
 * Shared Calendar - represents a user's primary calendar that can be shared with others
 * Each user has one primary calendar (their events), which can be shared with multiple users
 * at different permission levels, similar to Outlook's calendar sharing.
 */
export interface SharedCalendar {
	$id: string;
	name: string;
	description?: string;
	ownerId: string; // User ID of the calendar owner (the primary calendar owner)
	ownerAccountId: string; // Account ID of the calendar owner
	organizationId: string;
	isPrimaryCalendar: boolean; // True for user's primary calendar (defaults to true)
	isTeamCalendar: boolean; // Legacy: For team calendars
	teamId?: string; // Optional team ID if this is a team calendar
	color?: string; // Calendar color for UI display
	isPublic: boolean; // Whether calendar is visible to all organization members
	// New: Per-user permissions (replaces simple sharedWith array)
	sharePermissions?: CalendarSharePermission[]; // Array of users with their permission levels
	// Legacy: Keep for backward compatibility during migration
	sharedWith?: string[]; // Array of user IDs (deprecated - use sharePermissions instead)
	createdAt: string;
	updatedAt: string;
}

export interface CalendarDelegation {
	$id: string;
	calendarId: string;
	delegatorId: string; // User ID who is delegating
	delegateId: string; // User ID who receives delegation
	permissions: CalendarDelegationPermission[];
	canCreateEvents: boolean;
	canEditEvents: boolean;
	canDeleteEvents: boolean;
	canManageParticipants: boolean;
	canViewSensitiveDetails: boolean;
	startDate?: string; // Optional: delegation start date
	endDate?: string; // Optional: delegation end date
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export type CalendarDelegationPermission =
	| "view"
	| "create"
	| "edit"
	| "delete"
	| "manage_participants"
	| "view_sensitive";

export interface CreateSharedCalendarData {
	name: string;
	description?: string;
	ownerId: string;
	ownerAccountId: string;
	organizationId: string;
	isTeamCalendar?: boolean;
	teamId?: string;
	color?: string;
	isPublic?: boolean;
	sharedWith?: string[]; // Array of user IDs to share with
}

export interface CreateDelegationData {
	calendarId: string;
	delegatorId: string;
	delegateId: string;
	permissions: CalendarDelegationPermission[];
	canCreateEvents?: boolean;
	canEditEvents?: boolean;
	canDeleteEvents?: boolean;
	canManageParticipants?: boolean;
	canViewSensitiveDetails?: boolean;
	startDate?: string;
	endDate?: string;
}

const getSharedCalendarsCollectionId = (): string => {
	const collectionId =
		process.env.NEXT_PUBLIC_APPWRITE_SHARED_CALENDARS_COLLECTION ||
		"shared_calendars";
	if (!collectionId) {
		throw new Error("Shared calendars collection ID not configured");
	}
	return collectionId;
};

const getCalendarDelegationsCollectionId = (): string => {
	const collectionId =
		process.env.NEXT_PUBLIC_APPWRITE_CALENDAR_DELEGATIONS_COLLECTION ||
		"calendar_delegations";
	if (!collectionId) {
		throw new Error("Calendar delegations collection ID not configured");
	}
	return collectionId;
};

/**
 * Create a shared calendar
 */
export const createSharedCalendar = async (
	data: CreateSharedCalendarData,
): Promise<SharedCalendar> => {
	try {
		const { tablesDB } = await createAdminClient();
		const collectionId = getSharedCalendarsCollectionId();

		if (!appwriteConfig.databaseId) {
			throw new Error(
				"Database ID is not configured. Please set NEXT_PUBLIC_APPWRITE_DATABASE environment variable.",
			);
		}

		if (!collectionId) {
			throw new Error(
				"Shared calendars collection ID is not configured. Please set NEXT_PUBLIC_APPWRITE_SHARED_CALENDARS_COLLECTION environment variable.",
			);
		}

		const calendarId = ID.unique();

		const response = await tablesDB.createRow({
			databaseId: appwriteConfig.databaseId,
			tableId: collectionId,
			rowId: calendarId,
			data: {
				name: data.name,
				description: data.description || null,
				ownerId: data.ownerId,
				ownerAccountId: data.ownerAccountId,
				organizationId: data.organizationId,
				isTeamCalendar: data.isTeamCalendar || false,
				teamId: data.teamId || null,
				color: data.color || null,
				isPublic: data.isPublic || false,
				sharedWith: data.sharedWith || [], // Store as array directly
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		});

		// Ensure sharedWith is an array (handle legacy JSON strings if any)
		const calendar = response as any;
		if (calendar.sharedWith) {
			if (typeof calendar.sharedWith === "string") {
				try {
					calendar.sharedWith = JSON.parse(calendar.sharedWith);
				} catch {
					calendar.sharedWith = [];
				}
			} else if (!Array.isArray(calendar.sharedWith)) {
				calendar.sharedWith = [];
			}
		} else {
			calendar.sharedWith = [];
		}

		return calendar as unknown as SharedCalendar;
	} catch (error: any) {
		console.error("[SERVER] createSharedCalendar] Error:", error);

		// Provide more helpful error messages
		if (
			error?.message?.includes("Table with the requested ID could not be found")
		) {
			throw new Error(
				`Shared calendars table "${getSharedCalendarsCollectionId()}" not found in Appwrite. ` +
					`Please create the table in your Appwrite database or set the correct collection ID in ` +
					`NEXT_PUBLIC_APPWRITE_SHARED_CALENDARS_COLLECTION environment variable.`,
			);
		}

		if (
			error?.message?.includes(
				"Database with the requested ID could not be found",
			)
		) {
			throw new Error(
				`Database "${appwriteConfig.databaseId}" not found. ` +
					`Please verify NEXT_PUBLIC_APPWRITE_DATABASE environment variable is set correctly.`,
			);
		}

		throw error;
	}
};

/**
 * Get shared calendars for a user
 */
export const getSharedCalendarsForUser = async (
	userId: string,
	organizationId: string,
): Promise<SharedCalendar[]> => {
	const { tablesDB } = await createAdminClient();
	const collectionId = getSharedCalendarsCollectionId();

	// Optimized: Fetch all calendars in organization in a single query, then filter client-side
	// This reduces from 4 queries to 1 query, significantly improving performance
	const allOrgCalendars = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId: collectionId,
		queries: [Query.equal("organizationId", organizationId)],
	});

	// Filter calendars client-side for better performance
	const _ownedCalendars = {
		rows: allOrgCalendars.rows.filter((cal: any) => cal.ownerId === userId),
	};

	// CRITICAL: Only include calendars that are EXPLICITLY shared with this user
	// Do NOT include public/team calendars unless they're also explicitly shared
	// This ensures users only see events from calendars they have explicit access to
	// IMPORTANT: Exclude calendars owned by the user - "Shared Calendars" should only
	// show calendars that OTHER users have shared WITH the current user (recipient perspective)
	const sharedCalendars = allOrgCalendars.rows.filter((cal: any) => {
		// Exclude calendars owned by the user - they should not appear in "Shared Calendars" list
		if (cal.ownerId === userId) return false;

		// Check new permission-based sharing first
		let sharePermissions: CalendarSharePermission[] = [];
		if (cal.sharePermissions) {
			if (Array.isArray(cal.sharePermissions)) {
				sharePermissions = cal.sharePermissions;
			} else if (typeof cal.sharePermissions === "string") {
				try {
					sharePermissions = JSON.parse(cal.sharePermissions);
				} catch {
					sharePermissions = [];
				}
			}
		}

		// Check if user has a permission entry (new model)
		const hasPermission = sharePermissions.some(
			(p: CalendarSharePermission) => p.userId === userId,
		);
		if (hasPermission) return true;

		// Fall back to legacy sharedWith array for backward compatibility
		let sharedWith: string[] = [];
		if (cal.sharedWith) {
			if (Array.isArray(cal.sharedWith)) {
				sharedWith = cal.sharedWith;
			} else if (typeof cal.sharedWith === "string") {
				try {
					sharedWith = JSON.parse(cal.sharedWith);
				} catch {
					sharedWith = [];
				}
			}
		}

		// Only include if explicitly shared (via permission or sharedWith)
		// Do NOT include public/team calendars just because they're public/team
		return Array.isArray(sharedWith) && sharedWith.includes(userId);
	});

	// Return ONLY calendars shared WITH the user (recipient perspective)
	// Do NOT include calendars owned by the user - those belong in "My Calendars", not "Shared Calendars"
	// Normalize all calendars (handle both array and JSON string formats for both fields)
	return sharedCalendars.map((cal: any) => normalizeCalendar(cal));
};

/**
 * Get a shared calendar by ID
 */
export const getSharedCalendarById = async (
	calendarId: string,
): Promise<SharedCalendar | null> => {
	try {
		const { tablesDB } = await createAdminClient();
		const collectionId = getSharedCalendarsCollectionId();

		const response = await tablesDB.getRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: collectionId,
			rowId: calendarId,
		});

		// Ensure sharedWith is an array (handle both array and JSON string formats)
		const calendar = response as any;
		if (calendar.sharedWith) {
			if (Array.isArray(calendar.sharedWith)) {
				// Already an array, use it as is
			} else if (typeof calendar.sharedWith === "string") {
				// Legacy JSON string format, parse it
				try {
					calendar.sharedWith = JSON.parse(calendar.sharedWith);
				} catch {
					calendar.sharedWith = [];
				}
			} else {
				calendar.sharedWith = [];
			}
		} else {
			calendar.sharedWith = [];
		}

		return calendar as unknown as SharedCalendar;
	} catch (error) {
		console.error("[SERVER] getSharedCalendarById] Error:", error);
		return null;
	}
};

/**
 * Update shared calendar (e.g., to add/remove shared users)
 */
export const updateSharedCalendar = async (
	calendarId: string,
	updates: {
		name?: string;
		description?: string;
		color?: string;
		isPublic?: boolean;
		isTeamCalendar?: boolean;
		teamId?: string;
		sharedWith?: string[];
	},
): Promise<SharedCalendar> => {
	const { tablesDB } = await createAdminClient();
	const collectionId = getSharedCalendarsCollectionId();

	const updateData: Record<string, unknown> = {
		updatedAt: new Date().toISOString(),
	};

	if (updates.name !== undefined) updateData.name = updates.name;
	if (updates.description !== undefined)
		updateData.description = updates.description || null;
	if (updates.color !== undefined) updateData.color = updates.color || null;
	if (updates.isPublic !== undefined) updateData.isPublic = updates.isPublic;
	if (updates.isTeamCalendar !== undefined)
		updateData.isTeamCalendar = updates.isTeamCalendar;
	if (updates.teamId !== undefined) updateData.teamId = updates.teamId || null;

	// Pass sharedWith array directly (Appwrite Tables supports arrays)
	if (updates.sharedWith !== undefined) {
		updateData.sharedWith = updates.sharedWith;
	}

	const response = await tablesDB.updateRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: collectionId,
		rowId: calendarId,
		data: updateData,
	});

	// Ensure sharedWith is an array (handle legacy JSON strings if any)
	const calendar = response as any;
	if (calendar.sharedWith) {
		if (typeof calendar.sharedWith === "string") {
			try {
				calendar.sharedWith = JSON.parse(calendar.sharedWith);
			} catch {
				calendar.sharedWith = [];
			}
		} else if (!Array.isArray(calendar.sharedWith)) {
			calendar.sharedWith = [];
		}
	} else {
		calendar.sharedWith = [];
	}

	return calendar as unknown as SharedCalendar;
};

/**
 * Add user to shared calendar
 */
export const addUserToSharedCalendar = async (
	calendarId: string,
	userId: string,
): Promise<SharedCalendar> => {
	const calendar = await getSharedCalendarById(calendarId);
	if (!calendar) {
		throw new Error("Shared calendar not found");
	}

	const currentSharedWith = calendar.sharedWith || [];
	if (currentSharedWith.includes(userId)) {
		return calendar; // User already has access
	}

	return updateSharedCalendar(calendarId, {
		sharedWith: [...currentSharedWith, userId],
	});
};

/**
 * Remove user from shared calendar
 */
export const removeUserFromSharedCalendar = async (
	calendarId: string,
	userId: string,
): Promise<SharedCalendar> => {
	const calendar = await getSharedCalendarById(calendarId);
	if (!calendar) {
		throw new Error("Shared calendar not found");
	}

	const currentSharedWith = calendar.sharedWith || [];
	return updateSharedCalendar(calendarId, {
		sharedWith: currentSharedWith.filter((id) => id !== userId),
	});
};

/**
 * Delete a shared calendar
 */
export const deleteSharedCalendar = async (
	calendarId: string,
): Promise<void> => {
	const { tablesDB } = await createAdminClient();
	const collectionId = getSharedCalendarsCollectionId();

	await tablesDB.deleteRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: collectionId,
		rowId: calendarId,
	});
};

/**
 * Create a calendar delegation
 */
export const createCalendarDelegation = async (
	data: CreateDelegationData,
): Promise<CalendarDelegation> => {
	const { tablesDB } = await createAdminClient();
	const collectionId = getCalendarDelegationsCollectionId();

	const delegationId = ID.unique();

	const response = await tablesDB.createRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: collectionId,
		rowId: delegationId,
		data: {
			calendarId: data.calendarId,
			delegatorId: data.delegatorId,
			delegateId: data.delegateId,
			permissions: JSON.stringify(data.permissions),
			canCreateEvents: data.canCreateEvents || false,
			canEditEvents: data.canEditEvents || false,
			canDeleteEvents: data.canDeleteEvents || false,
			canManageParticipants: data.canManageParticipants || false,
			canViewSensitiveDetails: data.canViewSensitiveDetails || false,
			startDate: data.startDate || null,
			endDate: data.endDate || null,
			isActive: true,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
	});

	// Parse permissions back from JSON
	const result = response as unknown as Record<string, unknown>;
	if (typeof result.permissions === "string") {
		try {
			result.permissions = JSON.parse(result.permissions);
		} catch (error) {
			console.error(
				"[SERVER] createCalendarDelegation] Error parsing permissions:",
				error,
			);
		}
	}

	return result as unknown as CalendarDelegation;
};

/**
 * Get active delegations for a user
 */
export const getActiveDelegationsForUser = async (
	delegateId: string,
): Promise<CalendarDelegation[]> => {
	const { tablesDB } = await createAdminClient();
	const collectionId = getCalendarDelegationsCollectionId();

	const now = new Date().toISOString();

	const response = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId: collectionId,
		queries: [
			Query.equal("delegateId", delegateId),
			Query.equal("isActive", true),
			Query.or([
				Query.isNull("startDate"),
				Query.lessThanEqual("startDate", now),
			]),
			Query.or([
				Query.isNull("endDate"),
				Query.greaterThanEqual("endDate", now),
			]),
		],
	});

	// Parse permissions from JSON
	const delegations = response.rows.map((row) => {
		const delegation = row as unknown as Record<string, unknown>;
		if (typeof delegation.permissions === "string") {
			try {
				delegation.permissions = JSON.parse(delegation.permissions);
			} catch (error) {
				console.error(
					"[SERVER] getActiveDelegationsForUser] Error parsing permissions:",
					error,
				);
				delegation.permissions = [];
			}
		}
		return delegation;
	});

	return delegations as unknown as CalendarDelegation[];
};

/**
 * Check if a user has delegation permissions for a calendar
 */
export const checkDelegationPermissions = async (
	userId: string,
	calendarId: string,
): Promise<CalendarDelegation | null> => {
	const delegations = await getActiveDelegationsForUser(userId);
	return delegations.find((d) => d.calendarId === calendarId) || null;
};

/**
 * Get or create a user's primary calendar
 * Each user has one primary calendar that represents their main calendar
 */
export const getOrCreatePrimaryCalendar = async (
	userId: string,
	userAccountId: string,
	organizationId: string,
	userName?: string,
): Promise<SharedCalendar> => {
	const { tablesDB } = await createAdminClient();
	const collectionId = getSharedCalendarsCollectionId();

	// Check if primary calendar already exists
	const existingCalendars = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId: collectionId,
		queries: [
			Query.equal("ownerId", userId),
			Query.equal("isPrimaryCalendar", true),
			Query.equal("organizationId", organizationId),
		],
	});

	if (existingCalendars.rows.length > 0) {
		const calendar = existingCalendars.rows[0] as any;
		// Normalize sharePermissions
		return normalizeCalendar(calendar);
	}

	// Create primary calendar if it doesn't exist
	const calendarId = ID.unique();
	const calendarName = userName ? `${userName}'s Calendar` : "My Calendar";

	const response = await tablesDB.createRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: collectionId,
		rowId: calendarId,
		data: {
			name: calendarName,
			description: null,
			ownerId: userId,
			ownerAccountId: userAccountId,
			organizationId: organizationId,
			isPrimaryCalendar: true,
			isTeamCalendar: false,
			teamId: null,
			color: "#3b82f6", // Default blue color
			isPublic: false,
			sharePermissions: JSON.stringify([]), // Start with no shares (stored as JSON string)
			sharedWith: [], // Legacy field
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
	});

	return normalizeCalendar(response);
};

/**
 * Share a primary calendar with a user at a specific permission level
 */
export const sharePrimaryCalendarWithUser = async (
	calendarOwnerId: string,
	sharedWithUserId: string,
	permissionLevel: CalendarPermissionLevel,
	grantedByUserId: string,
): Promise<SharedCalendar> => {
	const { tablesDB } = await createAdminClient();
	const collectionId = getSharedCalendarsCollectionId();

	// Get the owner's primary calendar
	const existingCalendars = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId: collectionId,
		queries: [
			Query.equal("ownerId", calendarOwnerId),
			Query.equal("isPrimaryCalendar", true),
		],
	});

	if (existingCalendars.rows.length === 0) {
		throw new Error("Primary calendar not found for user");
	}

	const calendar = existingCalendars.rows[0] as any;
	// Parse sharePermissions from JSON string if needed
	let currentPermissions: CalendarSharePermission[] = [];
	if (calendar.sharePermissions) {
		if (Array.isArray(calendar.sharePermissions)) {
			currentPermissions = calendar.sharePermissions;
		} else if (typeof calendar.sharePermissions === "string") {
			try {
				currentPermissions = JSON.parse(calendar.sharePermissions);
			} catch {
				currentPermissions = [];
			}
		}
	}

	// Check if permission already exists
	const existingPermissionIndex = currentPermissions.findIndex(
		(p: CalendarSharePermission) => p.userId === sharedWithUserId,
	);

	const newPermission: CalendarSharePermission = {
		userId: sharedWithUserId,
		permissionLevel,
		grantedAt: new Date().toISOString(),
		grantedBy: grantedByUserId,
	};

	let updatedPermissions: CalendarSharePermission[];
	if (existingPermissionIndex >= 0) {
		// Update existing permission
		updatedPermissions = [...currentPermissions];
		updatedPermissions[existingPermissionIndex] = newPermission;
	} else {
		// Add new permission
		updatedPermissions = [...currentPermissions, newPermission];
	}

	// Also update legacy sharedWith array for backward compatibility
	const currentSharedWith = calendar.sharedWith || [];
	const updatedSharedWith = currentSharedWith.includes(sharedWithUserId)
		? currentSharedWith
		: [...currentSharedWith, sharedWithUserId];

	const updatedCalendar = await tablesDB.updateRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: collectionId,
		rowId: calendar.$id,
		data: {
			sharePermissions: JSON.stringify(updatedPermissions), // Store as JSON string
			sharedWith: updatedSharedWith,
			updatedAt: new Date().toISOString(),
		},
	});

	return normalizeCalendar(updatedCalendar);
};

/**
 * Remove a user's access to a primary calendar
 */
export const removeCalendarShare = async (
	calendarOwnerId: string,
	sharedWithUserId: string,
): Promise<SharedCalendar> => {
	const { tablesDB } = await createAdminClient();
	const collectionId = getSharedCalendarsCollectionId();

	// Get the owner's primary calendar
	const existingCalendars = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId: collectionId,
		queries: [
			Query.equal("ownerId", calendarOwnerId),
			Query.equal("isPrimaryCalendar", true),
		],
	});

	if (existingCalendars.rows.length === 0) {
		throw new Error("Primary calendar not found for user");
	}

	const calendar = existingCalendars.rows[0] as any;
	// Parse sharePermissions from JSON string if needed
	let currentPermissions: CalendarSharePermission[] = [];
	if (calendar.sharePermissions) {
		if (Array.isArray(calendar.sharePermissions)) {
			currentPermissions = calendar.sharePermissions;
		} else if (typeof calendar.sharePermissions === "string") {
			try {
				currentPermissions = JSON.parse(calendar.sharePermissions);
			} catch {
				currentPermissions = [];
			}
		}
	}

	// Remove user from permissions
	const updatedPermissions = currentPermissions.filter(
		(p: CalendarSharePermission) => p.userId !== sharedWithUserId,
	);

	// Also update legacy sharedWith array
	const currentSharedWith = calendar.sharedWith || [];
	const updatedSharedWith = currentSharedWith.filter(
		(id: string) => id !== sharedWithUserId,
	);

	const updatedCalendar = await tablesDB.updateRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: collectionId,
		rowId: calendar.$id,
		data: {
			sharePermissions: JSON.stringify(updatedPermissions), // Store as JSON string
			sharedWith: updatedSharedWith,
			updatedAt: new Date().toISOString(),
		},
	});

	return normalizeCalendar(updatedCalendar);
};

/**
 * Get permission level for a user on a calendar
 */
export const getCalendarPermissionForUser = async (
	calendarOwnerId: string,
	userId: string,
): Promise<CalendarPermissionLevel | null> => {
	const { tablesDB } = await createAdminClient();
	const collectionId = getSharedCalendarsCollectionId();

	const calendars = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId: collectionId,
		queries: [
			Query.equal("ownerId", calendarOwnerId),
			Query.equal("isPrimaryCalendar", true),
		],
	});

	if (calendars.rows.length === 0) {
		return null;
	}

	const calendar = normalizeCalendar(calendars.rows[0]);
	const permission = calendar.sharePermissions?.find(
		(p) => p.userId === userId,
	);

	return permission?.permissionLevel || null;
};

/**
 * Get all calendars shared with a user (including primary calendars shared by others)
 */
export const getCalendarsSharedWithUser = async (
	userId: string,
	organizationId: string,
): Promise<
	Array<SharedCalendar & { userPermission: CalendarPermissionLevel }>
> => {
	const { tablesDB } = await createAdminClient();
	const collectionId = getSharedCalendarsCollectionId();

	// Get all primary calendars in the organization
	const allCalendars = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId: collectionId,
		queries: [
			Query.equal("organizationId", organizationId),
			Query.equal("isPrimaryCalendar", true),
		],
	});

	// Filter calendars where user has a permission entry
	const sharedCalendars = allCalendars.rows
		.map(normalizeCalendar)
		.filter((cal) => {
			if (cal.ownerId === userId) return false; // User's own calendar
			const permission = cal.sharePermissions?.find((p) => p.userId === userId);
			return permission !== undefined;
		})
		.map((cal) => {
			const permission = cal.sharePermissions?.find((p) => p.userId === userId);
			return {
				...cal,
				userPermission: permission?.permissionLevel,
			};
		})
		.filter(
			(
				cal,
			): cal is SharedCalendar & { userPermission: CalendarPermissionLevel } =>
				cal.userPermission !== undefined,
		);

	return sharedCalendars;
};

/**
 * Normalize calendar data - handles both new and legacy formats
 */
function normalizeCalendar(calendar: any): SharedCalendar {
	// Parse sharePermissions
	let sharePermissions: CalendarSharePermission[] = [];
	if (calendar.sharePermissions) {
		if (Array.isArray(calendar.sharePermissions)) {
			sharePermissions = calendar.sharePermissions;
		} else if (typeof calendar.sharePermissions === "string") {
			try {
				sharePermissions = JSON.parse(calendar.sharePermissions);
			} catch {
				sharePermissions = [];
			}
		}
	}

	// Parse sharedWith (legacy)
	let sharedWith: string[] = [];
	if (calendar.sharedWith) {
		if (Array.isArray(calendar.sharedWith)) {
			sharedWith = calendar.sharedWith;
		} else if (typeof calendar.sharedWith === "string") {
			try {
				sharedWith = JSON.parse(calendar.sharedWith);
			} catch {
				sharedWith = [];
			}
		}
	}

	return {
		...calendar,
		sharePermissions,
		sharedWith,
		isPrimaryCalendar: calendar.isPrimaryCalendar ?? false,
	};
}
