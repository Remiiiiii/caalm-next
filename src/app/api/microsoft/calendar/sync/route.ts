import { type NextRequest, NextResponse } from "next/server";
import {
	type CalendarEvent,
	createCalendarEvent,
	updateCalendarEvent,
} from "@/lib/actions/calendar.actions";
import {
	getValidIntegration,
	updateLastSync,
} from "@/lib/actions/calendar-integration.actions";
import { createGraphClient } from "@/lib/microsoft/graph-client";
import {
	caalmEventToGraph,
	detectConflict,
	graphEventToCaalm,
	resolveConflict,
	type SyncResult,
} from "@/lib/microsoft/sync";

// Enhanced sync lock with timestamp to prevent stale locks
let syncLock: { isLocked: boolean; timestamp: number; userId?: string } = {
	isLocked: false,
	timestamp: 0,
};

const SYNC_LOCK_TIMEOUT = 10 * 60 * 1000; // 10 minutes timeout (increased)
const SYNC_COOLDOWN = 2 * 60 * 1000; // 2 minutes cooldown between syncs (increased)

export async function POST(request: NextRequest) {
	const now = Date.now();

	// Check global sync lock first
	try {
		const globalLockResponse = await fetch(
			"http://localhost:3000/api/microsoft/global-sync-lock",
		);
		const globalLockData = await globalLockResponse.json();

		if (globalLockData.locked) {
			console.log(
				"🚨 Global sync lock is active - blocking all sync operations",
			);
			return NextResponse.json(
				{
					success: false,
					message: "Sync is globally locked. All sync operations are blocked.",
					globalLock: true,
				},
				{ status: 423 }, // 423 Locked
			);
		}
	} catch (error) {
		console.warn("Could not check global sync lock:", error);
		// Continue with sync if we can't check the global lock
	}

	// Check if sync is locked and if the lock is still valid
	if (syncLock.isLocked && now - syncLock.timestamp < SYNC_LOCK_TIMEOUT) {
		console.log("Sync already in progress, skipping...");
		return NextResponse.json(
			{
				success: false,
				message: "Sync already in progress. Please wait.",
				lockedUntil: new Date(
					syncLock.timestamp + SYNC_LOCK_TIMEOUT,
				).toISOString(),
			},
			{ status: 429 },
		);
	}

	// Check cooldown period
	if (syncLock.timestamp > 0 && now - syncLock.timestamp < SYNC_COOLDOWN) {
		console.log("Sync cooldown active, skipping...");
		return NextResponse.json(
			{
				success: false,
				message: "Please wait before syncing again.",
				cooldownRemaining: Math.ceil(
					(SYNC_COOLDOWN - (now - syncLock.timestamp)) / 1000,
				),
			},
			{ status: 429 },
		);
	}

	// Set sync lock
	syncLock = {
		isLocked: true,
		timestamp: now,
	};

	try {
		console.log("Starting Microsoft calendar sync...");

		// Get user ID from request body or header
		const body = await request.json();
		const userId = body.userId || request.headers.get("X-User-ID");

		console.log("Sync request for user:", userId);

		if (!userId) {
			console.error("No user ID provided in sync request");
			return NextResponse.json({ error: "User ID required" }, { status: 400 });
		}

		// Get valid integration
		console.log("Getting Microsoft integration for user:", userId);
		const integration = await getValidIntegration(userId, "microsoft");

		if (!integration) {
			console.error("No Microsoft integration found for user:", userId);
			return NextResponse.json(
				{ error: "Microsoft calendar integration not found or expired" },
				{ status: 404 },
			);
		}

		// CRITICAL: Check if sync is enabled
		if (!integration.sync_enabled) {
			console.log("Sync is disabled for user:", userId);
			return NextResponse.json(
				{
					success: false,
					message:
						"Sync is currently disabled. Enable it in calendar settings to resume synchronization.",
					sync_enabled: false,
				},
				{ status: 200 },
			);
		}

		console.log("Integration found:", {
			id: integration.$id,
			connected_at: integration.connected_at,
			last_sync: integration.last_sync,
			sync_enabled: integration.sync_enabled,
			token_expiry: integration.token_expiry,
		});

		// CRITICAL: Check token expiry before proceeding
		const tokenExpiry = new Date(integration.token_expiry);
		const now = new Date();
		const timeUntilExpiry = tokenExpiry.getTime() - now.getTime();

		if (timeUntilExpiry < 0) {
			console.log("❌ Token has already expired");
			return NextResponse.json(
				{
					success: false,
					message:
						"Authentication token has expired. Please reconnect your Microsoft account.",
					error: "token_expired",
					requiresReauth: true,
				},
				{ status: 401 },
			);
		}

		if (timeUntilExpiry < 5 * 60 * 1000) {
			// Less than 5 minutes until expiry
			console.log("⚠️ Token expires soon, attempting refresh before sync");
			try {
				// Force token refresh before sync
				const graphClient = createGraphClient(
					integration.access_token,
					integration.refresh_token,
					tokenExpiry,
				);
				// Test the connection to trigger refresh if needed
				await graphClient.getUserInfo();
				console.log("✅ Token refreshed successfully");
			} catch (refreshError) {
				console.error("❌ Token refresh failed:", refreshError);
				return NextResponse.json(
					{
						success: false,
						message:
							"Authentication token expired. Please reconnect your Microsoft account.",
						error: "token_expired",
						requiresReauth: true,
					},
					{ status: 401 },
				);
			}
		}

		// Parse request body for sync options (already read above)
		const { startDate, endDate, strategy = "newest" } = body || {};

		console.log("Sync options:", { startDate, endDate, strategy });

		// Create Graph client
		console.log("Creating Graph client...");
		const graphClient = createGraphClient(
			integration.access_token,
			integration.refresh_token,
			new Date(integration.token_expiry),
		);

		// Test Graph API connection before proceeding
		console.log("Testing Graph API connection...");
		try {
			await graphClient.getUserInfo();
			console.log("✅ Graph API connection successful");
		} catch (connectionError) {
			console.error("❌ Graph API connection failed:", connectionError);
			return NextResponse.json(
				{
					success: false,
					message:
						"Cannot connect to Microsoft Graph API. Please check your connection and try again.",
					error: "graph_connection_failed",
					details:
						connectionError instanceof Error
							? connectionError.message
							: "Unknown error",
				},
				{ status: 500 },
			);
		}

		// Perform bidirectional sync
		console.log("Starting bidirectional sync...");

		// Add timeout mechanism to prevent hanging
		const syncTimeout = 30000; // 30 seconds timeout
		const syncPromise = performBidirectionalSync(
			graphClient,
			userId,
			startDate ? new Date(startDate) : undefined,
			endDate ? new Date(endDate) : undefined,
			strategy,
		);

		const timeoutPromise = new Promise((_, reject) => {
			setTimeout(() => {
				reject(new Error("Sync operation timed out after 30 seconds"));
			}, syncTimeout);
		});

		const syncResult = (await Promise.race([
			syncPromise,
			timeoutPromise,
		])) as SyncResult;

		console.log("Sync completed:", syncResult);

		// Update last sync timestamp
		await updateLastSync(integration.$id!);

		// Enhanced result with detailed conflict and error information
		const detailedResult = {
			success: syncResult.success,
			syncedEvents: syncResult.syncedEvents,
			conflicts: syncResult.conflicts.map((conflict) => ({
				type: conflict.conflictType,
				caalmEvent: conflict.caalmEvent?.title || "Unknown",
				outlookEvent: conflict.outlookEvent?.subject || "Unknown",
			})),
			errors: syncResult.errors.map((error) => ({
				eventId: error.eventId,
				operation: error.operation,
				error: error.error,
			})),
		};

		console.log("📊 Sync completed with details:", {
			syncedEvents: syncResult.syncedEvents,
			conflictsCount: syncResult.conflicts.length,
			errorsCount: syncResult.errors.length,
			conflicts: detailedResult.conflicts,
			errors: detailedResult.errors,
		});

		// Log each error in detail for debugging
		if (syncResult.errors.length > 0) {
			console.log("🚨 SYNC ERRORS DETECTED:");
			syncResult.errors.forEach((error, index) => {
				console.log(`   Error ${index + 1}:`, {
					eventId: error.eventId,
					operation: error.operation,
					error: error.error,
				});
			});
		}

		// CRITICAL: Invalidate calendar cache after sync to ensure UI updates
		const CacheManager = (await import("@/lib/services/cache-manager")).default;
		await CacheManager.invalidateCalendar();
		console.log("Cache invalidated after sync");

		return NextResponse.json({
			success: true,
			result: detailedResult,
			message: `Sync completed: ${syncResult.syncedEvents} events synchronized, ${syncResult.conflicts.length} conflicts, ${syncResult.errors.length} errors`,
		});
	} catch (error) {
		console.error("Error syncing Microsoft calendar:", error);

		return NextResponse.json(
			{
				error: "Failed to sync calendar",
				details: error instanceof Error ? error.message : "Unknown error",
				stack: error instanceof Error ? error.stack : undefined,
			},
			{ status: 500 },
		);
	} finally {
		// Always release the sync lock
		syncLock = {
			isLocked: false,
			timestamp: 0,
		};
	}
}

