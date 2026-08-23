import { ID, Query } from "node-appwrite";
import type {
	CalendarApprovalStatus,
	CalendarSensitivity,
	PermissionOverrideRecord,
} from "@/constants/rbac";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "../appwrite/config";
import {
	getCalendarIntegrationStatus,
	getValidIntegration,
	hasActiveCalendarIntegration,
} from "./calendar-integration.actions";
import { createEventActivity } from "./recentActivity.actions";

// Event attachments are stored as file ID references (same pattern as contracts use fileId)
// Full file details are fetched from files collection when needed
export interface CalendarEventAttachment {
	$id: string; // File ID from files collection (reference)
	name?: string; // Cached for display, can be fetched from files collection
	url?: string; // Cached for display, can be fetched from files collection
	type?: string;
	extension?: string;
	size?: number;
	bucketFileId?: string;
}

export interface CalendarEvent {
	$id?: string;
	title: string;
	startDate: string;
	endDate?: string;
	type: "contract" | "deadline" | "meeting" | "review" | "audit";
	description?: string;
	contractName?: string;
	amount?: string;
	startTime?: string;
	endTime?: string;
	participants?: string;
	location?: string;
	createdBy: string;
	createdByUserId?: string;
	createdByAccountId?: string;
	outlook_id?: string;
	attachments?: string[]; // Array of file IDs (references to files collection, same pattern as contracts use fileId)
	deleted_at?: string;
	deleted_by?: string;
	deletion_status?:
		| "pending_outlook_deletion"
		| "deleted_from_outlook"
		| "deletion_failed";
	deletion_synced?: boolean;
	sensitivityLevel?: CalendarSensitivity;
	requiresApproval?: boolean;
	approvalStatus?: CalendarApprovalStatus;
	pendingApprovalId?: string | null;
	overrides?: PermissionOverrideRecord[] | string; // Can be array (in-memory) or JSON string (from DB)
	$createdAt?: string;
	$updatedAt?: string;
}

export interface EventReminderConfig {
	type?: "before_start" | "before_end" | "custom";
	minutes?: number;
	channels?: Array<"in_app" | "email" | "sms" | "push">;
}

export interface CreateCalendarEventData {
	title: string;
	startDate: string;
	endDate?: string;
	type: "contract" | "deadline" | "meeting" | "review" | "audit";
	description?: string;
	contractName?: string;
	amount?: string;
	startTime?: string;
	endTime?: string;
	participants?: string;
	location?: string;
	createdBy: string;
	createdByUserId?: string;
	createdByAccountId?: string;
	outlook_id?: string;
	attachments?: string[]; // Array of file IDs (references to files collection, same pattern as contracts use fileId)
	sensitivityLevel?: CalendarSensitivity;
	requiresApproval?: boolean;
	approvalStatus?: CalendarApprovalStatus;
	pendingApprovalId?: string | null;
	overrides?: PermissionOverrideRecord[];
	reminders?: EventReminderConfig[]; // Priority 2: Advanced notifications
	resourceId?: string; // Priority 2: Resource management
}

// Get all calendar events
export const getCalendarEvents = async (): Promise<CalendarEvent[]> => {
	try {
		if (
			!appwriteConfig.databaseId ||
			!appwriteConfig.calendarEventsCollectionId
		) {
			throw new Error("Missing required Appwrite configuration");
		}

		const adminClient = await createAdminClient();
		const response = await adminClient.tablesDB.listRows({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.calendarEventsCollectionId,
			queries: [
				Query.isNull("deleted_at"), // Exclude soft-deleted events
				Query.orderDesc("$createdAt"),
			],
		});
		return response.rows as unknown as CalendarEvent[];
	} catch (error) {
		console.error("Error fetching calendar events:", error);
		throw error;
	}
};

/**
 * True when the user is listed on an event's participants string.
 * Supports bare emails/ids and "Name <email>" (assistant / picker format).
 */
export const isUserListedAsParticipant = (
	participants: string | undefined | null,
	userId: string,
	userEmail?: string | null,
	userAccountId?: string | null,
): boolean => {
	if (!participants?.trim()) return false;

	const haystack = String(participants).toLowerCase();
	const needles = [
		userId?.trim().toLowerCase(),
		userEmail?.trim().toLowerCase(),
		userAccountId?.trim().toLowerCase(),
	].filter((n): n is string => Boolean(n && n.length > 0));

	if (needles.length === 0) return false;

	const tokens = haystack
		.split(",")
		.map((p) => p.trim())
		.filter((p) => p.length > 0);

	const angleEmails = [...haystack.matchAll(/<([^>\s]+@[^>\s]+)>/g)].map((m) =>
		m[1].trim().toLowerCase(),
	);

	const parenEmails = [...haystack.matchAll(/\(([^)\s]+@[^)\s]+)\)/g)].map(
		(m) => m[1].trim().toLowerCase(),
	);

	for (const needle of needles) {
		if (tokens.includes(needle)) return true;
		if (angleEmails.includes(needle) || parenEmails.includes(needle)) {
			return true;
		}
		// Substring match for "Name <email>" / mixed id lists (same as calendar UI)
		if (needle.includes("@") || needle.length >= 15) {
			if (haystack.includes(needle)) return true;
		}
	}

	return false;
};

