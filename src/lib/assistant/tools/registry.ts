import { Query } from "node-appwrite";
import { PERMISSIONS } from "@/constants/permissions";
import {
	type CreateCalendarEventData,
	createCalendarEvent,
	getCalendarEventsByMonth,
} from "@/lib/actions/calendar.actions";
import { listCalendarApprovalRequests } from "@/lib/actions/calendar-approval.actions";
import { generateReport } from "@/lib/actions/report.actions";
import { TaskService } from "@/lib/api/tasks/services/TaskService";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { retrieveKnowledge } from "@/lib/assistant/knowledge/retrieve";
import type { ToolContext, ToolDefinition } from "@/lib/assistant/tools/types";
import { evaluateCalendarPermission } from "@/lib/auth/guards";
import { getCurrentUserId } from "@/lib/microsoft/auth-utils";
import { logAuditEvent } from "@/lib/services/audit-logger";
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
		expiryDate: r.expiryDate,
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
		expirationDate: r.expirationDate,
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
		requiredPermissions: [PERMISSIONS.CALENDAR.CREATE],
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
			if (!hasAll(ctx, [PERMISSIONS.CALENDAR.CREATE])) {
				return { result: { error: "Missing calendar.create permission" } };
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

			// Conflicts: warn in the answer instead of blocking (the assistant chat
			// has no second confirmation step like the calendar form does).
			let conflicts: string[] = [];
			if (eventPayload.participants) {
				try {
					const found = await detectParticipantConflicts(
						eventPayload,
						undefined,
						ctx.user.$id,
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
	return tool.handler(ctx, args);
}
