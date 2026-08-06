import { Query } from "node-appwrite";
import { PERMISSIONS } from "@/constants/permissions";
import {
	type CreateCalendarEventData,
	createCalendarEvent,
	getCalendarEventsByMonth,
	updateCalendarEvent,
} from "@/lib/actions/calendar.actions";
import {
	createCalendarApprovalRequest,
	listCalendarApprovalRequests,
} from "@/lib/actions/calendar-approval.actions";
import { generateReport } from "@/lib/actions/report.actions";
import { TaskService } from "@/lib/api/tasks/services/TaskService";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { retrieveKnowledge } from "@/lib/assistant/knowledge/retrieve";
import type { ToolContext, ToolDefinition } from "@/lib/assistant/tools/types";
import { evaluateCalendarPermission } from "@/lib/auth/guards";
import { getCurrentUserId } from "@/lib/microsoft/auth-utils";
import { getAuditLogs, logAuditEvent } from "@/lib/services/audit-logger";
import { detectParticipantConflicts } from "@/lib/utils/conflict-detection";

function hasAll(
	ctx: ToolContext,
	keys: Parameters<typeof ctx.permissions.includes>[0][],
): boolean {
	return keys.every((k) => ctx.permissions.includes(k));
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-08-05", "14:30" -> Date in server-local time (calendar stores local date + HH:mm). */
function dateFromDateAndTime(dateStr: string, timeStr: string): Date | null {
	const datePart = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
	const [y, m, d] = datePart.split("-").map(Number);
	const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
	if (!timeMatch || !y || !m || !d) return null;
	let hours = Number(timeMatch[1]);
	const minutes = Number(timeMatch[2]);
	const period = timeMatch[3]?.toUpperCase();
	if (period === "PM" && hours !== 12) hours += 12;
	if (period === "AM" && hours === 12) hours = 0;
	const dt = new Date(y, m - 1, d, hours, minutes, 0);
	return Number.isNaN(dt.getTime()) ? null : dt;
}

function formatLocalDate(d: Date): string {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Find a user's upcoming event by title keyword. Returns matches for caller to disambiguate. */
async function findUpcomingEventsByTitle(ctx: ToolContext, search: string) {
	const now = new Date();
	const events = await getCalendarEventsByMonth(
		now.getFullYear(),
		now.getMonth() + 1,
		ctx.user.$id,
	);
	const q = search.trim().toLowerCase();
	const todayKey = formatLocalDate(now);
	return events
		.filter((e) => (e.startDate ?? "") >= todayKey)
		.filter((e) => (e.title ?? "").toLowerCase().includes(q))
		.slice(0, 5);
}

function summarizeTask(task: {
	$id: string;
	title: string;
	status: string;
	priority?: string;
	dueDate?: string | null;
	assigneeId?: string | null;
}) {
	return {
		id: task.$id,
		title: task.title,
		status: task.status,
		priority: task.priority,
		dueDate: task.dueDate ?? null,
		assigneeId: task.assigneeId ?? null,
	};
}

async function searchContractsTable(ctx: ToolContext, search: string) {
	const { tablesDB } = await createAdminClient();
	const tableId = appwriteConfig.contractsCollectionId || "contracts";
	const q = search.trim();
	const queries = [
		Query.equal("orgId", ctx.orgId),
		...(q ? [Query.contains("contractName", q)] : []),
		Query.orderDesc("$createdAt"),
		Query.limit(8),
	];
	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId,
		queries,
	});
	return result.rows.map((r: Record<string, unknown>) => ({
		id: r.$id,
		name: r.contractName ?? r.name,
		status: r.status,
		expiryDate: r.contractExpiryDate,
	}));
}

async function searchLicensesTable(ctx: ToolContext, search: string) {
	const { tablesDB } = await createAdminClient();
	const tableId = appwriteConfig.licensesCollectionId || "licenses";
	const q = search.trim();
	const queries = [
		Query.equal("orgId", ctx.orgId),
		...(q ? [Query.contains("licenseName", q)] : []),
		Query.orderDesc("$createdAt"),
		Query.limit(8),
	];
	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId,
		queries,
	});
	return result.rows.map((r: Record<string, unknown>) => ({
		id: r.$id,
		name: r.licenseName ?? r.name,
		status: r.status,
		expirationDate: r.licenseExpiryDate,
	}));
}