/**
 * Filter event details based on permission level (mimics Outlook behavior)
 */
const filterEventDetailsByPermission = (
	event: CalendarEvent,
	permissionLevel:
		| "view_busy"
		| "view_titles"
		| "view_all"
		| "edit"
		| "delegate",
): CalendarEvent => {
	// Create a copy of the event
	const filteredEvent = { ...event };

	switch (permissionLevel) {
		case "view_busy":
			// Only show free/busy - no details at all
			filteredEvent.title = "Busy";
			filteredEvent.description = undefined;
			filteredEvent.location = undefined;
			filteredEvent.participants = undefined;
			filteredEvent.contractName = undefined;
			filteredEvent.amount = undefined;
			filteredEvent.type = "meeting"; // Generic type
			break;

		case "view_titles":
			// Show titles and locations only
			filteredEvent.description = undefined;
			filteredEvent.participants = undefined;
			filteredEvent.contractName = undefined;
			filteredEvent.amount = undefined;
			break;

		case "view_all":
		case "edit":
		case "delegate":
			// Show all details - no filtering needed
			break;
	}

	return filteredEvent;
};

/**
 * Parse overrides field from JSON string to array
 */
const parseEventOverrides = (
	overrides: unknown,
): PermissionOverrideRecord[] => {
	if (typeof overrides === "string") {
		try {
			return JSON.parse(overrides) as PermissionOverrideRecord[];
		} catch (error) {
			console.error("Error parsing overrides JSON:", error);
			return [];
		}
	} else if (Array.isArray(overrides)) {
		return overrides;
	}
	return [];
};

export const getCalendarEventById = async (
	eventId: string,
): Promise<CalendarEvent | null> => {
	try {
		if (
			!appwriteConfig.databaseId ||
			!appwriteConfig.calendarEventsCollectionId
		) {
			throw new Error("Missing required Appwrite configuration");
		}

		const adminClient = await createAdminClient();
		const response = await adminClient.tablesDB.getRow({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.calendarEventsCollectionId,
			rowId: eventId,
		});

		const event = response as unknown as Record<string, unknown>;

		// Parse overrides from JSON string if stored as string
		event.overrides = parseEventOverrides(event.overrides);

		return event as unknown as CalendarEvent;
	} catch (error) {
		console.error("Error fetching calendar event by ID:", error);
		return null;
	}
};

