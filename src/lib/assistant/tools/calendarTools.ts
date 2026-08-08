import { PERMISSIONS } from "@/constants/permissions";
import {
	type CreateCalendarEventData,
	createCalendarEvent,
	getCalendarEventsByMonth,
	updateCalendarEvent,
} from "@/lib/actions/calendar.actions";
import { createCalendarApprovalRequest } from "@/lib/actions/calendar-approval.actions";
import {
	dateFromDateAndTime,
	findUpcomingEventsByTitle,
	formatLocalDate,
	hasAll,
	invalidateCalendarForDate,
	pad,
} from "@/lib/assistant/tools/toolUtils";
import type { ToolDefinition } from "@/lib/assistant/tools/types";
import { evaluateCalendarPermission } from "@/lib/auth/guards";
import { getCurrentUserId } from "@/lib/microsoft/auth-utils";
import { logAuditEvent } from "@/lib/services/audit-logger";
import { detectParticipantConflicts } from "@/lib/utils/conflict-detection";

export const CALENDAR_TOOLS: ToolDefinition[] = [
	{
		name: "list_calendar_events",
		description:
			"List the current user's CAALM calendar events for a given date (defaults to today) or month. Use when the user asks about their schedule, meetings, availability, or whether they are free at a time.",
		requiredPermissions: [PERMISSIONS.CALENDAR.VIEW_OWN],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				date: {
					type: "string",
					description: "YYYY-MM-DD. Defaults to today.",
				},
				wholeMonth: {
					type: "string",
					description:
						"Set to 'true' to return the whole month containing date instead of a single day.",
				},
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.CALENDAR.VIEW_OWN])) {
				return { result: { error: "Missing calendar view permission" } };
			}
			const now = new Date();
			const dateStr = args.date ? String(args.date) : "";
			const base = dateFromDateAndTime(
				dateStr || formatLocalDate(now),
				"00:00",
			);
			if (!base) {
				return { result: { error: "Invalid date. Use YYYY-MM-DD." } };
			}
			const monthEvents = await getCalendarEventsByMonth(
				base.getFullYear(),
				base.getMonth() + 1,
				ctx.user.$id,
			);
			const wholeMonth = String(args.wholeMonth ?? "").toLowerCase() === "true";
			const dayKey = formatLocalDate(base);
			const events = wholeMonth
				? monthEvents
				: monthEvents.filter((e) => e.startDate?.startsWith(dayKey));
			return {
				result: {
					date: wholeMonth ? dayKey.slice(0, 7) : dayKey,
					events: events.slice(0, 30).map((e) => ({
						id: e.$id,
						title: e.title,
						startDate: e.startDate,
						startTime: e.startTime ?? null,
						endTime: e.endTime ?? null,
						location: e.location ?? null,
						type: e.type,
					})),
					total: events.length,
					calendarHref: "/calendar",
				},
			};
		},
	},
	{
		name: "create_calendar_event",
		description:
			"Schedule a calendar event or meeting (requires user confirmation). Before calling, ask for any of these the user has not already stated: title, date, start time, end time (or duration), and type. Meeting agenda (description) and participants are optional. Resolve relative dates like 'tomorrow' or 'next Tuesday' against the current date in the system prompt. Prefer an explicit endTime; otherwise default to 30 minutes after start. Never invent participant emails; only include people the user named or emailed. If date or times are missing or ambiguous, ask instead of guessing. When participants are included, each invitee is notified after the meeting is created.",
		requiredPermissions: [PERMISSIONS.CALENDAR.CREATE],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				title: { type: "string", description: "Short meeting title" },
				date: {
					type: "string",
					description: "YYYY-MM-DD resolved against the current date",
				},
				startTime: {
					type: "string",
					description: "HH:mm in 24-hour time, e.g. 14:30",
				},
				endTime: {
					type: "string",
					description:
						"HH:mm end time in 24-hour format. Prefer this when the user gave an end time.",
				},
				durationMinutes: {
					type: "number",
					description:
						"Meeting length in minutes when endTime is not provided. Default 30.",
				},
				description: {
					type: "string",
					description: "Optional meeting agenda or notes",
				},
				participants: {
					type: "string",
					description:
						"Optional. Comma-separated 'Name <email>' entries. Only include people the user explicitly named or emailed. Invitees are notified after confirm.",
				},
				type: {
					type: "string",
					enum: ["meeting", "review", "audit", "deadline", "contract"],
					description:
						"Event type. Ask the user if unclear; default to meeting.",
				},
				location: { type: "string", description: "Optional location" },
			},
			required: ["title", "date", "startTime"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.CALENDAR.CREATE])) {
				return { result: { error: "Missing calendar.create permission" } };
			}

			const title = String(args.title ?? "").trim();
			if (!title) return { result: { error: "A meeting title is required." } };

			const start = dateFromDateAndTime(
				String(args.date ?? ""),
				String(args.startTime ?? ""),
			);
			if (!start) {
				return {
					result: {
						error:
							"I could not understand that date or time. Ask the user for the date (YYYY-MM-DD) and start time.",
					},
				};
			}

			let end: Date | null = null;
			if (args.endTime) {
				end = dateFromDateAndTime(
					String(args.date ?? ""),
					String(args.endTime),
				);
				if (end && end.getTime() <= start.getTime()) {
					// End before start: treat as next day
					end = new Date(end.getTime() + 24 * 60 * 60000);
				}
			}
			if (!end) {
				const duration = Math.min(
					Math.max(Number(args.durationMinutes) || 30, 5),
					8 * 60,
				);
				end = new Date(start.getTime() + duration * 60000);
			}

			if (start.getTime() < Date.now()) {
				return {
					result: {
						error: `That time (${formatLocalDate(start)} at ${pad(start.getHours())}:${pad(start.getMinutes())}) is in the past. Ask the user for a future time.`,
					},
				};
			}

			const allowedTypes = [
				"meeting",
				"review",
				"audit",
				"deadline",
				"contract",
			] as const;
			type CalendarEventType = (typeof allowedTypes)[number];
			const rawType = String(args.type ?? "meeting")
				.trim()
				.toLowerCase();
			const eventType: CalendarEventType = (
				allowedTypes as readonly string[]
			).includes(rawType)
				? (rawType as CalendarEventType)
				: "meeting";

			const eventPayload: CreateCalendarEventData = {
				title,
				startDate: formatLocalDate(start),
				endDate: formatLocalDate(end),
				type: eventType,
				description: args.description ? String(args.description) : "",
				startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
				endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
				participants: args.participants ? String(args.participants) : "",
				location: args.location ? String(args.location) : undefined,
				createdBy: ctx.user.$id,
			};

			// Same permission evaluation the calendar API uses (role + calendar permission).
			const accountId = await getCurrentUserId();
			const permissionCheck = await evaluateCalendarPermission({
				userAccountId: accountId,
				action: "create",
			});
			if (!permissionCheck.allowed) {
				return {
					result: {
						error:
							"Your role cannot create calendar events. Ask an admin for access or create the event from the Calendar page if your org allows it.",
					},
				};
			}

			const eventData: CreateCalendarEventData = {
				...eventPayload,
				createdBy: accountId,
				createdByAccountId: accountId,
				createdByUserId: permissionCheck.userId || ctx.user.$id,
				sensitivityLevel: "standard",
				requiresApproval: false,
				approvalStatus: "not_required",
			};

			// Conflicts: warn in the answer instead of blocking (the assistant chat
			// has no second confirmation step like the calendar form does).
			let conflicts: string[] = [];
			if (eventPayload.participants) {
				try {
					const found = await detectParticipantConflicts(
						eventPayload,
						undefined,
						accountId,
					);
					conflicts = found
						.slice(0, 3)
						.map(
							(c) =>
								`${c.conflictingEvent.title} (${c.conflictingEvent.startDate} ${c.conflictingEvent.startTime ?? ""})`,
						);
				} catch {
					conflicts = [];
				}
			}

			const event = await createCalendarEvent(eventData);

			// Match /api/calendar/events POST: clear Redis so the next fetch is fresh.
			await invalidateCalendarForDate(
				eventData.startDate,
				permissionCheck.userId || ctx.user.$id,
			);

			// Outlook sync for assistant-created events runs on the calendar cron sync;
			// the direct create path here matches how non-Outlook events are stored.

			const userName =
				(ctx.user as { fullName?: string }).fullName ||
				ctx.user.name ||
				ctx.user.email ||
				"User";

			const invitedCount = eventPayload.participants?.trim()
				? eventPayload.participants.split(",").filter((p) => p.trim()).length
				: 0;

			// Don't block the confirm response on invite emails — calendar UI updates first.
			if (eventPayload.participants?.trim() && event.$id) {
				void import("@/lib/services/calendar-notifications.service")
					.then(({ notifyMeetingInvitees }) =>
						notifyMeetingInvitees(
							eventPayload.participants!,
							{
								eventId: event.$id!,
								title,
								date: eventData.startDate,
								startTime: eventData.startTime,
								endTime: eventData.endTime,
								description: eventData.description,
								location: eventData.location,
								organizerName: userName,
								organizerEmail: ctx.user.email || undefined,
							},
							permissionCheck.userId || ctx.user.$id,
						),
					)
					.catch((inviteError) => {
						console.error(
							"[create_calendar_event] Failed to notify invitees:",
							inviteError,
						);
					});
			}

			void logAuditEvent({
				event_id: `assistant_event_${event.$id}`,
				event_title: `Assistant scheduled event: ${title}`,
				action: "create",
				source: "caalm",
				user_id: ctx.user.$id,
				user_name: userName,
				user_email: ctx.user.email || "",
				status: "success",
				orgId: ctx.orgId,
				module: "system",
				target_type: "calendar_event",
				target_id: event.$id ?? "",
				target_label: title,
				summary: `CAALM assistant scheduled "${title}" on ${eventData.startDate} at ${eventData.startTime}`,
				metadata: { source: "ai_assistant", invitedCount },
			}).catch(() => undefined);

			return {
				result: {
					eventId: event.$id,
					title,
					date: eventData.startDate,
					startTime: eventData.startTime,
					endTime: eventData.endTime,
					conflicts,
					invitedCount,
					calendarHref: "/calendar",
				},
			};
		},
	},
	{
		name: "reschedule_calendar_event",
		description:
			"Reschedule one of the user's own calendar meetings (requires user confirmation). Find the meeting by title. TIME-ONLY RULE: if the user only asks to change the clock time (e.g. 'move it to 10am', 'change from 14:00 to 10:00') and does not name a different day or date, omit newDate — the meeting stays on its current date and only the start time changes. Set newDate only when the user explicitly asks for a different day (e.g. 'to Friday', 'next week', 'August 14'). Never invent or guess a new date for a time-only request. Resolve any explicit new date against the current date in the system prompt. If the title matches several or none, say so and ask which meeting.",
		requiredPermissions: [PERMISSIONS.CALENDAR.CREATE],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				eventTitle: {
					type: "string",
					description: "Title (or distinctive part) of the meeting to move",
				},
				newDate: {
					type: "string",
					description:
						"Optional YYYY-MM-DD. Omit for time-only changes so the existing meeting date is kept. Include only when the user named a different day/date.",
				},
				newStartTime: {
					type: "string",
					description: "HH:mm 24-hour new start time",
				},
			},
			required: ["eventTitle", "newStartTime"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.CALENDAR.CREATE])) {
				return { result: { error: "Missing calendar.create permission" } };
			}
			const search = String(args.eventTitle ?? "").trim();
			if (!search) return { result: { error: "Which meeting should I move?" } };

			const matches = await findUpcomingEventsByTitle(ctx, search);
			if (matches.length === 0) {
				return {
					result: {
						error: `I couldn't find an upcoming meeting matching "${search}". Ask me what's on your calendar first.`,
					},
				};
			}
			if (matches.length > 1) {
				return {
					result: {
						error: `I found ${matches.length} meetings matching "${search}": ${matches
							.map((e) => `${e.title} (${e.startDate} ${e.startTime ?? ""})`)
							.join(", ")}. Tell me which one.`,
					},
				};
			}

			const target = matches[0];
			const requestedDate = String(args.newDate ?? "").trim();
			// Time-only reschedule: keep the meeting on its existing date.
			const dateToUse = requestedDate || target.startDate;
			const newStart = dateFromDateAndTime(
				dateToUse,
				String(args.newStartTime ?? ""),
			);
			if (!newStart) {
				return {
					result: {
						error:
							"I couldn't understand the new time. Ask the user for a start time (HH:mm).",
					},
				};
			}
			if (newStart.getTime() < Date.now()) {
				return {
					result: {
						error:
							"The new time is in the past. Ask the user for a future time.",
					},
				};
			}

			// Preserve the original duration.
			const oldStart = dateFromDateAndTime(
				target.startDate,
				target.startTime ?? "00:00",
			);
			const oldEnd = dateFromDateAndTime(
				target.endDate ?? target.startDate,
				target.endTime ?? target.startTime ?? "00:00",
			);
			const durationMs =
				oldStart && oldEnd && oldEnd > oldStart
					? oldEnd.getTime() - oldStart.getTime()
					: 30 * 60000;
			const newEnd = new Date(newStart.getTime() + durationMs);

			const eventData: Partial<CreateCalendarEventData> = {
				startDate: formatLocalDate(newStart),
				endDate: formatLocalDate(newEnd),
				startTime: `${pad(newStart.getHours())}:${pad(newStart.getMinutes())}`,
				endTime: `${pad(newEnd.getHours())}:${pad(newEnd.getMinutes())}`,
			};

			// Respect approval flow for sensitive events (same rule as the calendar API).
			const accountId = await getCurrentUserId();
			const permissionCheck = await evaluateCalendarPermission({
				userAccountId: accountId,
				action: "update",
				event: target,
			});
			if (!permissionCheck.allowed) {
				return {
					result: {
						error:
							"You don't have permission to move that meeting. Ask an admin, or move it from the Calendar page.",
					},
				};
			}

			const sensitivity = target.sensitivityLevel || "standard";
			const requiresApproval =
				Boolean(target.requiresApproval) || sensitivity !== "standard";
			if (requiresApproval && target.approvalStatus !== "approved") {
				const approval = await createCalendarApprovalRequest({
					eventId: target.$id!,
					changeType: "update",
					requestedByAccountId: accountId,
					requestedByUserId: permissionCheck.userId || undefined,
					changeSummary: {
						before: target as unknown as Record<string, unknown>,
						after: { ...target, ...eventData } as unknown as Record<
							string,
							unknown
						>,
					},
					sensitivityLevel: sensitivity,
				});
				await updateCalendarEvent(target.$id!, {
					...eventData,
					approvalStatus: "pending",
					pendingApprovalId: approval.$id,
				});
				return {
					result: {
						eventId: target.$id,
						title: target.title,
						pendingApproval: true,
						note: "That meeting needs approval. I submitted a reschedule request.",
					},
				};
			}

			const updated = await updateCalendarEvent(target.$id!, eventData);
			const cacheUserId = permissionCheck.userId || ctx.user.$id;
			const newDateStr = String(
				updated.startDate ?? eventData.startDate ?? target.startDate,
			);
			await invalidateCalendarForDate(newDateStr, cacheUserId);
			const oldDateStr = String(target.startDate ?? "");
			const oldYm = oldDateStr.slice(0, 7);
			const newYm = newDateStr.slice(0, 7);
			if (oldYm && newYm && oldYm !== newYm) {
				await invalidateCalendarForDate(oldDateStr, cacheUserId);
			}
			return {
				result: {
					eventId: updated.$id,
					title: updated.title,
					date: updated.startDate,
					startTime: updated.startTime,
					endTime: updated.endTime,
				},
			};
		},
	},
	{
		name: "cancel_calendar_event",
		description:
			"Cancel one of the user's own calendar meetings (requires user confirmation). Find the meeting by title. If several or none match, say so and ask which one.",
		requiredPermissions: [PERMISSIONS.CALENDAR.CREATE],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				eventTitle: {
					type: "string",
					description: "Title (or distinctive part) of the meeting to cancel",
				},
			},
			required: ["eventTitle"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.CALENDAR.CREATE])) {
				return { result: { error: "Missing calendar.create permission" } };
			}
			const search = String(args.eventTitle ?? "").trim();
			if (!search)
				return { result: { error: "Which meeting should I cancel?" } };

			const matches = await findUpcomingEventsByTitle(ctx, search);
			if (matches.length === 0) {
				return {
					result: {
						error: `I couldn't find an upcoming meeting matching "${search}". Ask me what's on your calendar first.`,
					},
				};
			}
			if (matches.length > 1) {
				return {
					result: {
						error: `I found ${matches.length} meetings matching "${search}": ${matches
							.map((e) => `${e.title} (${e.startDate} ${e.startTime ?? ""})`)
							.join(", ")}. Tell me which one.`,
					},
				};
			}

			const target = matches[0];
			const accountId = await getCurrentUserId();
			const permissionCheck = await evaluateCalendarPermission({
				userAccountId: accountId,
				action: "cancel",
				event: target,
			});
			if (!permissionCheck.allowed) {
				return {
					result: {
						error:
							"You don't have permission to cancel that meeting. Ask an admin, or cancel it from the Calendar page.",
					},
				};
			}

			// Sensitive events route through an approval request instead of deleting
			// (mirrors the calendar DELETE route).
			const sensitivity = target.sensitivityLevel || "standard";
			const requiresApproval =
				Boolean(target.requiresApproval) || sensitivity !== "standard";
			if (requiresApproval) {
				const approval = await createCalendarApprovalRequest({
					eventId: target.$id!,
					changeType: "cancel",
					requestedByAccountId: accountId,
					requestedByUserId: permissionCheck.userId || undefined,
					changeSummary: {
						before: target as unknown as Record<string, unknown>,
						after: null,
					},
					sensitivityLevel: sensitivity,
				});
				await updateCalendarEvent(target.$id!, {
					approvalStatus: "pending",
					pendingApprovalId: approval.$id,
				});
				return {
					result: {
						eventId: target.$id,
						title: target.title,
						pendingApproval: true,
						note: "That meeting needs approval. I submitted a cancellation request.",
					},
				};
			}

			const { deleteCalendarEvent } = await import(
				"@/lib/actions/calendar.actions"
			);
			await deleteCalendarEvent(target.$id!, accountId);
			await invalidateCalendarForDate(
				String(target.startDate ?? ""),
				permissionCheck.userId || ctx.user.$id,
			);
			const userName =
				(ctx.user as { fullName?: string }).fullName ||
				ctx.user.name ||
				ctx.user.email ||
				"User";
			await logAuditEvent({
				event_id: `assistant_event_cancel_${target.$id}`,
				event_title: `Assistant cancelled event: ${target.title}`,
				action: "delete",
				source: "caalm",
				user_id: ctx.user.$id,
				user_name: userName,
				user_email: ctx.user.email || "",
				status: "success",
				orgId: ctx.orgId,
				module: "system",
				target_type: "calendar_event",
				target_id: target.$id ?? "",
				target_label: target.title,
				summary: `CAALM assistant cancelled "${target.title}"`,
				metadata: { source: "ai_assistant" },
			}).catch(() => undefined);
			return {
				result: {
					eventId: target.$id,
					title: target.title,
					date: target.startDate,
					cancelled: true,
				},
			};
		},
	},
];
