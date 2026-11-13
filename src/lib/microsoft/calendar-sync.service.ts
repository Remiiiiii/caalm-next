/**
 * Core Outlook <-> CAALM bidirectional calendar sync, callable directly
 * in-process. Extracted from the old /api/microsoft/calendar/sync route so
 * every caller (the HTTP route, the auto-sync route, and server actions)
 * shares one implementation instead of each making its own self-HTTP call
 * to this same logic.
 */

import {
	type CalendarEvent,
	createCalendarEvent,
	updateCalendarEvent,
} from "@/lib/actions/calendar.actions";
import {
	getValidIntegration,
	updateLastSync,
} from "@/lib/actions/calendar-integration.actions";
import {
	createGraphClient,
	type MicrosoftGraphClient,
} from "@/lib/microsoft/graph-client";
import {
	caalmEventToGraph,
	detectConflict,
	graphEventToCaalm,
	resolveConflict,
	type SyncResult,
} from "@/lib/microsoft/sync";
import {
	acquireProcessSyncLock,
	checkProcessSyncLock,
	getGlobalSyncLockStatus,
	releaseProcessSyncLock,
} from "@/lib/microsoft/sync-locks";

export type SyncOutlookCalendarStrategy =
	| "caalm"
	| "outlook"
	| "newest"
	| "manual";

export type SyncOutlookCalendarOptions = {
	startDate?: Date;
	endDate?: Date;
	strategy?: SyncOutlookCalendarStrategy;
};

export type SyncOutlookCalendarOutcome = {
	/** Status the HTTP routes should respond with. */
	httpStatus: number;
	success: boolean;
	message: string;
	result?: {
		syncedEvents: number;
		conflicts: Array<{
			type: string;
			caalmEvent: string;
			outlookEvent: string;
		}>;
		errors: Array<{ eventId: string; operation: string; error: string }>;
	};
	globalLock?: boolean;
	lockedUntil?: string;
	cooldownRemaining?: number;
	sync_enabled?: boolean;
	error?: string;
	requiresReauth?: boolean;
	details?: string;
};

export async function syncOutlookCalendarForUser(
	userId: string,
	options: SyncOutlookCalendarOptions = {},
): Promise<SyncOutlookCalendarOutcome> {
	const globalLockStatus = getGlobalSyncLockStatus();
	if (globalLockStatus.isLocked) {
		console.log("🚨 Global sync lock is active - blocking all sync operations");
		return {
			httpStatus: 423,
			success: false,
			message: "Sync is globally locked. All sync operations are blocked.",
			globalLock: true,
		};
	}

	const lockCheck = checkProcessSyncLock();
	if (lockCheck.blocked) {
		return { httpStatus: lockCheck.status, ...lockCheck.body };
	}

	acquireProcessSyncLock();

	try {
		console.log("Getting Microsoft integration for user:", userId);
		const integration = await getValidIntegration(userId, "microsoft");

		if (!integration) {
			console.error("No Microsoft integration found for user:", userId);
			return {
				httpStatus: 404,
				success: false,
				message: "Microsoft calendar integration not found or expired",
				error: "Microsoft calendar integration not found or expired",
			};
		}

		if (!integration.sync_enabled) {
			console.log("Sync is disabled for user:", userId);
			return {
				httpStatus: 200,
				success: false,
				message:
					"Sync is currently disabled. Enable it in calendar settings to resume synchronization.",
				sync_enabled: false,
			};
		}

		const tokenExpiry = new Date(integration.token_expiry);
		const now = new Date();
		const timeUntilExpiry = tokenExpiry.getTime() - now.getTime();

		if (timeUntilExpiry < 0) {
			console.log("❌ Token has already expired");
			return {
				httpStatus: 401,
				success: false,
				message:
					"Authentication token has expired. Please reconnect your Microsoft account.",
				error: "token_expired",
				requiresReauth: true,
			};
		}

		if (timeUntilExpiry < 5 * 60 * 1000) {
			console.log("⚠️ Token expires soon, attempting refresh before sync");
			try {
				const graphClient = createGraphClient(
					integration.access_token,
					integration.refresh_token,
					tokenExpiry,
				);
				await graphClient.getUserInfo();
				console.log("✅ Token refreshed successfully");
			} catch (refreshError) {
				console.error("❌ Token refresh failed:", refreshError);
				return {
					httpStatus: 401,
					success: false,
					message:
						"Authentication token expired. Please reconnect your Microsoft account.",
					error: "token_expired",
					requiresReauth: true,
				};
			}
		}

		const { startDate, endDate, strategy = "newest" } = options;

		console.log("Creating Graph client...");
		const graphClient = createGraphClient(
			integration.access_token,
			integration.refresh_token,
			new Date(integration.token_expiry),
		);

		console.log("Testing Graph API connection...");
		try {
			await graphClient.getUserInfo();
			console.log("✅ Graph API connection successful");
		} catch (connectionError) {
			console.error("❌ Graph API connection failed:", connectionError);
			return {
				httpStatus: 500,
				success: false,
				message:
					"Cannot connect to Microsoft Graph API. Please check your connection and try again.",
				error: "graph_connection_failed",
				details:
					connectionError instanceof Error
						? connectionError.message
						: "Unknown error",
			};
		}

		console.log("Starting bidirectional sync...");
		const syncTimeout = 30000;
		const syncPromise = performBidirectionalSync(
			graphClient,
			userId,
			startDate,
			endDate,
			strategy,
		);
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => {
				reject(new Error("Sync operation timed out after 30 seconds"));
			}, syncTimeout);
		});

		const syncResult = await Promise.race([syncPromise, timeoutPromise]);

		console.log("Sync completed:", syncResult);

		await updateLastSync(integration.$id!);

		const detailedResult = {
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

		const CacheManager = (await import("@/lib/services/cache-manager")).default;
		await CacheManager.invalidateCalendar();
		console.log("Cache invalidated after sync");

		return {
			httpStatus: 200,
			success: true,
			result: detailedResult,
			message: `Sync completed: ${syncResult.syncedEvents} events synchronized, ${syncResult.conflicts.length} conflicts, ${syncResult.errors.length} errors`,
		};
	} catch (error) {
		console.error("Error syncing Microsoft calendar:", error);
		return {
			httpStatus: 500,
			success: false,
			message: "Failed to sync calendar",
			error: "Failed to sync calendar",
			details: error instanceof Error ? error.message : "Unknown error",
		};
	} finally {
		releaseProcessSyncLock();
	}
}