// Get calendar events for a specific month
export const getCalendarEventsByMonth = async (
	year: number,
	month: number,
	userId?: string,
): Promise<CalendarEvent[]> => {
	try {
		if (
			!appwriteConfig.databaseId ||
			!appwriteConfig.calendarEventsCollectionId
		) {
			throw new Error("Missing required Appwrite configuration");
		}

		const adminClient = await createAdminClient();

		// Format dates as YYYY-MM-DD strings to avoid timezone conversion issues
		// when querying date strings stored in the same format
		const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
		const _endYear = month === 12 ? year + 1 : year;
		const _endMonth = month === 12 ? 1 : month + 1;
		const lastDay = new Date(year, month, 0).getDate();
		const endDate = `${year}-${String(month).padStart(2, "0")}-${String(
			lastDay,
		).padStart(2, "0")}`;

		console.log("Date range:", startDate, "to", endDate);

		let events: CalendarEvent[] = [];

		// CRITICAL: Always filter events by user access - never return all events
		// If userId is not provided, return empty array to prevent cross-user data leaks
		if (!userId) {
			console.warn(
				"[getCalendarEventsByMonth] No userId provided - returning empty array for security",
			);
			return [];
		}

		// Filter events based on user access
		{
			// Get user information for filtering
			const { getUserById } = await import("./user.actions");
			const { getUserDefaultOrganization } = await import(
				"@/lib/rbac/permissions"
			);
			const { getSharedCalendarsForUser } = await import(
				"./shared-calendar.actions"
			);

			const user = await getUserById(userId);
			if (!user) {
				console.warn(`User ${userId} not found, returning empty events array`);
				return [];
			}

			const defaultOrg = await getUserDefaultOrganization(userId);
			if (!defaultOrg) {
				console.warn(
					`No organization found for user ${userId}, returning empty events array`,
				);
				return [];
			}

			// Extract user identifiers for participant matching
			const userEmail = user.email?.toLowerCase() || "";
			const userAccountId = user.accountId || "";

			// Get shared calendars user has access to
			const sharedCalendars = await getSharedCalendarsForUser(
				userId,
				defaultOrg.orgId,
			);

			// Build base queries scoped to org + date range
			const baseQueries = [
				Query.isNull("deleted_at"),
				Query.greaterThanEqual("startDate", startDate),
				Query.lessThanEqual("startDate", endDate),
				Query.equal("orgId", defaultOrg.orgId),
				Query.orderAsc("startDate"),
			];

			// Fetch all events in the date range for the organization
			// We'll filter in-memory to ensure proper access control:
			// - Events created by the user
			// - Events where the user is a participant
			// - Events from explicitly shared calendars
			// Note: We can't use Query.search() for participants without a fulltext index,
			// so we fetch all events and filter in-memory
			const allEventsResponse = await adminClient.tablesDB.listRows({
				databaseId: appwriteConfig.databaseId,
				tableId: appwriteConfig.calendarEventsCollectionId,
				queries: baseQueries,
			});

			events = allEventsResponse.rows as unknown as CalendarEvent[];

			// Extract owner IDs and their permission levels from shared calendars
			// CRITICAL: Only include calendars that are EXPLICITLY shared with this user
			// Do NOT include public/team calendars unless they're also explicitly shared
			// This ensures users only see events from calendars they have explicit access to
			type CalendarPermissionLevel =
				| "view_busy"
				| "view_titles"
				| "view_all"
				| "edit"
				| "delegate";
			const sharedCalendarPermissions = new Map<
				string,
				CalendarPermissionLevel
			>();

			sharedCalendars
				.filter((cal) => {
					// CRITICAL FILTER: Only include calendars that are explicitly shared with this user
					// Exclude public/team calendars that aren't explicitly shared

					// Check if user has explicit permission (new model)
					const hasExplicitPermission = cal.sharePermissions?.some(
						(p) => p.userId === userId,
					);
					if (hasExplicitPermission) return true;

					// Check if user is in sharedWith (legacy model)
					let sharedWith: string[] = [];
					if (cal.sharedWith) {
						if (Array.isArray(cal.sharedWith)) {
							sharedWith = cal.sharedWith;
						} else if (typeof cal.sharedWith === "string") {
							try {
								sharedWith = JSON.parse(cal.sharedWith || "[]");
							} catch {
								sharedWith = [];
							}
						}
					}
					const isInSharedWith =
						Array.isArray(sharedWith) && sharedWith.includes(userId);

					// Only include if explicitly shared (via permission or sharedWith)
					// Do NOT include public/team calendars just because they're public/team
					return isInSharedWith;
				})
				.forEach((cal) => {
					// Get permission level for this user (from new sharePermissions or default to 'view_all' for legacy)
					const permission = cal.sharePermissions?.find(
						(p) => p.userId === userId,
					);
					const permissionLevel: CalendarPermissionLevel =
						permission?.permissionLevel || "view_all";
					sharedCalendarPermissions.set(cal.ownerId, permissionLevel);
				});

			const sharedCalendarOwnerIds = new Set(sharedCalendarPermissions.keys());

			if (!userAccountId) {
				console.warn(
					`[getCalendarEventsByMonth] User ${userId} has no accountId - filtering may not work correctly`,
				);
			}

			// Filter events based on:
			// 1. Events created by the user (check all creator fields - PRIMARY FILTER)
			// 2. Events where the user is a participant
			// 3. Events created by owners of shared calendars the user has access to
			const _initialEventCount = events.length;
			events = events.filter((event) => {
				// PRIMARY CHECK: Event must be created by this user
				// Check all possible creator fields to ensure proper ownership verification
				// CRITICAL: We must check ALL creator fields because events may have been created
				// with different field combinations. An event belongs to a user if ANY creator field matches.
				const isCreatedByUser =
					(event.createdByUserId && event.createdByUserId === userId) ||
					(userAccountId &&
						event.createdByAccountId &&
						event.createdByAccountId === userAccountId) ||
					(userAccountId &&
						event.createdBy &&
						event.createdBy === userAccountId);

				// If not created by user, check if user is participant or has shared calendar access
				if (!isCreatedByUser) {
					// Check if user is a participant in this event (explicitly added as participant)
					if (
						isUserListedAsParticipant(
							event.participants,
							userId,
							userEmail,
							userAccountId,
						)
					) {
						return true;
					}

					// Check if event was created by an owner of a shared calendar the user has access to
					// This only applies if the user explicitly has access to that shared calendar
					const permissionLevel = event.createdByUserId
						? sharedCalendarPermissions.get(event.createdByUserId)
						: null;

					if (
						event.createdByUserId &&
						sharedCalendarOwnerIds.size > 0 &&
						sharedCalendarOwnerIds.has(event.createdByUserId) &&
						permissionLevel &&
						permissionLevel !== "view_busy" // view_busy means only free/busy, so we'll handle separately
					) {
						return true;
					}

					// For view_busy permission, we still show the event but will filter details later
					if (event.createdByUserId && permissionLevel === "view_busy") {
						return true;
					}

					// If event doesn't belong to user and user is not a participant and not via shared calendar, exclude it
					return false;
				}

				// Event is created by this user - include it
				return true;
			});

			// Apply permission-based detail filtering for events from shared calendars
			events = events.map((event) => {
				// If event belongs to user, show full details
				const isCreatedByUser =
					(event.createdByUserId && event.createdByUserId === userId) ||
					(userAccountId &&
						event.createdByAccountId &&
						event.createdByAccountId === userAccountId) ||
					(userAccountId &&
						event.createdBy &&
						event.createdBy === userAccountId);

				if (isCreatedByUser) {
					return event; // Full access to own events
				}

				// Get permission level for this event's creator
				const permissionLevel = event.createdByUserId
					? sharedCalendarPermissions.get(event.createdByUserId)
					: null;

				if (!permissionLevel) {
					return event; // No permission restriction, show full details
				}

				// Filter event details based on permission level
				return filterEventDetailsByPermission(event, permissionLevel);
			});
		}

		return events;
	} catch (error) {
		console.error("Error fetching calendar events by month:", error);
		throw error;
	}
};