/**
 * Perform bidirectional sync between CAALM and Microsoft Graph
 */
async function performBidirectionalSync(
	graphClient: any,
	userId: string,
	startDate?: Date,
	endDate?: Date,
	conflictStrategy: "caalm" | "outlook" | "newest" | "manual" = "newest",
): Promise<SyncResult> {
	const result: SyncResult = {
		success: true,
		syncedEvents: 0,
		conflicts: [],
		errors: [],
	};

	try {
		// Set default date range if not provided (last 30 days to next 30 days)
		const defaultStart = new Date();
		defaultStart.setDate(defaultStart.getDate() - 30);
		const defaultEnd = new Date();
		defaultEnd.setDate(defaultEnd.getDate() + 30);

		const syncStart = startDate || defaultStart;
		const syncEnd = endDate || defaultEnd;

		// Fetch events from both sources
		console.log("Fetching events from CAALM and Outlook...");
		console.log(
			"Sync date range:",
			syncStart.toISOString(),
			"to",
			syncEnd.toISOString(),
		);

		let caalmEvents: CalendarEvent[] = [];
		let outlookEvents: any[] = [];
		let primaryCalendar: any = null;

		try {
			console.log("Fetching CAALM events within sync date range...");

			// CRITICAL FIX: Fetch CAALM events within the same date range as Outlook
			// This prevents old/future events from being processed when they're not in Outlook's range
			const { getCalendarEventsByWeek } = await import(
				"@/lib/actions/calendar.actions"
			);
			const startDateStr = syncStart.toISOString().split("T")[0]; // YYYY-MM-DD
			const endDateStr = syncEnd.toISOString().split("T")[0]; // YYYY-MM-DD

			console.log("CAALM date range filter:", startDateStr, "to", endDateStr);
			caalmEvents = await getCalendarEventsByWeek(startDateStr, endDateStr);
			console.log(
				"CAALM events found (within date range):",
				caalmEvents.length,
			);
		} catch (caalmError) {
			console.error("Error fetching CAALM events:", caalmError);
			result.errors.push({
				eventId: "caalm-fetch",
				error:
					caalmError instanceof Error
						? caalmError.message
						: "Unknown CAALM error",
				operation: "sync",
			});
		}

		try {
			console.log("Fetching Outlook events...");
			console.log(
				"Sync date range for Outlook:",
				syncStart.toISOString(),
				"to",
				syncEnd.toISOString(),
			);

			// First, let's test basic connectivity
			console.log("Testing basic Graph API connectivity...");
			const userInfo = await graphClient.getUserInfo();
			console.log(
				"✅ Graph API connectivity test passed. User:",
				userInfo.displayName,
			);

			// Get calendars first
			console.log("Fetching Outlook calendars...");
			const calendars = await graphClient.getCalendars();
			console.log("Outlook calendars found:", calendars.length);

			if (calendars.length === 0) {
				console.warn("No Outlook calendars found!");
				return {
					success: true,
					syncedEvents: 0,
					conflicts: [],
					errors: [],
				};
			}

			// Use the primary calendar
			primaryCalendar =
				calendars.find(
					(cal: { isDefaultCalendar?: boolean }) => cal.isDefaultCalendar,
				) || calendars[0];
			console.log("Using calendar:", primaryCalendar.name, primaryCalendar.id);

			outlookEvents = await graphClient.getEventsInRange(
				syncStart,
				syncEnd,
				primaryCalendar.id,
			);
			console.log("Outlook events found:", outlookEvents.length);

			if (outlookEvents.length > 0) {
				console.log("Sample Outlook event:", {
					subject: outlookEvents[0].subject,
					start: outlookEvents[0].start,
					end: outlookEvents[0].end,
				});
			} else {
				console.log("No Outlook events found in the specified date range");
			}
		} catch (outlookError) {
			console.error("Error fetching Outlook events:", outlookError);
			result.errors.push({
				eventId: "outlook-fetch",
				error:
					outlookError instanceof Error
						? outlookError.message
						: "Unknown Outlook error",
				operation: "sync",
			});
		}

		// Check if we have a valid calendar
		if (!primaryCalendar) {
			console.error("No valid Outlook calendar found");
			result.errors.push({
				eventId: "calendar-fetch",
				error: "No valid Outlook calendar found",
				operation: "sync",
			});
			return result;
		}

		// Create maps for efficient lookup
		const caalmEventMap = new Map<string, CalendarEvent>(); // By generated key
		const caalmEventMapById = new Map<string, CalendarEvent>(); // By outlook_id (CRITICAL for updates)
		const outlookEventMap = new Map<string, any>(); // By generated key

		// Populate CAALM event map (both by key and by outlook_id)
		console.log("Building CAALM event map from", caalmEvents.length, "events");
		caalmEvents.forEach((event) => {
			const key = generateEventKey(event);
			caalmEventMap.set(key, event);
			// CRITICAL: Also index by outlook_id to handle updates when event details change
			if (event.outlook_id) {
				caalmEventMapById.set(event.outlook_id, event);
			}
		});
		console.log("CAALM event map size:", caalmEventMap.size);
		console.log("CAALM event map by outlook_id size:", caalmEventMapById.size);

		// CRITICAL FILTER: Remove any Outlook events outside the sync date range BEFORE processing
		// This prevents old events (like August) from being synced when creating new events
		const filteredOutlookEvents = outlookEvents.filter((event: any) => {
			if (!event.start?.dateTime) return false;
			const eventStartDate = new Date(event.start.dateTime);
			const isInRange =
				eventStartDate >= syncStart && eventStartDate <= syncEnd;
			if (!isInRange) {
				console.log(
					"⏭️ Filtering out Outlook event outside sync range:",
					event.subject,
					"Date:",
					eventStartDate.toISOString(),
					"Range:",
					syncStart.toISOString(),
					"to",
					syncEnd.toISOString(),
				);
			}
			return isInRange;
		});

		console.log(
			`📊 Filtered Outlook events: ${outlookEvents.length} total → ${filteredOutlookEvents.length} within date range`,
		);

		// Populate Outlook event map (both by key and by ID) - ONLY from filtered events
		console.log(
			"Building Outlook event map from",
			filteredOutlookEvents.length,
			"filtered events",
		);
		const outlookEventMapById = new Map<string, any>();
		filteredOutlookEvents.forEach((event: any) => {
			const key = generateEventKey(event);
			outlookEventMap.set(key, event);
			outlookEventMapById.set(event.id, event);
		});
		console.log("Outlook event map size:", outlookEventMap.size);

		// Find events that exist in both systems
		// CRITICAL: Match by outlook_id FIRST (handles updates when event details change)
		// Then match by key for events without outlook_id
		const commonEventsByOutlookId = new Map<
			string,
			{ caalm: CalendarEvent; outlook: any }
		>();
		const matchedOutlookIds = new Set<string>();
		const matchedCaalmKeys = new Set<string>();

		// Match by outlook_id (handles event updates)
		outlookEventMapById.forEach((outlookEvent, outlookId) => {
			const caalmEvent = caalmEventMapById.get(outlookId);
			if (caalmEvent) {
				commonEventsByOutlookId.set(outlookId, {
					caalm: caalmEvent,
					outlook: outlookEvent,
				});
				matchedOutlookIds.add(outlookId);
				matchedCaalmKeys.add(generateEventKey(caalmEvent));
			}
		});

		// Also match by key for events without outlook_id or that weren't matched by ID
		const commonKeys = new Set(
			[...caalmEventMap.keys()].filter((key) => {
				if (matchedCaalmKeys.has(key)) return false; // Already matched by outlook_id
				return outlookEventMap.has(key);
			}),
		);

		// Find events that only exist in CAALM (not matched by outlook_id or key)
		const caalmOnlyKeys = new Set(
			[...caalmEventMap.keys()].filter((key) => {
				const event = caalmEventMap.get(key)!;
				// Exclude if matched by outlook_id
				if (event.outlook_id && matchedOutlookIds.has(event.outlook_id))
					return false;
				// Exclude if matched by key
				return !outlookEventMap.has(key);
			}),
		);

		// Find events that only exist in Outlook (not matched by outlook_id or key)
		const outlookOnlyKeys = new Set(
			[...outlookEventMap.keys()].filter((key) => {
				const outlookEvent = outlookEventMap.get(key)!;
				// Exclude if matched by outlook_id
				if (outlookEvent.id && matchedOutlookIds.has(outlookEvent.id))
					return false;
				// Exclude if matched by key
				return !caalmEventMap.has(key);
			}),
		);

		console.log("📊 Event matching summary:", {
			matchedByOutlookId: commonEventsByOutlookId.size,
			matchedByKey: commonKeys.size,
			caalmOnly: caalmOnlyKeys.size,
			outlookOnly: outlookOnlyKeys.size,
		});

		// Process common events matched by outlook_id (handles updates when event details change)
		for (const [outlookId, { caalm, outlook }] of commonEventsByOutlookId) {
			const conflict = detectConflict(caalm, outlook);
			if (conflict) {
				console.log("🔍 Conflict detected (matched by outlook_id):", {
					caalmEvent: caalm.title,
					outlookEvent: outlook.subject,
					conflictType: conflict.conflictType,
					strategy: conflictStrategy,
					outlookId,
				});
				result.conflicts.push(conflict);

				// Resolve conflict based on strategy
				const resolution = resolveConflict(conflict, conflictStrategy);
				if (resolution.resolved && resolution.event) {
					// Update the event in both systems
					try {
						if (resolution.event === caalm) {
							// Update Outlook with CAALM version
							const graphEvent = caalmEventToGraph(caalm);

							// Validate Outlook event ID format
							if (!outlook.id || outlook.id.length < 10) {
								console.warn(
									"Invalid Outlook event ID, skipping update:",
									outlook.id,
								);
								continue;
							}

							console.log("Updating Outlook event with CAALM data:", {
								outlookEventId: outlook.id,
								caalmEventId: caalm.$id,
								graphEvent: {
									subject: graphEvent.subject,
									start: graphEvent.start,
									end: graphEvent.end,
								},
							});
							await graphClient.updateEvent(
								outlook.id,
								graphEvent,
								primaryCalendar.id,
							);
						} else {
							// Update CAALM with Outlook version (this handles time/date updates)
							const caalmEventData = graphEventToCaalm(outlook);
							console.log("🔄 Updating CAALM event with Outlook changes:", {
								caalmEventId: caalm.$id,
								outlookEventId: outlook.id,
								oldTime: `${caalm.startDate} ${caalm.startTime}`,
								newTime: `${caalmEventData.startDate} ${caalmEventData.startTime}`,
								caalmEventData: {
									title: caalmEventData.title,
									startDate: caalmEventData.startDate,
									startTime: caalmEventData.startTime,
								},
							});
							await updateCalendarEvent(caalm.$id!, caalmEventData);

							// Invalidate cache for the updated event
							const eventDate = new Date(caalmEventData.startDate);
							const CacheManager = (
								await import("@/lib/services/cache-manager")
							).default;
							await CacheManager.invalidateCalendar(
								eventDate.getFullYear(),
								eventDate.getMonth() + 1,
							);
						}
						result.syncedEvents++;
					} catch (error) {
						console.error(
							"Error updating event during conflict resolution:",
							error,
						);
						result.errors.push({
							eventId: caalm.$id || outlook.id || "unknown",
							error: error instanceof Error ? error.message : "Unknown error",
							operation: "update",
						});
					}
				}
			} else {
				// No conflict detected, events are in sync
				console.log("✅ Events match (no update needed):", {
					title: caalm.title,
					outlookId,
				});
			}
		}

		// Process common events matched by key (for events without outlook_id)
		for (const key of commonKeys) {
			const caalmEvent = caalmEventMap.get(key)!;
			const outlookEvent = outlookEventMap.get(key)!;

			const conflict = detectConflict(caalmEvent, outlookEvent);
			if (conflict) {
				console.log("🔍 Conflict detected (matched by key):", {
					caalmEvent: caalmEvent.title,
					outlookEvent: outlookEvent.subject,
					conflictType: conflict.conflictType,
					strategy: conflictStrategy,
				});
				result.conflicts.push(conflict);

				// Resolve conflict based on strategy
				const resolution = resolveConflict(conflict, conflictStrategy);
				if (resolution.resolved && resolution.event) {
					// Update the event in both systems
					try {
						if (resolution.event === caalmEvent) {
							// Update Outlook with CAALM version
							const graphEvent = caalmEventToGraph(caalmEvent);

							// Validate Outlook event ID format
							if (!outlookEvent.id || outlookEvent.id.length < 10) {
								console.warn(
									"Invalid Outlook event ID, skipping update:",
									outlookEvent.id,
								);
								continue;
							}

							console.log("Updating Outlook event with CAALM data:", {
								outlookEventId: outlookEvent.id,
								caalmEventId: caalmEvent.$id,
								graphEvent: {
									subject: graphEvent.subject,
									start: graphEvent.start,
									end: graphEvent.end,
								},
							});
							await graphClient.updateEvent(
								outlookEvent.id,
								graphEvent,
								primaryCalendar.id,
							);
						} else {
							// Update CAALM with Outlook version
							const caalmEventData = graphEventToCaalm(outlookEvent);
							console.log("Updating CAALM event with Outlook data:", {
								caalmEventId: caalmEvent.$id,
								outlookEventId: outlookEvent.id,
								caalmEventData: {
									title: caalmEventData.title,
									startDate: caalmEventData.startDate,
									startTime: caalmEventData.startTime,
								},
							});
							await updateCalendarEvent(caalmEvent.$id!, caalmEventData);

							// Invalidate cache for the updated event
							const eventDate = new Date(caalmEventData.startDate);
							const CacheManager = (
								await import("@/lib/services/cache-manager")
							).default;
							await CacheManager.invalidateCalendar(
								eventDate.getFullYear(),
								eventDate.getMonth() + 1,
							);
						}
						result.syncedEvents++;
					} catch (error) {
						console.error(
							"Error updating event during conflict resolution:",
							error,
						);
						result.errors.push({
							eventId: caalmEvent.$id || outlookEvent.id || "unknown",
							error: error instanceof Error ? error.message : "Unknown error",
							operation: "update",
						});
					}
				}
			}
		}

		// Process CAALM-only events (push to Outlook) with batch processing
		console.log("Processing CAALM-only events:", caalmOnlyKeys.size);

		// Import batch processor
		const { processBatches, chunk } = await import(
			"@/lib/utils/batch-processor"
		);

		// Convert Set to Array and filter valid events
		const caalmEventsToSync = Array.from(caalmOnlyKeys)
			.map((key) => caalmEventMap.get(key)!)
			.filter((event) => {
				// Pre-filter invalid events
				if (!event.startDate || !event.title) return false;
				if (event.createdBy === "outlook-sync") return false;
				return true;
			});

		// Process in batches of 10 with concurrency of 5
		const batches = chunk(caalmEventsToSync, 10);
		console.log(
			`Processing ${caalmEventsToSync.length} events in ${batches.length} batches`,
		);

		for (const batch of batches) {
			// Process each batch with concurrency control
			const batchPromises = batch.map(async (caalmEvent) => {
				const _key = generateEventKey(caalmEvent);
				console.log(`Processing batch item: ${caalmEvent.title}`);

				try {
					// Check if this event already has an outlook_id (already synced to Outlook)
					// Only skip if the event already exists in Outlook
					if (caalmEvent.outlook_id) {
						// Verify the event still exists in Outlook before skipping
						try {
							const outlookEvent = outlookEvents.find(
								(e) => e.id === caalmEvent.outlook_id,
							);
							if (outlookEvent) {
								console.log(
									"Skipping already synced CAALM event:",
									caalmEvent.title,
									"outlook_id:",
									caalmEvent.outlook_id,
								);
								return;
							} else {
								// Outlook event was deleted, delete the CAALM event too
								console.log(
									"Outlook event not found, deleting CAALM event:",
									caalmEvent.title,
								);
								const { deleteCalendarEvent } = await import(
									"@/lib/actions/calendar.actions"
								);
								await deleteCalendarEvent(caalmEvent.$id!);
								console.log(
									"Successfully deleted CAALM event:",
									caalmEvent.$id,
								);
								return; // Skip to next event
							}
						} catch (error) {
							console.error("Error checking Outlook event:", error);
							// If it's a 404 error, the event was deleted in Outlook
							if (error instanceof Error && error.message.includes("404")) {
								console.log(
									"Outlook event deleted (404), deleting CAALM event:",
									caalmEvent.title,
								);
								const { deleteCalendarEvent } = await import(
									"@/lib/actions/calendar.actions"
								);
								await deleteCalendarEvent(caalmEvent.$id!);
								console.log(
									"Successfully deleted CAALM event:",
									caalmEvent.$id,
								);
								return; // Skip to next event
							}
							// Continue to attempt sync for other errors
						}
					}

					// Validate the event before converting
					if (!caalmEvent.startDate || !caalmEvent.title) {
						console.warn("Skipping invalid CAALM event:", caalmEvent);
						return;
					}

					// Skip events created by Outlook sync to prevent loops (but allow manually created events)
					// This is a safeguard to prevent circular sync loops
					if (caalmEvent.createdBy === "outlook-sync") {
						console.log(
							"Skipping CAALM event created by Outlook sync:",
							caalmEvent.title,
						);
						return;
					}

					console.log("Converting CAALM event to Graph format:", {
						title: caalmEvent.title,
						startDate: caalmEvent.startDate,
						type: caalmEvent.type,
					});

					const graphEvent = caalmEventToGraph(caalmEvent);

					console.log("Converted Graph event:", {
						subject: graphEvent.subject,
						start: graphEvent.start,
						end: graphEvent.end,
					});

					// Validate the converted event
					if (
						!graphEvent.subject ||
						!graphEvent.start?.dateTime ||
						!graphEvent.end?.dateTime
					) {
						console.warn("Skipping invalid Graph event:", graphEvent);
						return;
					}

					console.log("Creating event in Microsoft Graph...");
					const createdEvent = await graphClient.createEvent(
						graphEvent,
						primaryCalendar.id,
					);

					// Store Outlook event ID in CAALM event for future reference
					await updateCalendarEvent(caalmEvent.$id!, {
						...caalmEvent,
						// Add outlook_id field to track the synced event
						outlook_id: createdEvent.id,
					} as any);

					result.syncedEvents++;
					console.log("Successfully created Outlook event:", createdEvent.id);
				} catch (error) {
					console.error(
						"Failed to create Outlook event for CAALM event:",
						caalmEvent.$id,
						error,
					);

					// Check if it's a validation error from our conversion
					if (error instanceof Error && error.message.includes("Event")) {
						console.warn(
							"Skipping event due to validation error:",
							error.message,
						);
						return; // Skip this event instead of adding to errors
					}

					// Enhanced error logging for debugging
					console.error("❌ Detailed sync error:", {
						eventId: caalmEvent.$id || "unknown",
						error: error instanceof Error ? error.message : "Unknown error",
						operation: "create",
						eventData: {
							title: caalmEvent.title,
							startDate: caalmEvent.startDate,
							type: caalmEvent.type,
							endTime: caalmEvent.endTime,
						},
						stack: error instanceof Error ? error.stack : undefined,
					});

					result.errors.push({
						eventId: caalmEvent.$id || "unknown",
						error: error instanceof Error ? error.message : "Unknown error",
						operation: "create" as const,
					});
				}
			});

			// Wait for batch to complete before moving to next batch
			const batchResults = await Promise.allSettled(batchPromises);
			console.log(`Completed batch: ${batchResults.length} events processed`);
		}

		// Process Outlook-only events (pull to CAALM)
		console.log("Processing Outlook-only events:", outlookOnlyKeys.size);
		let createdCount = 0;
		let skippedCount = 0;

		for (const key of outlookOnlyKeys) {
			const outlookEvent = outlookEventMap.get(key)!;

			try {
				console.log(
					"Converting Outlook event to CAALM format:",
					outlookEvent.subject,
				);

				// CRITICAL: Re-fetch CAALM events within the same date range to get the latest state
				// This prevents duplicate creation when multiple syncs run quickly
				// MUST use date-filtered events to prevent old events from interfering with sync
				console.log(
					"🔄 Refreshing CAALM events list for duplicate check (within date range)...",
				);
				const { getCalendarEventsByWeek } = await import(
					"@/lib/actions/calendar.actions"
				);
				const startDateStr = syncStart.toISOString().split("T")[0]; // YYYY-MM-DD
				const endDateStr = syncEnd.toISOString().split("T")[0]; // YYYY-MM-DD
				const latestCaalmEvents = await getCalendarEventsByWeek(
					startDateStr,
					endDateStr,
				);
				console.log(
					`📊 Latest CAALM events count (within date range): ${latestCaalmEvents.length}`,
				);

				// CRITICAL: Check if this Outlook event already exists in CAALM (prevent duplicates)
				let duplicateCheck: CalendarEvent | undefined;

				if (outlookEvent.id) {
					// First check within date range (fast check)
					duplicateCheck = latestCaalmEvents.find((existingEvent) => {
						return existingEvent.outlook_id === outlookEvent.id;
					});

					// If not found in date range, check ALL events by outlook_id (CRITICAL: prevents recreating old events)
					if (!duplicateCheck) {
						const { getCalendarEvents } = await import(
							"@/lib/actions/calendar.actions"
						);
						const allCaalmEvents = await getCalendarEvents();
						duplicateCheck = allCaalmEvents.find((existingEvent) => {
							return existingEvent.outlook_id === outlookEvent.id;
						});
						if (duplicateCheck) {
							console.log(
								`⚠️ Found existing event with same outlook_id outside date range:`,
								outlookEvent.id,
								"Existing event:",
								duplicateCheck.title,
								"Date:",
								duplicateCheck.startDate,
							);
						}
					}
				}

				// Also check by key if not found by outlook_id
				if (!duplicateCheck) {
					const checkKey = generateEventKey(outlookEvent);
					duplicateCheck = latestCaalmEvents.find(
						(e) => generateEventKey(e) === checkKey,
					);
					if (duplicateCheck) {
						console.log(`✅ Found duplicate by key: ${checkKey}`);
					}
				}

				if (duplicateCheck) {
					console.log(
						"✅ Outlook event already exists in CAALM, skipping duplicate:",
						outlookEvent.subject,
						"outlook_id:",
						duplicateCheck.outlook_id || "none",
						"CAALM event ID:",
						duplicateCheck.$id,
					);
					skippedCount++;
					result.syncedEvents++;
					continue;
				}

				// CRITICAL SAFEGUARD: Verify event is within sync date range before creating
				// This prevents old events from being synced even if they somehow pass other checks
				const eventStartDate = new Date(outlookEvent.start.dateTime);
				if (eventStartDate < syncStart || eventStartDate > syncEnd) {
					console.log(
						"⏭️ Skipping Outlook event outside sync date range:",
						outlookEvent.subject,
						"Event date:",
						eventStartDate.toISOString(),
						"Sync range:",
						syncStart.toISOString(),
						"to",
						syncEnd.toISOString(),
					);
					skippedCount++;
					continue;
				}

				const caalmEventData = graphEventToCaalm(outlookEvent);
				caalmEventData.createdBy = userId;

				console.log(
					"🆕 Creating NEW CAALM event:",
					caalmEventData.title,
					"outlook_id:",
					outlookEvent.id,
				);
				const createdEvent = await createCalendarEvent(caalmEventData);

				// outlook_id is now set in graphEventToCaalm, no need to update

				console.log(
					"✅ Successfully created NEW CAALM event from Outlook:",
					createdEvent.$id,
					"Title:",
					caalmEventData.title,
				);

				// CRITICAL: Invalidate cache to ensure UI shows the new event immediately
				// This prevents stale cache from causing duplicate detection failures
				const eventDate = new Date(caalmEventData.startDate);
				const CacheManager = (await import("@/lib/services/cache-manager"))
					.default;
				await CacheManager.invalidateCalendar(
					eventDate.getFullYear(),
					eventDate.getMonth() + 1,
				);
				console.log(
					"🔄 Invalidated cache for:",
					eventDate.getFullYear(),
					eventDate.getMonth() + 1,
				);

				createdCount++;
				result.syncedEvents++;
			} catch (error) {
				console.error("Error creating CAALM event from Outlook event:", error);
				console.error("Outlook event data:", outlookEvent);
				// Enhanced error logging for debugging
				console.error("Detailed Outlook to CAALM error:", {
					eventId: outlookEvent.id || "unknown",
					error: error instanceof Error ? error.message : "Unknown error",
					operation: "create",
					eventData: {
						subject: outlookEvent.subject,
						start: outlookEvent.start,
						end: outlookEvent.end,
						body: outlookEvent.body,
					},
					stack: error instanceof Error ? error.stack : undefined,
				});

				result.errors.push({
					eventId: outlookEvent.id || "unknown",
					error: error instanceof Error ? error.message : "Unknown error",
					operation: "create" as const,
				});
			}
		}

		console.log("📊 Outlook-only processing complete:", {
			total: outlookOnlyKeys.size,
			created: createdCount,
			skipped: skippedCount,
			errors: result.errors.length,
		});

		// Analyze error patterns for debugging
		if (result.errors.length > 0) {
			result.success = false;

			// Categorize errors for better debugging
			const errorCategories = {
				validation: result.errors.filter(
					(e) => e.error.includes("Event") || e.error.includes("Invalid"),
				),
				network: result.errors.filter(
					(e) => e.error.includes("timeout") || e.error.includes("network"),
				),
				permission: result.errors.filter(
					(e) =>
						e.error.includes("401") ||
						e.error.includes("403") ||
						e.error.includes("Unauthorized"),
				),
				malformed: result.errors.filter(
					(e) => e.error.includes("malformed") || e.error.includes("InvalidId"),
				),
				other: result.errors.filter(
					(e) =>
						!e.error.includes("Event") &&
						!e.error.includes("Invalid") &&
						!e.error.includes("timeout") &&
						!e.error.includes("network") &&
						!e.error.includes("401") &&
						!e.error.includes("403") &&
						!e.error.includes("Unauthorized") &&
						!e.error.includes("malformed") &&
						!e.error.includes("InvalidId"),
				),
			};

			console.log("Error analysis:", {
				total: result.errors.length,
				categories: {
					validation: errorCategories.validation.length,
					network: errorCategories.network.length,
					permission: errorCategories.permission.length,
					malformed: errorCategories.malformed.length,
					other: errorCategories.other.length,
				},
				sampleErrors: {
					validation: errorCategories.validation.slice(0, 2),
					network: errorCategories.network.slice(0, 2),
					permission: errorCategories.permission.slice(0, 2),
					malformed: errorCategories.malformed.slice(0, 2),
					other: errorCategories.other.slice(0, 2),
				},
			});
		}
	} catch (error) {
		console.error("Error in performBidirectionalSync:", error);
		result.success = false;
		result.errors.push({
			eventId: "sync",
			error: error instanceof Error ? error.message : "Unknown sync error",
			operation: "sync",
		});
	}

	return result;
}

