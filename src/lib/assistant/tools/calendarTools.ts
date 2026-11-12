import { PERMISSIONS } from "@/constants/permissions";
import {
	type CreateCalendarEventData,
	createCalendarEvent,
	getCalendarEventsByMonth,
	updateCalendarEvent,
} from "@/lib/actions/calendar.actions";
import {
	createCalendarApprovalRequest,
	decideCalendarApprovalRequest,
	getCalendarApprovalById,
	listCalendarApprovalRequests,
} from "@/lib/actions/calendar-approval.actions";
import {
	type CalendarPermissionLevel,
	getCalendarsSharedWithUser,
	getOrCreatePrimaryCalendar,
	sharePrimaryCalendarWithUser,
} from "@/lib/actions/shared-calendar.actions";
import { getUserByEmail } from "@/lib/actions/user.actions";
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
import { getCalendarEventInOrg } from "@/lib/events/calendar-event-access";
import { listRegistrationsForEvent } from "@/lib/events/event-registrations.repository";
import { createTicketType } from "@/lib/events/ticket-types.repository";
import { getCurrentUserId } from "@/lib/microsoft/auth-utils";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { logAuditEvent } from "@/lib/services/audit-logger";
import { notifyMeetingInvitees } from "@/lib/services/calendar-notifications.service";
import { detectParticipantConflicts } from "@/lib/utils/conflict-detection";