// Get calendar events with Microsoft Outlook sync
export const getCalendarEventsWithSync = async (
	year: number,
	month: number,
	userId: string,
): Promise<CalendarEvent[]> => {
	try {
		// First, get local CAALM events (with user filtering)
		const localEvents = await getCalendarEventsByMonth(year, month, userId);

		// Check if user has Microsoft integration
		const hasIntegration = await hasMicrosoftCalendarIntegration(userId);

		if (hasIntegration) {
			try {
				// Trigger sync to fetch Outlook events
				const syncResult = await syncMicrosoftCalendar(userId);
				console.log("Microsoft sync result:", syncResult);

				// After sync, get updated events (including synced Outlook events, with user filtering)
				const syncedEvents = await getCalendarEventsByMonth(
					year,
					month,
					userId,
				);
				return syncedEvents;
			} catch (syncError) {
				console.error("Error syncing Microsoft calendar:", syncError);
				// Return local events even if sync fails
				return localEvents;
			}
		}

		return localEvents;
	} catch (error) {
		console.error("Error fetching calendar events with sync:", error);
		return [];
	}
};

// Get calendar events for a specific date
export const getCalendarEventsByDate = async (
	date: string,
): Promise<CalendarEvent[]> => {
	try {
		if (
			!appwriteConfig.databaseId ||
			!appwriteConfig.calendarEventsCollectionId
		) {
			throw new Error("Missing required Appwrite configuration");
		}

		const adminClient = await createAdminClient();
		const startOfDay = new Date(date);
		startOfDay.setHours(0, 0, 0, 0);

		const endOfDay = new Date(date);
		endOfDay.setHours(23, 59, 59, 999);

		const response = await adminClient.tablesDB.listRows({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.calendarEventsCollectionId,
			queries: [
				Query.isNull("deleted_at"), // Exclude soft-deleted events
				Query.greaterThanEqual("startDate", startOfDay.toISOString()),
				Query.lessThanEqual("startDate", endOfDay.toISOString()),
				Query.orderAsc("startTime"),
			],
		});
		return response.rows as unknown as CalendarEvent[];
	} catch (error) {
		console.error("Error fetching calendar events by date:", error);
		throw error;
	}
};