/**
 * Generate a unique key for event comparison
 * CRITICAL: Includes time to allow multiple events with same title on same date
 */
function generateEventKey(event: any): string {
	// Normalize the event data for consistent key generation
	const title = (event.title || event.subject || "").toLowerCase().trim();
	const startDateTime = event.start?.dateTime || event.startDate || "";
	const startTime = event.startTime || "";

	// Extract date part (YYYY-MM-DD)
	let datePart = "";
	if (startDateTime) {
		try {
			// If the date is already in YYYY-MM-DD format, use it directly
			if (startDateTime.match(/^\d{4}-\d{2}-\d{2}$/)) {
				datePart = startDateTime;
			} else {
				// If it's an ISO string or other format, extract the YYYY-MM-DD part
				datePart = startDateTime.split("T")[0] || "";
			}
		} catch (_error) {
			console.warn("Invalid date in event:", startDateTime);
			datePart = startDateTime.split("T")[0] || "";
		}
	}

	// Extract time part and normalize it
	let timePart = "";
	if (startTime) {
		// If time is in 12-hour format (e.g., "8:00 AM"), convert to 24-hour for consistency
		const timeMatch = startTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
		if (timeMatch) {
			let hours = parseInt(timeMatch[1], 10);
			const minutes = timeMatch[2];
			const period = timeMatch[3].toUpperCase();

			if (period === "PM" && hours !== 12) {
				hours += 12;
			} else if (period === "AM" && hours === 12) {
				hours = 0;
			}
			timePart = `${String(hours).padStart(2, "0")}:${minutes}`;
		} else {
			// Assume 24-hour format (e.g., "08:00" or "14:30")
			timePart = startTime.split(" ")[0]; // Remove AM/PM if present
		}
	} else if (startDateTime) {
		// Extract time from ISO string if available
		const timeMatch = startDateTime.match(/T(\d{2}):(\d{2})/);
		if (timeMatch) {
			timePart = `${timeMatch[1]}:${timeMatch[2]}`;
		}
	}

	// Default to "00:00" if no time found
	if (!timePart) {
		timePart = "00:00";
	}

	// Create a consistent key using title, date, AND time
	const normalizedTitle = title.replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
	const normalizedTime = timePart.replace(/:/g, ""); // Remove colon for cleaner key
	const key = `${normalizedTitle}_${datePart}_${normalizedTime}`;

	console.log("Generated event key:", key, "for event:", {
		title: event.title || event.subject,
		start: event.start?.dateTime || event.startDate,
		time: startTime,
	});

	return key;
}