export const ASSISTANT_TOOLS: ToolDefinition[] = [
	{
		name: "get_page_help",
		description: "Get CAALM product help for the current page or a topic",
		requiredPermissions: [PERMISSIONS.AI.CHAT],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				topic: { type: "string", description: "User question or topic" },
			},
			required: ["topic"],
		},
		handler: async (ctx, args) => {
			const topic = String(args.topic ?? "");
			const { contextText, sources } = retrieveKnowledge(topic, ctx.pathname);
			return { result: { contextText, sources } };
		},
	},
	{
		name: "navigate",
		description: "Suggest an in-app navigation path for the user",
		requiredPermissions: [PERMISSIONS.AI.CHAT],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				href: { type: "string", description: "Internal path e.g. /contracts" },
			},
			required: ["href"],
		},
		handler: async (_ctx, args) => {
			const href = String(args.href ?? "");
			if (!href.startsWith("/")) {
				return { result: { error: "Invalid path" } };
			}
			return { clientAction: { type: "navigate", href }, result: { href } };
		},
	},
	{
		name: "search_contracts",
		description: "Search contracts in the user's organization",
		requiredPermissions: [PERMISSIONS.CONTRACTS.VIEW],
		mutating: false,
		parameters: {
			type: "object",
			properties: { query: { type: "string" } },
			required: ["query"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.CONTRACTS.VIEW])) {
				return { result: { error: "Missing contracts.view permission" } };
			}
			const rows = await searchContractsTable(ctx, String(args.query ?? ""));
			return { result: { contracts: rows } };
		},
	},
	{
		name: "search_licenses",
		description: "Search licenses in the user's organization",
		requiredPermissions: [PERMISSIONS.LICENSES.VIEW],
		mutating: false,
		parameters: {
			type: "object",
			properties: { query: { type: "string" } },
			required: ["query"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.LICENSES.VIEW])) {
				return { result: { error: "Missing licenses.view permission" } };
			}
			const rows = await searchLicensesTable(ctx, String(args.query ?? ""));
			return { result: { licenses: rows } };
		},
	},
	{
		name: "list_tasks",
		description:
			"List real tasks from the CAALM Tasks API (/team/tasks). Use this whenever the user asks to show, list, or find pending/open/assigned tasks. Do not use product docs or Analytics links for this.",
		requiredPermissions: [PERMISSIONS.EVENTS.CREATE],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				search: { type: "string", description: "Optional title search" },
				status: {
					type: "string",
					description:
						"Optional status filter: not_started, in_progress, blocked, done. Omit for pending (all except done).",
				},
				pendingOnly: {
					type: "string",
					description:
						"Set to true to return open/pending tasks (not_started, in_progress, blocked).",
				},
				limit: { type: "number" },
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.EVENTS.CREATE])) {
				return { result: { error: "Missing events.create permission" } };
			}
			const limit = Math.min(Number(args.limit) || 15, 25);
			const pendingOnly =
				String(args.pendingOnly ?? "true").toLowerCase() !== "false" &&
				!args.status;
			const status = args.status ? String(args.status) : undefined;

			if (status && !pendingOnly) {
				const { tasks, total } = await TaskService.listTasks(
					ctx.orgId,
					{
						status,
						search: args.search ? String(args.search) : undefined,
					},
					{ limit, offset: 0 },
				);
				return {
					result: {
						tasks: tasks.map(summarizeTask),
						total,
						tasksHref: "/team/tasks",
					},
				};
			}

			// Pending = all non-done statuses
			const statuses = ["not_started", "in_progress", "blocked"] as const;
			const batches = await Promise.all(
				statuses.map((s) =>
					TaskService.listTasks(
						ctx.orgId,
						{
							status: s,
							search: args.search ? String(args.search) : undefined,
						},
						{ limit, offset: 0 },
					),
				),
			);
			const tasks = batches
				.flatMap((b) => b.tasks)
				.sort((a, b) => {
					const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
					const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
					return aDue - bDue;
				})
				.slice(0, limit);

			return {
				result: {
					tasks: tasks.map(summarizeTask),
					total: tasks.length,
					tasksHref: "/team/tasks",
				},
			};
		},
	},
	{
		name: "create_task",
		description: "Create a task (requires user confirmation before execution)",
		requiredPermissions: [PERMISSIONS.EVENTS.CREATE],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				title: { type: "string" },
				description: { type: "string" },
				dueDate: { type: "string", description: "ISO date" },
				priority: { type: "string", enum: ["low", "medium", "high"] },
			},
			required: ["title"],
		},
		handler: async (ctx, args) => {
			const task = await TaskService.createTask(ctx.orgId, ctx.user.$id, {
				title: String(args.title),
				description: args.description ? String(args.description) : undefined,
				dueDate: args.dueDate ? String(args.dueDate) : undefined,
				priority: (args.priority as "low" | "medium" | "high") || "medium",
				status: "not_started",
			});
			const userName =
				(ctx.user as { fullName?: string }).fullName ||
				ctx.user.name ||
				ctx.user.email ||
				"User";
			await logAuditEvent({
				event_id: `assistant_task_${task.$id}`,
				event_title: `Assistant created task: ${task.title}`,
				action: "create",
				source: "caalm",
				user_id: ctx.user.$id,
				user_name: userName,
				user_email: ctx.user.email || "",
				status: "success",
				orgId: ctx.orgId,
				module: "system",
				target_type: "task",
				target_id: task.$id,
				target_label: task.title,
				summary: `CAALM assistant created task ${task.title}`,
				metadata: { source: "ai_assistant" },
			}).catch(() => undefined);
			return { result: { task } };
		},
	},
	{
		name: "list_pending_approvals",
		description: "List pending calendar approval requests",
		requiredPermissions: [PERMISSIONS.EVENTS.APPROVE],
		mutating: false,
		parameters: { type: "object", properties: {} },
		handler: async (ctx) => {
			if (!hasAll(ctx, [PERMISSIONS.EVENTS.APPROVE])) {
				return { result: { error: "Missing events.approve permission" } };
			}
			const approvals = await listCalendarApprovalRequests({
				status: "pending",
			});
			return { result: { approvals: approvals.slice(0, 15) } };
		},
	},
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

			// Outlook sync for assistant-created events runs on the calendar cron sync;
			// the direct create path here matches how non-Outlook events are stored.

			const userName =
				(ctx.user as { fullName?: string }).fullName ||
				ctx.user.name ||
				ctx.user.email ||
				"User";

			let invitedCount = 0;
			if (eventPayload.participants?.trim() && event.$id) {
				try {
					const { notifyMeetingInvitees } = await import(
						"@/lib/services/calendar-notifications.service"
					);
					invitedCount = await notifyMeetingInvitees(
						eventPayload.participants,
						{
							eventId: event.$id,
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
					);
				} catch (inviteError) {
					console.error(
						"[create_calendar_event] Failed to notify invitees:",
						inviteError,
					);
				}
			}

			await logAuditEvent({
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
		name: "list_expirations",
		description:
			"List contracts and licenses expiring within a number of days (default 90). Use when the user asks what's expiring, due soon, coming up for renewal, or wants an expiration brief.",
		requiredPermissions: [
			PERMISSIONS.CONTRACTS.VIEW,
			PERMISSIONS.LICENSES.VIEW,
		],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				days: {
					type: "number",
					description: "Look-ahead window in days. Default 90.",
				},
			},
		},
		handler: async (ctx, args) => {
			const days = Math.min(Math.max(Number(args.days) || 90, 1), 365);
			const now = new Date();
			const today = formatLocalDate(now);
			const horizon = formatLocalDate(
				new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
			);
			const { tablesDB } = await createAdminClient();

			const contractsPromise = hasAll(ctx, [PERMISSIONS.CONTRACTS.VIEW])
				? tablesDB.listRows({
						databaseId: appwriteConfig.databaseId!,
						tableId: appwriteConfig.contractsCollectionId || "contracts",
						queries: [
							Query.equal("orgId", ctx.orgId),
							Query.greaterThanEqual("contractExpiryDate", today),
							Query.lessThanEqual("contractExpiryDate", horizon),
							Query.orderAsc("contractExpiryDate"),
							Query.limit(10),
						],
					})
				: Promise.resolve({ rows: [] as Record<string, unknown>[] });

			const licensesPromise = hasAll(ctx, [PERMISSIONS.LICENSES.VIEW])
				? tablesDB.listRows({
						databaseId: appwriteConfig.databaseId!,
						tableId: appwriteConfig.licensesCollectionId || "licenses",
						queries: [
							Query.equal("orgId", ctx.orgId),
							Query.greaterThanEqual("licenseExpiryDate", today),
							Query.lessThanEqual("licenseExpiryDate", horizon),
							Query.orderAsc("licenseExpiryDate"),
							Query.limit(10),
						],
					})
				: Promise.resolve({ rows: [] as Record<string, unknown>[] });

			const [contracts, licenses] = await Promise.all([
				contractsPromise,
				licensesPromise,
			]);

			return {
				result: {
					days,
					contracts: contracts.rows.map((r) => ({
						id: r.$id,
						name: r.contractName ?? r.name,
						expiryDate: r.contractExpiryDate,
						status: r.status,
					})),
					licenses: licenses.rows.map((r) => ({
						id: r.$id,
						name: r.licenseName ?? r.name,
						expirationDate: r.licenseExpiryDate,
						status: r.status,
					})),
					contractsHref: "/contracts",
					licensesHref: "/licenses",
				},
			};
		},
	},
	{
		name: "complete_task",
		description:
			"Mark a task as done (requires user confirmation). Find the task by title from the user's open tasks. If multiple or no tasks match, say so and ask the user which one.",
		requiredPermissions: [PERMISSIONS.EVENTS.CREATE],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				title: {
					type: "string",
					description: "The task title (or a distinctive part of it)",
				},
			},
			required: ["title"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.EVENTS.CREATE])) {
				return { result: { error: "Missing events.create permission" } };
			}
			const search = String(args.title ?? "").trim();
			if (!search)
				return { result: { error: "Which task should I mark done?" } };

			const { tasks } = await TaskService.listTasks(
				ctx.orgId,
				{ search },
				{ limit: 10, offset: 0 },
			);
			const open = tasks.filter((t) => t.status !== "done");

			if (open.length === 0) {
				return {
					result: {
						error: `I couldn't find an open task matching "${search}". Ask me to show your pending tasks first.`,
					},
				};
			}
			if (open.length > 1) {
				return {
					result: {
						error: `I found ${open.length} open tasks matching "${search}": ${open
							.slice(0, 3)
							.map((t) => t.title)
							.join(", ")}. Tell me which one.`,
					},
				};
			}

			const task = open[0];
			const updated = await TaskService.updateTask(ctx.orgId, task.$id, {
				status: "done",
			});
			const userName =
				(ctx.user as { fullName?: string }).fullName ||
				ctx.user.name ||
				ctx.user.email ||
				"User";
			await logAuditEvent({
				event_id: `assistant_task_done_${task.$id}`,
				event_title: `Assistant completed task: ${task.title}`,
				action: "update",
				source: "caalm",
				user_id: ctx.user.$id,
				user_name: userName,
				user_email: ctx.user.email || "",
				status: "success",
				orgId: ctx.orgId,
				module: "system",
				target_type: "task",
				target_id: task.$id,
				target_label: task.title,
				summary: `CAALM assistant marked task "${task.title}" done`,
				metadata: { source: "ai_assistant" },
			}).catch(() => undefined);
			return {
				result: { taskId: task.$id, title: task.title, updated: !!updated },
			};
		},
	},
	{
		name: "list_audit_logs",
		description:
			"List recent audit/activity events for the organization (who changed what). Use when the user asks about recent activity, changes, or audit history. Requires audit view permission.",
		requiredPermissions: [PERMISSIONS.AUDIT.VIEW],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				limit: { type: "number", description: "Max entries. Default 10." },
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.AUDIT.VIEW])) {
				return {
					result: {
						error:
							"You don't have permission to view audit logs. Ask an admin for audit access.",
					},
				};
			}
			const limit = Math.min(Number(args.limit) || 10, 20);
			const logs = await getAuditLogs({ orgId: ctx.orgId, limit });
			return {
				result: {
					logs: logs.map((l) => ({
						title: l.event_title,
						action: l.action,
						user: l.user_name,
						status: l.status,
						when: l.created_at,
						module: l.module,
					})),
					total: logs.length,
					auditHref: "/audits",
				},
			};
		},
	},
	{
		name: "reschedule_calendar_event",
		description:
			"Reschedule one of the user's own calendar meetings to a new date/time (requires user confirmation). Find the meeting by title. Resolve the new date against the current date in the system prompt. If the title matches several or none, say so and ask the user which meeting.",
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
					description: "YYYY-MM-DD resolved against the current date",
				},
				newStartTime: {
					type: "string",
					description: "HH:mm 24-hour",
				},
			},
			required: ["eventTitle", "newDate", "newStartTime"],
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
			const newStart = dateFromDateAndTime(
				String(args.newDate ?? ""),
				String(args.newStartTime ?? ""),
			);
			if (!newStart) {
				return {
					result: {
						error:
							"I couldn't understand the new date/time. Ask the user for the date (YYYY-MM-DD) and start time.",
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
				result: { eventId: target.$id, title: target.title, cancelled: true },
			};
		},
	},
	{
		name: "create_task_for_contract",
		description:
			"Create a task linked to a contract (requires user confirmation). Use for follow-ups like 'remind me to review the Acme contract before it expires'. Find the contract by name.",
		requiredPermissions: [
			PERMISSIONS.EVENTS.CREATE,
			PERMISSIONS.CONTRACTS.VIEW,
		],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				contractName: {
					type: "string",
					description: "Contract name (or distinctive part)",
				},
				title: { type: "string", description: "Task title" },
				dueDate: { type: "string", description: "ISO date" },
				priority: { type: "string", enum: ["low", "medium", "high"] },
			},
			required: ["contractName", "title"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.EVENTS.CREATE])) {
				return { result: { error: "Missing events.create permission" } };
			}
			const search = String(args.contractName ?? "").trim();
			const contracts = await searchContractsTable(ctx, search);
			if (contracts.length === 0) {
				return {
					result: {
						error: `I couldn't find a contract matching "${search}". Ask me to search contracts first.`,
					},
				};
			}
			if (contracts.length > 1) {
				return {
					result: {
						error: `I found ${contracts.length} contracts matching "${search}": ${contracts
							.slice(0, 3)
							.map((c) => String(c.name))
							.join(", ")}. Tell me which one.`,
					},
				};
			}
			const contract = contracts[0];
			const task = await TaskService.createTask(ctx.orgId, ctx.user.$id, {
				title: String(args.title),
				description: `Linked to contract: ${contract.name}`,
				dueDate: args.dueDate ? String(args.dueDate) : undefined,
				priority: (args.priority as "low" | "medium" | "high") || "medium",
				status: "not_started",
				linkedEntityType: "contract",
				linkedEntityId: String(contract.id),
			});
			return {
				result: {
					taskId: task.$id,
					title: task.title,
					contract: contract.name,
				},
			};
		},
	},
	{
		name: "generate_report",
		description: "Start an AI report generation for the user's department",
		requiredPermissions: [PERMISSIONS.SETTINGS.VIEW],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				department: { type: "string" },
			},
			required: ["department"],
		},
		handler: async (ctx, args) => {
			const userName =
				(ctx.user as { fullName?: string }).fullName ||
				ctx.user.name ||
				ctx.user.email ||
				"User";
			const division =
				(ctx.user.prefs as { division?: string })?.division ||
				String(args.department ?? "General");
			const report = await generateReport({
				userId: ctx.user.$id,
				department: String(args.department ?? division),
				userName,
			});
			await logAuditEvent({
				event_id: `assistant_report_${report.$id}`,
				event_title: `Assistant started report: ${report.title}`,
				action: "create",
				source: "caalm",
				user_id: ctx.user.$id,
				user_name: userName,
				user_email: ctx.user.email || "",
				status: "success",
				orgId: ctx.orgId,
				module: "system",
				target_type: "report",
				target_id: report.$id,
				target_label: report.title,
				summary: `CAALM assistant started report generation`,
				metadata: { source: "ai_assistant" },
			}).catch(() => undefined);
			return { result: { reportId: report.$id, status: report.status } };
		},
	},
];

export function getToolsForPermissions(
	permissions: ToolContext["permissions"],
) {
	return ASSISTANT_TOOLS.filter((tool) =>
		tool.requiredPermissions.every((p) => permissions.includes(p)),
	);
}

export async function runToolByName(
	ctx: ToolContext,
	toolName: string,
	args: Record<string, unknown>,
): Promise<{
	result?: unknown;
	clientAction?: { type: "navigate"; href: string };
	error?: string;
}> {
	const tool = ASSISTANT_TOOLS.find((t) => t.name === toolName);
	if (!tool) return { error: "Unknown tool" };
	if (!tool.requiredPermissions.every((p) => ctx.permissions.includes(p))) {
		return { error: "Insufficient permissions for tool" };
	}
	try {
		return await tool.handler(ctx, args);
	} catch (error) {
		console.error(`[assistant tool ${toolName}] failed:`, error);
		return {
			result: {
				error:
					"I ran into a problem completing that. Try rephrasing, or use the page directly.",
			},
		};
	}
}