// Create a new calendar event
export const createCalendarEvent = async (
	eventData: CreateCalendarEventData,
): Promise<CalendarEvent> => {
	try {
		console.log("createCalendarEvent called with data:", eventData);
		console.log("Database ID:", appwriteConfig.databaseId);
		console.log(
			"Calendar Events Collection ID:",
			appwriteConfig.calendarEventsCollectionId,
		);

		if (
			!appwriteConfig.databaseId ||
			!appwriteConfig.calendarEventsCollectionId
		) {
			throw new Error("Missing required Appwrite configuration");
		}

		const adminClient = await createAdminClient();
		console.log("Admin client created successfully");

		// Filter out attachments if empty to avoid sending empty arrays
		const dataToCreate: Record<string, unknown> = {
			...eventData,
		};

		// Handle overrides: serialize to JSON string if it's an array (stored as string in DB)
		if (dataToCreate.overrides && Array.isArray(dataToCreate.overrides)) {
			dataToCreate.overrides = JSON.stringify(dataToCreate.overrides);
		} else if (!dataToCreate.overrides) {
			// If overrides is not provided, set to empty array as JSON string
			dataToCreate.overrides = JSON.stringify([]);
		}

		// Set default values for RBAC fields if not provided
		if (!dataToCreate.sensitivityLevel) {
			dataToCreate.sensitivityLevel = "standard";
		}
		if (dataToCreate.requiresApproval === undefined) {
			dataToCreate.requiresApproval = false;
		}
		if (!dataToCreate.approvalStatus) {
			dataToCreate.approvalStatus = dataToCreate.requiresApproval
				? "pending"
				: "not_required";
		}
		if (!dataToCreate.pendingApprovalId) {
			dataToCreate.pendingApprovalId = null;
		}

		if (
			!dataToCreate.attachments ||
			!Array.isArray(dataToCreate.attachments) ||
			dataToCreate.attachments.length === 0
		) {
			delete dataToCreate.attachments;
		}

		// Get orgId for the event
		let orgId: string = "default_organization";
		try {
			if (eventData.createdByUserId) {
				const { getUserDefaultOrganization } = await import(
					"@/lib/rbac/permissions"
				);
				const defaultOrg = await getUserDefaultOrganization(
					eventData.createdByUserId,
				);
				if (defaultOrg?.orgId) {
					orgId = defaultOrg.orgId;
				}
			} else if (eventData.createdBy) {
				// Fallback: try to get user by account ID and then get org
				const { getUserByAccountId } = await import("./user.actions");
				const { getUserDefaultOrganization } = await import(
					"@/lib/rbac/permissions"
				);
				const user = await getUserByAccountId(eventData.createdBy);
				if (user?.$id) {
					const defaultOrg = await getUserDefaultOrganization(user.$id);
					if (defaultOrg?.orgId) {
						orgId = defaultOrg.orgId;
					}
				}
			}
		} catch (error) {
			console.warn(
				"Could not get orgId for event creation, using default:",
				error,
			);
		}

		// Ensure orgId is a valid string (not null or undefined)
		if (!orgId || typeof orgId !== "string") {
			orgId = "default_organization";
		}

		// Add orgId to the data
		dataToCreate.orgId = orgId;

		// Ensure all required fields are present and valid
		if (!dataToCreate.title || typeof dataToCreate.title !== "string") {
			throw new Error("Event title is required");
		}
		if (!dataToCreate.startDate || typeof dataToCreate.startDate !== "string") {
			throw new Error("Event startDate is required");
		}
		if (!dataToCreate.createdBy || typeof dataToCreate.createdBy !== "string") {
			throw new Error("Event createdBy is required");
		}

		// Log the data being sent for debugging
		console.log("Creating event with data:", {
			...dataToCreate,
			attachments: Array.isArray(dataToCreate.attachments)
				? `${dataToCreate.attachments.length} attachments`
				: "none",
			overrides:
				typeof dataToCreate.overrides === "string" ? "JSON string" : "array",
		});

		let response;
		try {
			response = await adminClient.tablesDB.createRow({
				databaseId: appwriteConfig.databaseId,
				tableId: appwriteConfig.calendarEventsCollectionId,
				rowId: ID.unique(),
				data: dataToCreate,
			});
		} catch (createError: any) {
			console.error("Error creating calendar event row:", {
				error: createError,
				errorMessage: createError?.message,
				errorCode: createError?.code,
				errorType: createError?.type,
				errorResponse: createError?.response,
				dataBeingSent: {
					...dataToCreate,
					attachments: Array.isArray(dataToCreate.attachments)
						? `${dataToCreate.attachments.length} attachments`
						: "none",
					overrides:
						typeof dataToCreate.overrides === "string"
							? "JSON string"
							: "array",
				},
			});
			throw createError;
		}

		console.log("Event created successfully:", response);

		// Create a recent activity for the new event
		try {
			await createEventActivity(
				"New Calendar Event Added",
				eventData.title,
				response.$id,
				eventData.createdBy,
				eventData.createdBy,
				orgId,
			);
			console.log("Recent activity created successfully");
		} catch (activityError) {
			console.warn("Failed to create recent activity:", activityError);
			// Don't throw here as the main event was created successfully
		}

		return response as unknown as CalendarEvent;
	} catch (error) {
		console.error("Error creating calendar event:", error);
		console.error("Error details:", {
			message: error instanceof Error ? error.message : "Unknown error",
			stack: error instanceof Error ? error.stack : undefined,
			eventData,
			databaseId: appwriteConfig.databaseId,
			calendarEventsCollectionId: appwriteConfig.calendarEventsCollectionId,
		});
		throw error;
	}
};