const CALENDAR_PERMISSION_LEVELS: CalendarPermissionLevel[] = [
	"view_busy",
	"view_titles",
	"view_all",
	"edit",
	"delegate",
];
const CALENDAR_APPROVAL_DECISIONS = [
	"approved",
	"rejected",
	"changes_requested",
] as const;

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
					previousDate: target.startDate,
					previousStartTime: target.startTime,
					previousEndTime: target.endTime,
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
	{
		name: "invite_event_attendees",
		description:
			"Invite additional people to one of the user's existing calendar meetings (requires confirmation). Find the meeting by title. Never invent participant emails; only include people the user named or emailed. Only the newly-added people are notified, not existing attendees. Requires events.invite.",
		requiredPermissions: [PERMISSIONS.EVENTS.INVITE],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				eventTitle: {
					type: "string",
					description: "Title (or distinctive part) of the meeting",
				},
				participants: {
					type: "string",
					description:
						"Comma-separated 'Name <email>' entries for the people to invite. Only people the user explicitly named or emailed.",
				},
			},
			required: ["eventTitle", "participants"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.EVENTS.INVITE])) {
				return { result: { error: "Missing events.invite permission" } };
			}
			const search = String(args.eventTitle ?? "").trim();
			if (!search) {
				return {
					result: { error: "Which meeting should I invite people to?" },
				};
			}
			const newParticipants = String(args.participants ?? "").trim();
			if (!newParticipants) {
				return { result: { error: "Give the people to invite." } };
			}

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
			const existingParticipants = String(target.participants ?? "").trim();
			const merged = existingParticipants
				? `${existingParticipants}, ${newParticipants}`
				: newParticipants;
			const updated = await updateCalendarEvent(target.$id!, {
				participants: merged,
			});
			await invalidateCalendarForDate(
				String(target.startDate ?? ""),
				ctx.user.$id,
			);

			const userName =
				(ctx.user as { fullName?: string }).fullName ||
				ctx.user.name ||
				ctx.user.email ||
				"User";
			const invitedCount = await notifyMeetingInvitees(
				newParticipants,
				{
					eventId: target.$id!,
					title: target.title,
					date: target.startDate,
					startTime: target.startTime ?? undefined,
					endTime: target.endTime ?? undefined,
					description: target.description ?? undefined,
					location: target.location ?? undefined,
					organizerName: userName,
					organizerEmail: ctx.user.email || undefined,
				},
				ctx.user.$id,
			);

			await logAuditEvent({
				event_id: `assistant_event_invite_${target.$id}_${Date.now()}`,
				event_title: `Assistant invited attendees to: ${target.title}`,
				action: "update",
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
				summary: `CAALM assistant invited attendees to "${target.title}"`,
				metadata: { source: "ai_assistant", invitedCount },
			}).catch(() => undefined);

			return {
				result: {
					eventId: updated.$id,
					title: updated.title,
					invited: newParticipants,
					invitedCount,
				},
			};
		},
	},
	{
		name: "approve_calendar_request",
		description:
			"Decide a pending calendar approval request from the approvals rail (requires confirmation). Find the request by approvalId, or by the event's title among pending requests. Requires events.approve.",
		requiredPermissions: [PERMISSIONS.EVENTS.APPROVE],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				approvalId: { type: "string" },
				eventTitle: {
					type: "string",
					description: "Title of the event the pending request is about",
				},
				decision: {
					type: "string",
					enum: CALENDAR_APPROVAL_DECISIONS as unknown as string[],
				},
				reviewerNotes: { type: "string" },
			},
			required: ["decision"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.EVENTS.APPROVE])) {
				return { result: { error: "Missing events.approve permission" } };
			}
			const decision = String(args.decision ?? "");
			if (
				!CALENDAR_APPROVAL_DECISIONS.includes(
					decision as (typeof CALENDAR_APPROVAL_DECISIONS)[number],
				)
			) {
				return {
					result: {
						error: "decision must be approved, rejected, or changes_requested.",
					},
				};
			}

			const approvalId = String(args.approvalId ?? "").trim();
			const eventTitle = String(args.eventTitle ?? "")
				.trim()
				.toLowerCase();
			let approval = approvalId
				? await getCalendarApprovalById(approvalId)
				: null;
			if (!approval) {
				const pending = await listCalendarApprovalRequests({
					status: "pending",
				});
				const inOrg = await Promise.all(
					pending.map(async (req) => ({
						req,
						event: await getCalendarEventInOrg(ctx.orgId, req.eventId),
					})),
				);
				const scoped = inOrg.filter((row) => row.event);
				const candidates = eventTitle
					? scoped.filter((row) =>
							row.event!.title.toLowerCase().includes(eventTitle),
						)
					: scoped;
				if (candidates.length === 0) {
					return {
						result: {
							error: "I couldn't find a matching pending calendar request.",
						},
					};
				}
				if (candidates.length > 1) {
					return {
						result: {
							error: `I found ${candidates.length} pending requests matching that: ${candidates
								.map((c) => c.event!.title)
								.join(", ")}. Give the approvalId or be more specific.`,
						},
					};
				}
				approval = candidates[0].req;
			}

			const event = await getCalendarEventInOrg(ctx.orgId, approval.eventId);
			if (!event) {
				return {
					result: {
						error: "That calendar request doesn't belong to this organization.",
					},
				};
			}

			const accountId = await getCurrentUserId();
			const updated = await decideCalendarApprovalRequest({
				approvalId: approval.$id,
				decision: decision as "approved" | "rejected" | "changes_requested",
				approverAccountId: accountId,
				approverUserId: ctx.user.$id,
				reviewerNotes: args.reviewerNotes
					? String(args.reviewerNotes)
					: undefined,
			});
			if (!updated) {
				return { result: { error: "That approval request was not found." } };
			}

			const userName =
				(ctx.user as { fullName?: string }).fullName ||
				ctx.user.name ||
				ctx.user.email ||
				"User";
			await logAuditEvent({
				event_id: `assistant_calendar_approval_${updated.$id}`,
				event_title: `Assistant decided calendar request: ${event.title}`,
				action: "approval_decided",
				source: "caalm",
				user_id: ctx.user.$id,
				user_name: userName,
				user_email: ctx.user.email || "",
				status: "success",
				orgId: ctx.orgId,
				module: "system",
				target_type: "calendar_approval",
				target_id: updated.$id,
				target_label: event.title,
				summary: `CAALM assistant marked "${event.title}" request ${decision}`,
				metadata: { source: "ai_assistant", decision },
			}).catch(() => undefined);

			return {
				result: {
					approvalId: updated.$id,
					status: updated.status,
					eventTitle: event.title,
				},
			};
		},
	},
	{
		name: "share_calendar",
		description:
			"Share the user's primary calendar with another user, or list calendars shared with the user. Sharing requires confirmation. Listing is org-scoped. No cross-org sharing. Requires calendar.create.",
		requiredPermissions: [PERMISSIONS.CALENDAR.CREATE],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				action: { type: "string", enum: ["list", "share"] },
				sharedWithUserId: { type: "string" },
				sharedWithEmail: { type: "string" },
				permissionLevel: {
					type: "string",
					enum: CALENDAR_PERMISSION_LEVELS as unknown as string[],
				},
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.CALENDAR.CREATE])) {
				return { result: { error: "Missing calendar.create permission" } };
			}
			if (args.action === "share") {
				let sharedWithUserId = String(args.sharedWithUserId ?? "").trim();
				if (!sharedWithUserId && args.sharedWithEmail) {
					const user = await getUserByEmail(String(args.sharedWithEmail));
					sharedWithUserId = user?.$id ?? "";
				}
				if (!sharedWithUserId) {
					return {
						result: {
							error: "Give the user id or email to share the calendar with.",
						},
					};
				}
				const permissionLevel = CALENDAR_PERMISSION_LEVELS.includes(
					args.permissionLevel as CalendarPermissionLevel,
				)
					? (args.permissionLevel as CalendarPermissionLevel)
					: null;
				if (!permissionLevel) {
					return {
						result: {
							error: `permissionLevel must be one of: ${CALENDAR_PERMISSION_LEVELS.join(", ")}.`,
						},
					};
				}
				const recipientOrg = await getUserDefaultOrganization(sharedWithUserId);
				if (!recipientOrg || recipientOrg.orgId !== ctx.orgId) {
					return {
						result: {
							error: "That user is not in this organization.",
						},
					};
				}
				const accountId = await getCurrentUserId();
				const userName =
					(ctx.user as { fullName?: string }).fullName ||
					ctx.user.name ||
					ctx.user.email ||
					"User";
				await getOrCreatePrimaryCalendar(
					ctx.user.$id,
					accountId,
					ctx.orgId,
					userName,
				);
				const updated = await sharePrimaryCalendarWithUser(
					ctx.user.$id,
					sharedWithUserId,
					permissionLevel,
					ctx.user.$id,
				);
				await logAuditEvent({
					event_id: `assistant_calendar_share_${updated.$id}_${Date.now()}`,
					event_title: "Assistant shared a calendar",
					action: "update",
					source: "caalm",
					user_id: ctx.user.$id,
					user_name: userName,
					user_email: ctx.user.email || "",
					status: "success",
					orgId: ctx.orgId,
					module: "system",
					target_type: "shared_calendar",
					target_id: updated.$id,
					target_label: "Primary calendar",
					summary: `CAALM assistant shared a calendar with ${sharedWithUserId}`,
					metadata: {
						source: "ai_assistant",
						sharedWithUserId,
						permissionLevel,
					},
				}).catch(() => undefined);
				return {
					result: {
						shared: true,
						calendarId: updated.$id,
						sharedWithUserId,
						permissionLevel,
					},
				};
			}
			const sharedCalendars = await getCalendarsSharedWithUser(
				ctx.user.$id,
				ctx.orgId,
			);
			return {
				result: { sharedCalendars, count: sharedCalendars.length },
			};
		},
	},
	{
		name: "create_public_event",
		description:
			"Create a public, registration-capable event (requires confirmation), or list an existing one's registrations. Creating confirms and audits; registrations read is org-scoped. Requires events.create.",
		requiredPermissions: [PERMISSIONS.EVENTS.CREATE],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				action: { type: "string", enum: ["create", "list_registrations"] },
				eventId: {
					type: "string",
					description: "Required for list_registrations",
				},
				title: { type: "string" },
				date: { type: "string", description: "YYYY-MM-DD" },
				startTime: { type: "string", description: "HH:mm 24-hour" },
				endTime: { type: "string", description: "HH:mm 24-hour" },
				durationMinutes: { type: "number" },
				description: { type: "string" },
				location: { type: "string" },
				capacity: { type: "number", description: "Ticket capacity" },
				amountCents: {
					type: "number",
					description: "Optional ticket price in cents; default free",
				},
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.EVENTS.CREATE])) {
				return { result: { error: "Missing events.create permission" } };
			}
			if (args.action === "list_registrations") {
				const eventId = String(args.eventId ?? "").trim();
				if (!eventId) {
					return { result: { error: "Give the event id." } };
				}
				const event = await getCalendarEventInOrg(ctx.orgId, eventId);
				if (!event) {
					return { result: { error: `No event found with id "${eventId}".` } };
				}
				const registrations = await listRegistrationsForEvent(
					ctx.orgId,
					eventId,
				);
				return {
					result: { registrations, count: registrations.length },
				};
			}

			const title = String(args.title ?? "").trim();
			if (!title) return { result: { error: "A title is required." } };
			const capacity = Number(args.capacity);
			if (!Number.isFinite(capacity) || capacity <= 0) {
				return { result: { error: "Give a positive ticket capacity." } };
			}
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
					end = new Date(end.getTime() + 24 * 60 * 60000);
				}
			}
			if (!end) {
				const duration = Math.min(
					Math.max(Number(args.durationMinutes) || 60, 5),
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

			const accountId = await getCurrentUserId();
			const permissionCheck = await evaluateCalendarPermission({
				userAccountId: accountId,
				action: "create",
			});
			if (!permissionCheck.allowed) {
				return {
					result: {
						error:
							"Your role cannot create events. Ask an admin for access or create it from the Calendar page.",
					},
				};
			}

			const eventData: CreateCalendarEventData = {
				title,
				startDate: formatLocalDate(start),
				endDate: formatLocalDate(end),
				type: "meeting",
				description: args.description ? String(args.description) : "",
				startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
				endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
				participants: "",
				location: args.location ? String(args.location) : undefined,
				createdBy: accountId,
				createdByAccountId: accountId,
				createdByUserId: permissionCheck.userId || ctx.user.$id,
				sensitivityLevel: "standard",
				requiresApproval: false,
				approvalStatus: "not_required",
			};
			const event = await createCalendarEvent(eventData);
			await invalidateCalendarForDate(
				eventData.startDate,
				permissionCheck.userId || ctx.user.$id,
			);

			const ticketType = await createTicketType({
				orgId: ctx.orgId,
				eventId: event.$id!,
				name: title,
				capacity,
				amountCents: args.amountCents
					? Math.round(Number(args.amountCents))
					: 0,
			});

			const userName =
				(ctx.user as { fullName?: string }).fullName ||
				ctx.user.name ||
				ctx.user.email ||
				"User";
			await logAuditEvent({
				event_id: `assistant_public_event_${event.$id}`,
				event_title: `Assistant created public event: ${title}`,
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
				summary: `CAALM assistant created public event "${title}" with ${capacity} tickets`,
				metadata: { source: "ai_assistant", capacity },
			}).catch(() => undefined);

			return {
				result: {
					eventId: event.$id,
					title,
					date: eventData.startDate,
					ticketTypeId: ticketType.$id,
					capacity,
					calendarHref: "/calendar",
				},
			};
		},
	},
];