/**
 * Perform bidirectional sync between CAALM and Microsoft Graph
 */
async function performBidirectionalSync(
	graphClient: MicrosoftGraphClient,
	userId: string,
	startDate?: Date,
	endDate?: Date,
	conflictStrategy: SyncOutlookCalendarStrategy = "newest",
): Promise<SyncResult> {
	const result: SyncResult = {
		success: true,
		syncedEvents: 0,
		conflicts: [],
		errors: [],
	};

	try {
		const defaultStart = new Date();
		defaultStart.setDate(defaultStart.getDate() - 30);
		const defaultEnd = new Date();
		defaultEnd.setDate(defaultEnd.getDate() + 30);

		const syncStart = startDate || defaultStart;
		const syncEnd = endDate || defaultEnd;

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
			const { getCalendarEventsByWeek } = await import(
				"@/lib/actions/calendar.actions"
			);
			const startDateStr = syncStart.toISOString().split("T")[0];
			const endDateStr = syncEnd.toISOString().split("T")[0];

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

			console.log("Testing basic Graph API connectivity...");
			const userInfo = await graphClient.getUserInfo();
			console.log(
				"✅ Graph API connectivity test passed. User:",
				userInfo.displayName,
			);

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

		if (!primaryCalendar) {
			console.error("No valid Outlook calendar found");
			result.errors.push({
				eventId: "calendar-fetch",
				error: "No valid Outlook calendar found",
				operation: "sync",
			});
			return result;
		}

		const caalmEventMap = new Map<string, CalendarEvent>();
		const caalmEventMapById = new Map<string, CalendarEvent>();
		const outlookEventMap = new Map<string, any>();

		console.log("Building CAALM event map from", caalmEvents.length, "events");
		caalmEvents.forEach((event) => {
			const key = generateEventKey(event);
			caalmEventMap.set(key, event);
			if (event.outlook_id) {
				caalmEventMapById.set(event.outlook_id, event);
			}
		});
		console.log("CAALM event map size:", caalmEventMap.size);
		console.log("CAALM event map by outlook_id size:", caalmEventMapById.size);

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

		const commonEventsByOutlookId = new Map<
			string,
			{ caalm: CalendarEvent; outlook: any }
		>();
		const matchedOutlookIds = new Set<string>();
		const matchedCaalmKeys = new Set<string>();

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

		const commonKeys = new Set(
			[...caalmEventMap.keys()].filter((key) => {
				if (matchedCaalmKeys.has(key)) return false;
				return outlookEventMap.has(key);
			}),
		);

		const caalmOnlyKeys = new Set(
			[...caalmEventMap.keys()].filter((key) => {
				const event = caalmEventMap.get(key)!;
				if (event.outlook_id && matchedOutlookIds.has(event.outlook_id))
					return false;
				return !outlookEventMap.has(key);
			}),
		);

		const outlookOnlyKeys = new Set(
			[...outlookEventMap.keys()].filter((key) => {
				const outlookEvent = outlookEventMap.get(key)!;
				if (outlookEvent.id && matchedOutlookIds.has(outlookEvent.id))
					return false;
				return !caalmEventMap.has(key);
			}),
		);

		console.log("📊 Event matching summary:", {
			matchedByOutlookId: commonEventsByOutlookId.size,
			matchedByKey: commonKeys.size,
			caalmOnly: caalmOnlyKeys.size,
			outlookOnly: outlookOnlyKeys.size,
		});

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

				const resolution = resolveConflict(conflict, conflictStrategy);
				if (resolution.resolved && resolution.event) {
					try {
						if (resolution.event === caalm) {
							const graphEvent = caalmEventToGraph(caalm);

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
				console.log("✅ Events match (no update needed):", {
					title: caalm.title,
					outlookId,
				});
			}
		}

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

				const resolution = resolveConflict(conflict, conflictStrategy);
				if (resolution.resolved && resolution.event) {
					try {
						if (resolution.event === caalmEvent) {
							const graphEvent = caalmEventToGraph(caalmEvent);

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

		console.log("Processing CAALM-only events:", caalmOnlyKeys.size);

		const { chunk } = await import("@/lib/utils/batch-processor");

		const caalmEventsToSync = Array.from(caalmOnlyKeys)
			.map((key) => caalmEventMap.get(key)!)
			.filter((event) => {
				if (!event.startDate || !event.title) return false;
				if (event.createdBy === "outlook-sync") return false;
				return true;
			});

		const batches = chunk(caalmEventsToSync, 10);
		console.log(
			`Processing ${caalmEventsToSync.length} events in ${batches.length} batches`,
		);

		for (const batch of batches) {
			const batchPromises = batch.map(async (caalmEvent) => {
				console.log(`Processing batch item: ${caalmEvent.title}`);

				try {
					if (caalmEvent.outlook_id) {
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
								return;
							}
						} catch (error) {
							console.error("Error checking Outlook event:", error);
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
								return;
							}
						}
					}

					if (!caalmEvent.startDate || !caalmEvent.title) {
						console.warn("Skipping invalid CAALM event:", caalmEvent);
						return;
					}

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

					await updateCalendarEvent(caalmEvent.$id!, {
						...caalmEvent,
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

					if (error instanceof Error && error.message.includes("Event")) {
						console.warn(
							"Skipping event due to validation error:",
							error.message,
						);
						return;
					}

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

			const batchResults = await Promise.allSettled(batchPromises);
			console.log(`Completed batch: ${batchResults.length} events processed`);
		}

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

				console.log(
					"🔄 Refreshing CAALM events list for duplicate check (within date range)...",
				);
				const { getCalendarEventsByWeek } = await import(
					"@/lib/actions/calendar.actions"
				);
				const startDateStr = syncStart.toISOString().split("T")[0];
				const endDateStr = syncEnd.toISOString().split("T")[0];
				const latestCaalmEvents = await getCalendarEventsByWeek(
					startDateStr,
					endDateStr,
				);
				console.log(
					`📊 Latest CAALM events count (within date range): ${latestCaalmEvents.length}`,
				);

				let duplicateCheck: CalendarEvent | undefined;

				if (outlookEvent.id) {
					duplicateCheck = latestCaalmEvents.find((existingEvent) => {
						return existingEvent.outlook_id === outlookEvent.id;
					});

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

				console.log(
					"✅ Successfully created NEW CAALM event from Outlook:",
					createdEvent.$id,
					"Title:",
					caalmEventData.title,
				);

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

		if (result.errors.length > 0) {
			result.success = false;
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
 * Generate a unique key for event comparison.
 * Includes time to allow multiple events with same title on same date.
 */
function generateEventKey(event: any): string {
	const title = (event.title || event.subject || "").toLowerCase().trim();
	const startDateTime = event.start?.dateTime || event.startDate || "";
	const startTime = event.startTime || "";

	let datePart = "";
	if (startDateTime) {
		try {
			if (startDateTime.match(/^\d{4}-\d{2}-\d{2}$/)) {
				datePart = startDateTime;
			} else {
				datePart = startDateTime.split("T")[0] || "";
			}
		} catch (_error) {
			console.warn("Invalid date in event:", startDateTime);
			datePart = startDateTime.split("T")[0] || "";
		}
	}

	let timePart = "";
	if (startTime) {
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
			timePart = startTime.split(" ")[0];
		}
	} else if (startDateTime) {
		const timeMatch = startDateTime.match(/T(\d{2}):(\d{2})/);
		if (timeMatch) {
			timePart = `${timeMatch[1]}:${timeMatch[2]}`;
		}
	}

	if (!timePart) {
		timePart = "00:00";
	}

	const normalizedTitle = title.replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
	const normalizedTime = timePart.replace(/:/g, "");
	const key = `${normalizedTitle}_${datePart}_${normalizedTime}`;

	return key;
}