// Update a calendar event
export const updateCalendarEvent = async (
	eventId: string,
	eventData: Partial<CreateCalendarEventData>,
): Promise<CalendarEvent> => {
	try {
		if (
			!appwriteConfig.databaseId ||
			!appwriteConfig.calendarEventsCollectionId
		) {
			throw new Error("Missing required Appwrite configuration");
		}

		const adminClient = await createAdminClient();

		// Filter out attachments if empty or undefined to avoid schema errors
		const dataToUpdate: Record<string, unknown> = { ...eventData };

		// Handle overrides: serialize to JSON string if it's an array (stored as string in DB)
		if (
			dataToUpdate.overrides !== undefined &&
			dataToUpdate.overrides !== null
		) {
			if (Array.isArray(dataToUpdate.overrides)) {
				dataToUpdate.overrides = JSON.stringify(dataToUpdate.overrides);
			}
			// If it's already a string, keep it as-is
		}
		// If overrides is undefined/null, don't include it in the update (partial update)

		if (
			dataToUpdate.attachments &&
			Array.isArray(dataToUpdate.attachments) &&
			dataToUpdate.attachments.length === 0
		) {
			delete dataToUpdate.attachments;
		}

		const response = await adminClient.tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.calendarEventsCollectionId,
			rowId: eventId,
			data: dataToUpdate,
		});

		// Convert to plain object to ensure serialization
		const raw = response as unknown as Record<string, unknown>;

		// Return plain object with only serializable fields
		return {
			$id: String(raw.$id || eventId),
			title: String(raw.title || ""),
			startDate: String(raw.startDate || ""),
			endDate: raw.endDate ? String(raw.endDate) : undefined,
			type: raw.type as CalendarEvent["type"],
			description: raw.description ? String(raw.description) : undefined,
			contractName: raw.contractName ? String(raw.contractName) : undefined,
			amount: raw.amount ? String(raw.amount) : undefined,
			startTime: raw.startTime ? String(raw.startTime) : undefined,
			endTime: raw.endTime ? String(raw.endTime) : undefined,
			participants: raw.participants ? String(raw.participants) : undefined,
			location: raw.location ? String(raw.location) : undefined,
			createdBy: String(raw.createdBy || ""),
			createdByUserId: raw.createdByUserId
				? String(raw.createdByUserId)
				: undefined,
			createdByAccountId: raw.createdByAccountId
				? String(raw.createdByAccountId)
				: undefined,
			outlook_id: raw.outlook_id ? String(raw.outlook_id) : undefined,
			attachments: raw.attachments
				? Array.isArray(raw.attachments)
					? raw.attachments.map(String)
					: [String(raw.attachments)]
				: undefined,
			deleted_at: raw.deleted_at ? String(raw.deleted_at) : undefined,
			deleted_by: raw.deleted_by ? String(raw.deleted_by) : undefined,
			deletion_status: raw.deletion_status as CalendarEvent["deletion_status"],
			deletion_synced: Boolean(raw.deletion_synced),
			sensitivityLevel:
				raw.sensitivityLevel as CalendarEvent["sensitivityLevel"],
			requiresApproval: Boolean(raw.requiresApproval),
			approvalStatus: raw.approvalStatus as CalendarEvent["approvalStatus"],
			pendingApprovalId: raw.pendingApprovalId
				? String(raw.pendingApprovalId)
				: null,
			overrides: raw.overrides
				? typeof raw.overrides === "string"
					? raw.overrides
					: JSON.stringify(raw.overrides)
				: undefined,
			$createdAt: raw.$createdAt ? String(raw.$createdAt) : undefined,
			$updatedAt: raw.$updatedAt ? String(raw.$updatedAt) : undefined,
		} as CalendarEvent;
	} catch (error) {
		console.error("Error updating calendar event:", error);
		throw error;
	}
};

// Delete a calendar event (soft delete)
export const deleteCalendarEvent = async (
	eventId: string,
	deletedBy?: string,
): Promise<void> => {
	try {
		if (
			!appwriteConfig.databaseId ||
			!appwriteConfig.calendarEventsCollectionId
		) {
			throw new Error("Missing required Appwrite configuration");
		}

		const adminClient = await createAdminClient();

		// Get the existing event to retrieve orgId and ensure we have all required fields
		let orgId: string | undefined;
		let existingEvent: any = null;
		try {
			existingEvent = await adminClient.tablesDB.getRow({
				databaseId: appwriteConfig.databaseId,
				tableId: appwriteConfig.calendarEventsCollectionId,
				rowId: eventId,
			});
			orgId = (existingEvent as any)?.orgId;
		} catch (error) {
			console.warn("Could not fetch existing event for orgId:", error);
		}

		// If event doesn't have orgId and we have deletedBy, try to get user's org
		if (!orgId && deletedBy) {
			try {
				const { getUserByAccountId } = await import("./user.actions");
				const { getUserDefaultOrganization } = await import(
					"@/lib/rbac/permissions"
				);
				const user = await getUserByAccountId(deletedBy);
				if (user?.$id) {
					const defaultOrg = await getUserDefaultOrganization(user.$id);
					orgId = defaultOrg?.orgId;
				}
			} catch (error) {
				console.warn("Could not get user org for deletedBy:", error);
			}
		}

		// Use default organization if still no orgId (required field)
		if (!orgId || typeof orgId !== "string") {
			orgId = "default_organization";
		}

		// Prepare update data - only include fields we're updating
		// Appwrite partial updates should only include changed fields
		const updateData: Record<string, any> = {
			deleted_at: new Date().toISOString(),
			deleted_by: deletedBy || null,
			deletion_status: "pending_outlook_deletion",
			deletion_synced: false,
		};

		// Always include orgId to ensure the required field is present
		// If the event doesn't have orgId (null/undefined) or it's different, we need to set it
		const existingOrgId = existingEvent ? (existingEvent as any)?.orgId : null;
		// Include orgId if event doesn't have it or if it's different from what we want to set
		if (!existingOrgId || existingOrgId !== orgId) {
			updateData.orgId = orgId;
		}

		// Log the data being sent for debugging
		console.log("Soft deleting event with data:", {
			eventId,
			updateData,
			existingOrgId: existingEvent ? (existingEvent as any).orgId : "not found",
			newOrgId: orgId,
		});

		try {
			await adminClient.tablesDB.updateRow({
				databaseId: appwriteConfig.databaseId,
				tableId: appwriteConfig.calendarEventsCollectionId,
				rowId: eventId,
				data: updateData,
			});
		} catch (updateError: any) {
			console.error("Error updating event for soft delete:", {
				error: updateError,
				errorMessage: updateError?.message,
				errorCode: updateError?.code,
				errorType: updateError?.type,
				errorResponse: updateError?.response,
				eventId,
				updateData,
				existingEvent: existingEvent
					? {
							$id: (existingEvent as any).$id,
							title: (existingEvent as any).title,
							orgId: (existingEvent as any).orgId,
						}
					: null,
			});
			throw updateError;
		}
	} catch (error) {
		console.error("Error soft deleting calendar event:", error);
		throw error;
	}
};

// Hard delete a calendar event (permanent deletion)
export const hardDeleteCalendarEvent = async (
	eventId: string,
): Promise<void> => {
	try {
		if (
			!appwriteConfig.databaseId ||
			!appwriteConfig.calendarEventsCollectionId
		) {
			throw new Error("Missing required Appwrite configuration");
		}

		const adminClient = await createAdminClient();
		await adminClient.tablesDB.deleteRow({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.calendarEventsCollectionId,
			rowId: eventId,
		});
	} catch (error) {
		console.error("Error hard deleting calendar event:", error);
		throw error;
	}
};

// Restore a soft-deleted calendar event
export const restoreCalendarEvent = async (eventId: string): Promise<void> => {
	try {
		if (
			!appwriteConfig.databaseId ||
			!appwriteConfig.calendarEventsCollectionId
		) {
			throw new Error("Missing required Appwrite configuration");
		}

		const adminClient = await createAdminClient();

		// Remove soft delete markers
		await adminClient.tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.calendarEventsCollectionId,
			rowId: eventId,
			data: {
				deleted_at: null,
				deleted_by: null,
				deletion_status: null,
				deletion_synced: false,
			},
		});
	} catch (error) {
		console.error("Error restoring calendar event:", error);
		throw error;
	}
};

// Get calendar events for a specific week
export const getCalendarEventsByWeek = async (
	startDate: string,
	endDate: string,
): Promise<CalendarEvent[]> => {
	try {
		if (
			!appwriteConfig.databaseId ||
			!appwriteConfig.calendarEventsCollectionId
		) {
			throw new Error("Missing required Appwrite configuration");
		}

		const adminClient = await createAdminClient();
		const response = await adminClient.tablesDB.listRows({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.calendarEventsCollectionId,
			queries: [
				Query.isNull("deleted_at"), // Exclude soft-deleted events
				Query.greaterThanEqual("startDate", startDate),
				Query.lessThanEqual("startDate", endDate),
				Query.orderAsc("startDate"),
			],
		});
		return response.rows as unknown as CalendarEvent[];
	} catch (error) {
		console.error("Error fetching calendar events by week:", error);
		throw error;
	}
};

// Microsoft Calendar Integration Functions

/**
 * Check if user has Microsoft calendar integration
 */
export const hasMicrosoftCalendarIntegration = async (
	userId: string,
): Promise<boolean> => {
	try {
		return await hasActiveCalendarIntegration(userId, "microsoft");
	} catch (error) {
		console.error("Error checking Microsoft calendar integration:", error);
		return false;
	}
};

/**
 * Get Microsoft calendar integration status
 */
export const getMicrosoftCalendarIntegration = async (userId: string) => {
	try {
		return await getValidIntegration(userId, "microsoft");
	} catch (error) {
		console.error("Error getting Microsoft calendar integration:", error);
		return null;
	}
};

/** Settings UI only: one Appwrite read, no Microsoft token refresh. */
export const getMicrosoftCalendarIntegrationStatus = async (userId: string) => {
	try {
		return await getCalendarIntegrationStatus(userId, "microsoft");
	} catch (error) {
		console.error(
			"Error getting Microsoft calendar integration status:",
			error,
		);
		return { connected: false, syncEnabled: false };
	}
};

/**
 * Trigger Microsoft calendar sync
 */
export const syncMicrosoftCalendar = async (
	userId: string,
): Promise<{ success: boolean; message: string }> => {
	try {
		const integration = await getValidIntegration(userId, "microsoft");

		if (!integration) {
			return {
				success: false,
				message: "Microsoft calendar integration not found or expired",
			};
		}

		// Call the sync API endpoint with absolute URL and user ID
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
		const response = await fetch(`${baseUrl}/api/microsoft/calendar/sync`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-User-ID": userId, // Pass user ID in header
			},
			body: JSON.stringify({
				userId, // Also pass in body for redundancy
				startDate: new Date(
					Date.now() - 90 * 24 * 60 * 60 * 1000,
				).toISOString(), // 90 days ago
				endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
				strategy: "newest",
			}),
		});

		const result = await response.json();

		if (!response.ok) {
			return {
				success: false,
				message: result.error || "Sync failed",
			};
		}

		return {
			success: true,
			message: result.message || "Sync completed successfully",
		};
	} catch (error) {
		console.error("Error syncing Microsoft calendar:", error);
		return {
			success: false,
			message: "Failed to sync calendar",
		};
	}
};

/**
 * Create event and sync to Microsoft if integration exists
 */
export const createCalendarEventWithSync = async (
	eventData: CreateCalendarEventData,
): Promise<CalendarEvent> => {
	try {
		// Create the event in CAALM
		const event = await createCalendarEvent(eventData);

		// Check if user has Microsoft integration
		const hasIntegration = await hasActiveCalendarIntegration(
			eventData.createdBy,
			"microsoft",
		);

		if (hasIntegration) {
			try {
				// Sync the new event to Microsoft
				const baseUrl =
					process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
				const response = await fetch(
					`${baseUrl}/api/microsoft/calendar/events`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify(eventData),
					},
				);

				if (response.ok) {
					const result = await response.json();
					// Update the CAALM event with the Microsoft event ID
					await updateCalendarEvent(event.$id!, {
						...event,
						outlook_id: result.event.id,
					} as any);
				}
			} catch (syncError) {
				console.error("Failed to sync new event to Microsoft:", syncError);
				// Don't fail the entire operation if sync fails
			}
		}

		return event;
	} catch (error) {
		console.error("Error creating calendar event with sync:", error);
		throw error;
	}
};

/**
 * Update event and sync to Microsoft if integration exists
 */
export const updateCalendarEventWithSync = async (
	eventId: string,
	eventData: Partial<CreateCalendarEventData>,
): Promise<CalendarEvent> => {
	try {
		// Update the event in CAALM
		const event = await updateCalendarEvent(eventId, eventData);

		// Check if this event has a Microsoft ID and user has integration
		const hasIntegration = await hasActiveCalendarIntegration(
			event.createdBy,
			"microsoft",
		);
		const outlookId = (event as any).outlook_id;

		if (hasIntegration && outlookId) {
			try {
				// Sync the updated event to Microsoft
				const baseUrl =
					process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
				const response = await fetch(
					`${baseUrl}/api/microsoft/calendar/events`,
					{
						method: "PUT",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							eventId: outlookId,
							eventData: eventData,
						}),
					},
				);

				if (!response.ok) {
					console.error("Failed to sync updated event to Microsoft");
				}
			} catch (syncError) {
				console.error("Failed to sync updated event to Microsoft:", syncError);
				// Don't fail the entire operation if sync fails
			}
		}

		return event;
	} catch (error) {
		console.error("Error updating calendar event with sync:", error);
		throw error;
	}
};

/**
 * Delete event and sync to Microsoft if integration exists
 */
export const deleteCalendarEventWithSync = async (
	eventId: string,
): Promise<void> => {
	try {
		// Get the event first to check for Microsoft ID
		if (
			!appwriteConfig.databaseId ||
			!appwriteConfig.calendarEventsCollectionId
		) {
			throw new Error("Missing required Appwrite configuration");
		}

		const adminClient = await createAdminClient();
		const response = await adminClient.tablesDB.getRow({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.calendarEventsCollectionId,
			rowId: eventId,
		});
		const event = response as unknown as CalendarEvent;

		// Check if this event has a Microsoft ID and user has integration
		const hasIntegration = await hasActiveCalendarIntegration(
			event.createdBy,
			"microsoft",
		);
		const outlookId = (event as any).outlook_id;

		if (hasIntegration && outlookId) {
			try {
				// Delete the event from Microsoft
				const response = await fetch(
					`/api/microsoft/calendar/events?eventId=${outlookId}`,
					{
						method: "DELETE",
					},
				);

				if (!response.ok) {
					console.error("Failed to delete event from Microsoft");
				}
			} catch (syncError) {
				console.error("Failed to delete event from Microsoft:", syncError);
				// Don't fail the entire operation if sync fails
			}
		}

		// Delete the event from CAALM
		await deleteCalendarEvent(eventId);
	} catch (error) {
		console.error("Error deleting calendar event with sync:", error);
		throw error;
	}
};
