import {
	type Content,
	FunctionCallingMode,
	type FunctionDeclaration,
	GoogleGenerativeAI,
	SchemaType,
} from "@google/generative-ai";
import type { AssistantInputForm } from "@/components/assistant/assistantTypes";
import { PERMISSIONS } from "@/constants/permissions";
import type { ActivityFeedPayload } from "@/lib/assistant/activityFeed";
import { buildActivityFeed } from "@/lib/assistant/activityFeed";
import type { AssistantResearchStep } from "@/lib/assistant/assistant-research-steps";
import { runAuditRemediationResearch } from "@/lib/assistant/audit-remediation-research";
import {
	type AuditRemediationContext,
	buildAuditRemediationPrompt,
	formatAuditFindingLabel,
} from "@/lib/assistant/audit-remediation-context";
import type { AssistantAuthContext } from "@/lib/assistant/auth";
import {
	buildClaudeTools,
	callClaudeAssistantTurn,
	callClaudeToolFollowUp,
} from "@/lib/assistant/claudeChat";
import {
	formatDueDate,
	formatPriority,
	formatTaskStatus,
} from "@/lib/assistant/formatLabels";
import { buildGeminiChatHistory } from "@/lib/assistant/geminiHistory";
import { buildGeminiToolFollowUpContents } from "@/lib/assistant/geminiToolFollowUp";
import { buildImplementationAnalysis } from "@/lib/assistant/implementation-analysis";
import {
	type DirectoryInvitee,
	resolveDirectoryInvitees,
} from "@/lib/assistant/directoryInvite";
import {
	formFromQuizText,
	hasScheduleDateAndTime,
	inviteUsersForm,
	isIncompleteSchedule,
	looksLikeFieldQuiz,
	parseFieldsArg,
	resolveInputForm,
	scheduleDefaultsFromMessage,
	scheduleEventForm,
	scheduleFormFromArgs,
} from "@/lib/assistant/inputForm";
import {
	detectDataIntent,
	isLiveDataIntent,
	parseDepartmentFilter,
} from "@/lib/assistant/intent";
import {
	clearInviteQueue,
	getInviteQueue,
	setInviteQueue,
} from "@/lib/assistant/inviteQueue";
import type { RetrievedSource } from "@/lib/assistant/knowledge/retrieve";
import { retrieveKnowledge } from "@/lib/assistant/knowledge/retrieve";
import {
	type AssistantLlmProvider,
	resolveAssistantProvider,
	resolveAssistantTurnKind,
} from "@/lib/assistant/modelRouter";
import { parseCreateTaskDraft } from "@/lib/assistant/parseCreateTaskDraft";
import {
	formatInviteNamesForAnswer,
} from "@/lib/assistant/invitePeopleField";
import {
	formatInvitePeopleLine,
	parseInviteDraft,
} from "@/lib/assistant/parseInviteDraft";
import { parseUserProfileRename } from "@/lib/assistant/parseUserProfileUpdate";
import { sanitizeRescheduleArgs } from "@/lib/assistant/rescheduleArgs";
import { ASSISTANT_TOOLS } from "@/lib/assistant/tools/registry";
import {
	detectCapCloseAssistIntent,
	lastAssistantMessageContent,
	resolveVerificationNoteForClose,
} from "@/lib/assistant/cap-close-assist";
import type { AssistantClientAction } from "@/lib/assistant/open-close-cap-client";
import {
	buildOpenCloseCapSuggestion,
	type AssistantSuggestion,
	suggestionsForTurn,
} from "@/lib/assistant/suggestions";
import {
	getToolsForPermissions,
	runToolByName,
} from "@/lib/assistant/tools/registry";
import { normalizeUserToolPendingArgs } from "@/lib/assistant/tools/userTools";
import type { ToolDefinition } from "@/lib/assistant/tools/types";
import { storePendingAction } from "@/lib/assistant/tools/types";
import type { AuditCapStatus } from "@/lib/audit-upload/types";
import { normalizePricingTier } from "@/lib/billing/entitlements";
import { getOrganization } from "@/lib/rbac/organizations";

export type ChatTurnMessage = {
	role: "user" | "assistant";
	content: string;
};

export type AssistantTurnResult = {
	answer: string;
	sources: RetrievedSource[];
	suggestions?: AssistantSuggestion[];
	pendingAction?: {
		id: string;
		label: string;
		preview: string;
		toolName: string;
		args?: Record<string, unknown>;
	};
	clientAction?: AssistantClientAction;
	activityFeed?: ActivityFeedPayload;
	inputForm?: AssistantInputForm;
	researchSteps?: AssistantResearchStep[];
};

const DATA_TOOLS = new Set([
	"list_tasks",
	"search_contracts",
	"search_licenses",
	"list_pending_approvals",
	"list_calendar_events",
	"list_expirations",
	"list_audit_logs",
	"list_users",
	"list_departments",
	"list_roles",
]);

function pendingActionLabel(
	toolName: string,
	args: Record<string, unknown>,
	subjectLabel?: string,
): string {
	const userSubject =
		subjectLabel ||
		(typeof args.userEmail === "string" ? args.userEmail : undefined) ||
		(typeof args.userId === "string" ? args.userId : undefined) ||
		"user";
	switch (toolName) {
		case "create_task":
			return `Create task “${args.title ?? "Untitled"}”`;
		case "complete_task":
			return `Mark task “${args.title ?? "?"}” done`;
		case "create_calendar_event":
			return `Schedule meeting “${args.title ?? "Untitled"}” on ${args.date ?? "?"} at ${args.startTime ?? "?"}`;
		case "reschedule_calendar_event":
			return args.newDate
				? `Move “${args.eventTitle ?? "?"}” to ${args.newDate} at ${args.newStartTime ?? "?"}`
				: `Change “${args.eventTitle ?? "?"}” to ${args.newStartTime ?? "?"} (keep same date)`;
		case "cancel_calendar_event":
			return `Cancel meeting “${args.eventTitle ?? "?"}”`;
		case "create_task_for_contract":
			return `Create task “${args.title ?? "Untitled"}” for ${args.contractName ?? "contract"}`;
		case "generate_report":
			return `Generate report for ${args.department ?? "your department"}`;
		case "invite_user":
			return `Invite ${args.name || args.email || "user"} as ${args.role ?? "Viewer"} in ${args.department ?? "department"}`;
		case "invite_users": {
			const invitees = Array.isArray(args.invitees)
				? (args.invitees as Array<{ name?: string; email?: string }>)
				: [];
			const names =
				invitees
					.map((row) => row.name || row.email)
					.filter(Boolean)
					.join(", ") || "directory users";
			return `Invite ${names} as ${args.role ?? "Viewer"} in ${args.department ?? "department"}`;
		}
		case "resend_invite":
			return `Resend invite to ${args.email ?? "pending user"}`;
		case "assign_user_roles":
			return `Change roles for ${userSubject}`;
		case "deactivate_user":
			return args.reactivate === true ||
				String(args.reactivate ?? "").toLowerCase() === "true"
				? `Reactivate ${userSubject}`
				: `Deactivate ${userSubject}`;
		case "update_user_profile":
			return `Update profile for ${userSubject}`;
		case "update_org_settings":
			return args.timezone
				? `Set organization timezone to ${args.timezone}`
				: args.websiteUrl
					? `Update organization website URL`
					: `Update organization settings`;
		default:
			return `Confirm ${toolName}`;
	}
}

function buildFunctionDeclarations(
	tools: ToolDefinition[],
): FunctionDeclaration[] {
	return tools.map((tool) => {
		const props = (tool.parameters.properties ?? {}) as Record<
			string,
			{ type?: string; description?: string; enum?: string[] }
		>;
		const mappedProps: Record<
			string,
			{ type: SchemaType; description?: string; enum?: string[] }
		> = {};
		for (const [key, val] of Object.entries(props)) {
			mappedProps[key] = {
				type: SchemaType.STRING,
				description: val.description,
				enum: val.enum,
			};
			if (val.type === "number") mappedProps[key].type = SchemaType.NUMBER;
		}
		return {
			name: tool.name,
			description: tool.description,
			parameters: {
				type: SchemaType.OBJECT,
				properties: mappedProps,
				required: (tool.parameters.required as string[]) ?? [],
			},
		} as FunctionDeclaration;
	});
}

function taskCountFromResult(output: unknown): number {
	const data = output as { tasks?: unknown[]; error?: string };
	if (!data || data.error) return 0;
	return Array.isArray(data.tasks) ? data.tasks.length : 0;
}

function formatTaskAnswer(output: unknown): string | null {
	const data = output as {
		error?: string;
		tasks?: Array<{
			title?: string;
			status?: string;
			priority?: string;
			dueDate?: string | null;
		}>;
	};
	if (!data || data.error) return null;
	const tasks = data.tasks ?? [];
	if (tasks.length === 0) {
		return "You have no pending tasks right now. You can create one from the Tasks page, or ask me to help create a task.";
	}
	const lines = tasks.map((t, i) => {
		const parts = [
			formatTaskStatus(t.status),
			formatPriority(t.priority),
			formatDueDate(t.dueDate),
		].filter(Boolean);
		const detail = parts.length ? ` — ${parts.join(", ")}` : "";
		return `${i + 1}. **${t.title ?? "Untitled"}**${detail}`;
	});
	const intro =
		tasks.length === 1
			? "You have **1** pending task:"
			: `You have **${tasks.length}** pending tasks:`;
	return `${intro}\n\n${lines.join("\n")}\n\nOpen the Tasks page for the full list and filters.`;
}

function formatListItems(
	items: Array<Record<string, unknown>>,
	nameKey: string,
	extraKeys: Array<{ key: string; label: (v: unknown) => string | null }>,
): string {
	if (!items.length) return "I did not find any matching items.";
	return items
		.map((item, i) => {
			const name = String(
				item[nameKey] ?? item.title ?? item.name ?? "Untitled",
			);
			const extras = extraKeys
				.map(({ key, label }) => label(item[key]))
				.filter(Boolean);
			const detail = extras.length ? ` — ${extras.join(", ")}` : "";
			return `${i + 1}. **${name}**${detail}`;
		})
		.join("\n");
}

function formatGenericDataAnswer(toolName: string, output: unknown): string {
	if (toolName === "list_tasks") {
		return (
			formatTaskAnswer(output) ??
			"I could not load your tasks. Try opening the Tasks page."
		);
	}

	const data = output as Record<string, unknown>;
	if (data?.error) {
		return `I could not complete that request: ${String(data.error)}`;
	}

	if (toolName === "search_contracts") {
		const items = (data.contracts ?? data.results ?? []) as Array<
			Record<string, unknown>
		>;
		if (!items.length) return "I did not find any matching contracts.";
		return `Here are the contracts I found:\n\n${formatListItems(
			items,
			"name",
			[
				{
					key: "status",
					label: (v) => (v ? formatTaskStatus(String(v)) : null),
				},
				{
					key: "expiryDate",
					label: (v) => formatDueDate(v ? String(v) : null),
				},
			],
		)}`;
	}

	if (toolName === "search_licenses") {
		const items = (data.licenses ?? data.results ?? []) as Array<
			Record<string, unknown>
		>;
		if (!items.length) return "I did not find any matching licenses.";
		return `Here are the licenses I found:\n\n${formatListItems(items, "name", [
			{
				key: "status",
				label: (v) => (v ? String(v).replace(/_/g, " ") : null),
			},
			{
				key: "expirationDate",
				label: (v) => formatDueDate(v ? String(v) : null),
			},
		])}`;
	}

	if (toolName === "list_pending_approvals") {
		const items = (data.approvals ?? data.requests ?? []) as Array<
			Record<string, unknown>
		>;
		if (!items.length) return "You have no pending approvals right now.";
		return `Here are your pending approvals:\n\n${formatListItems(
			items,
			"title",
			[
				{
					key: "status",
					label: (v) => (v ? String(v).replace(/_/g, " ") : null),
				},
			],
		)}`;
	}

	if (toolName === "list_calendar_events") {
		const items = (data.events ?? []) as Array<Record<string, unknown>>;
		const day = data.date ? String(data.date) : "that day";
		if (!items.length)
			return `You have nothing on your CAALM calendar for ${day}.`;
		const lines = items
			.map((e) => {
				const time = e.startTime
					? `${e.startTime}${e.endTime ? `–${e.endTime}` : ""}`
					: "All day";
				const loc = e.location ? ` — ${e.location}` : "";
				return `- **${e.title ?? "Untitled"}** (${time})${loc}`;
			})
			.join("\n");
		return `Here's your schedule for ${day}:\n\n${lines}\n\nOpen the Calendar page for details.`;
	}

	if (toolName === "list_expirations") {
		const contracts = (data.contracts ?? []) as Array<Record<string, unknown>>;
		const licenses = (data.licenses ?? []) as Array<Record<string, unknown>>;
		const days = Number(data.days) || 90;
		if (!contracts.length && !licenses.length) {
			return `Nothing is expiring in the next ${days} days. You're clear.`;
		}
		const parts: string[] = [];
		if (contracts.length) {
			const lines = contracts
				.map(
					(c) =>
						`- **${c.name ?? "Untitled"}** — ${formatDueDate(c.expiryDate ? String(c.expiryDate) : null)}`,
				)
				.join("\n");
			parts.push(`**Contracts:**\n${lines}`);
		}
		if (licenses.length) {
			const lines = licenses
				.map(
					(l) =>
						`- **${l.name ?? "Untitled"}** — ${formatDueDate(l.expirationDate ? String(l.expirationDate) : null)}`,
				)
				.join("\n");
			parts.push(`**Licenses:**\n${lines}`);
		}
		return `Here's what's expiring in the next ${days} days:\n\n${parts.join("\n\n")}\n\nOpen Contracts or Licenses for details.`;
	}

	if (toolName === "list_audit_logs") {
		const items = (data.logs ?? []) as Array<Record<string, unknown>>;
		if (!items.length) return "No recent activity found for your organization.";
		return "Here's the recent activity.";
	}

	if (toolName === "list_users") {
		const items = (data.users ?? []) as Array<Record<string, unknown>>;
		const department =
			typeof data.department === "string" && data.department.trim()
				? data.department.trim()
				: null;
		if (!items.length) {
			return String(
				data.message ??
					(department
						? `No people found in the ${department} department.`
						: "No people found in this organization."),
			);
		}
		const header = department
			? `Here are the people in ${department}:`
			: "Here are the people I found:";
		return `${header}\n\n${formatListItems(items, "name", [
			{ key: "email", label: (v) => (v ? String(v) : null) },
			{ key: "role", label: (v) => (v ? String(v) : null) },
			{ key: "department", label: (v) => (v ? String(v) : null) },
			{ key: "status", label: (v) => (v ? String(v) : null) },
		])}\n\nOpen Users for the full directory.`;
	}

	if (toolName === "list_departments") {
		const items = (data.departments ?? []) as Array<Record<string, unknown>>;
		if (!items.length) {
			return "No departments are configured for this organization.";
		}
		return `Here are the departments in your organization:\n\n${formatListItems(
			items,
			"name",
			[],
		)}`;
	}

	if (toolName === "list_roles") {
		const items = (data.roles ?? []) as Array<Record<string, unknown>>;
		if (!items.length) {
			return String(data.message ?? "No roles found for this organization.");
		}
		const lines = items.map((role, index) => {
			const canDo = Array.isArray(role.canDo)
				? (role.canDo as string[]).slice(0, 5).join("; ")
				: "";
			const more =
				typeof role.morePermissions === "number" && role.morePermissions > 0
					? ` (+${role.morePermissions} more)`
					: "";
			const detail = canDo ? ` — can: ${canDo}${more}` : "";
			return `${index + 1}. **${role.name ?? "Role"}**${detail}`;
		});
		return `Here are the roles I found:\n\n${lines.join("\n")}\n\nOpen Users to manage role assignments.`;
	}

	return "I finished that request. Use a suggestion below if you want to dig in further.";
}

function sourcesForTool(
	toolName: string,
	ragSources: RetrievedSource[],
): RetrievedSource[] {
	if (DATA_TOOLS.has(toolName)) {
		if (toolName === "list_tasks") {
			return [
				{
					id: "module-tasks",
					title: "Tasks",
					href: "/team/tasks",
					excerpt: "Live task list from your organization",
				},
			];
		}
		if (
			toolName === "list_calendar_events" ||
			toolName === "create_calendar_event"
		) {
			return [
				{
					id: "module-calendar",
					title: "Calendar",
					href: "/calendar",
					excerpt: "Your CAALM calendar",
				},
			];
		}
		if (
			toolName === "list_users" ||
			toolName === "list_roles" ||
			toolName === "list_departments"
		) {
			return [
				{
					id: "module-users",
					title: "Users",
					href: "/dashboard/users",
					excerpt: "People and roles in your organization",
				},
			];
		}
		return [];
	}
	return ragSources;
}

export async function runAssistantTurn(params: {
	ctx: AssistantAuthContext;
	messages: ChatTurnMessage[];
	userMessage: string;
	pathname?: string;
	remediationContext?: AuditRemediationContext;
	contextRoutes?: string[];
}): Promise<AssistantTurnResult> {
	const {
		ctx,
		messages,
		userMessage,
		pathname,
		remediationContext,
		contextRoutes,
	} = params;
	const dataIntent = detectDataIntent(userMessage);
	const { sources: ragSources, contextText } = retrieveKnowledge(
		userMessage,
		pathname,
	);
	// For live-data questions, do not let weak RAG matches steer the answer.
	const sources = isLiveDataIntent(dataIntent) ? [] : ragSources;

	const googleApiKey = process.env.GOOGLE_API_KEY;
	const claudeApiKey = process.env.CLAUDE_API_KEY;
	if (!googleApiKey && !claudeApiKey) {
		return {
			answer:
				"AI is not configured on this server. You can still browse CAALM using the sidebar. For product help, open the demo tour tips on each module page.",
			sources: ragSources,
			suggestions: suggestionsForTurn({ dataIntent }),
		};
	}

	const allowedTools = getToolsForPermissions(ctx.permissions);
	const declarations = buildFunctionDeclarations(allowedTools);

	// request_input: AI calls this instead of asking in free text when it needs structured user input.
	const requestInputDeclaration: FunctionDeclaration = {
		name: "request_input",
		description:
			'Show the user a structured form to fill in instead of asking in free text. Call this whenever you need multiple fields from the user (e.g. scheduling details). Pass fields_json as a JSON array of {name,label,type,placeholder?,required?,options?} objects. Field types: text, date, time, select, textarea. For select fields, options must be an array of strings (e.g. ["meeting","review"]), never objects.',
		parameters: {
			type: SchemaType.OBJECT,
			properties: {
				intent: {
					type: SchemaType.STRING,
					description:
						"Short key for what is being collected, e.g. schedule_event",
				},
				intro: {
					type: SchemaType.STRING,
					description: "Brief message shown above the form",
				},
				fields_json: {
					type: SchemaType.STRING,
					description: "JSON array of field objects",
				},
			},
			required: ["intent", "intro", "fields_json"],
		},
	};
	declarations.push(requestInputDeclaration);
	const canListTasks = allowedTools.some((t) => t.name === "list_tasks");
	const canListUsers = allowedTools.some((t) => t.name === "list_users");
	const canListRoles = allowedTools.some((t) => t.name === "list_roles");
	const canCreateTask = allowedTools.some((t) => t.name === "create_task");
	const canCreateEvent = allowedTools.some(
		(t) => t.name === "create_calendar_event",
	);
	const canUpdateUserProfile = allowedTools.some(
		(t) => t.name === "update_user_profile",
	);
	const canInviteUser = allowedTools.some(
		(t) => t.name === "invite_user" || t.name === "invite_users",
	);

	// Deterministic path: CAALM invite — one person per form, then Confirm.
	if (!remediationContext && dataIntent === "invite_user") {
		if (!canInviteUser) {
			return {
				answer:
					"You don't have permission to invite people into CAALM (`users.invite`). Ask an admin for invite access, or open **Send Invite Link** on the dashboard with a role that includes inviting.",
				sources: [],
				suggestions: [
					{
						id: "open-dashboard",
						label: "Open dashboard",
						action: { type: "navigate", href: "/dashboard" },
					},
				],
			};
		}

		const draft = parseInviteDraft(userMessage);
		const existingQueue = await getInviteQueue(ctx.user.$id, ctx.orgId);
		let matched: DirectoryInvitee[] = [];
		let unmatched: string[] = [];

		if (draft.nameHints.length > 0 || draft.emails.length > 0) {
			const resolved = await resolveDirectoryInvitees({
				nameHints: draft.nameHints,
				emails: draft.emails,
			});
			matched = resolved.matched;
			unmatched = resolved.unmatched;
		} else if (existingQueue?.remaining.length) {
			matched = [...existingQueue.remaining];
		}

		if (matched.length === 0) {
			const who =
				unmatched.length > 0 ? unmatched.join(", ") : "those people";
			return {
				answer: `${who} ${unmatched.length === 1 ? "is" : "are"} not in the connected directory waiting for a CAALM invite. Invites grant CAALM access to people who already have a company email in that directory. Use **Send Invite Link** on the dashboard after they appear there.`,
				sources: [],
				suggestions: [
					{
						id: "open-dashboard-invite",
						label: "Open Send Invite Link",
						action: { type: "navigate", href: "/dashboard" },
					},
				],
			};
		}

		const unmatchedNote =
			unmatched.length > 0
				? ` I could not match: ${unmatched.join(", ")}.`
				: "";

		// Clickable multi form: check who shares this role/dept; unchecked wait for the next form.
		if (matched.length > 1 && (!draft.role || !draft.department)) {
			await setInviteQueue({
				userId: ctx.user.$id,
				orgId: ctx.orgId,
				remaining: matched,
				total: Math.max(existingQueue?.total ?? 0, matched.length),
			});
			return {
				answer: `I found ${formatInviteNamesForAnswer(matched)} in the connected directory. Check everyone who should share the same role and department on this invite. Leave others unchecked. After you Confirm, I will open another form for anyone still left.${unmatchedNote}`,
				sources: [],
				suggestions: [],
				inputForm: inviteUsersForm(
					{
						people: formatInvitePeopleLine(matched),
						role: draft.role,
						department: draft.department,
						division: draft.division,
					},
					matched,
				),
			};
		}

		// Ready to confirm: selected people from this form (or NL).
		// Unchecked people stay in the queue until Confirm succeeds, then get the next form.
		if (draft.role && draft.department) {
			const selected = matched;
			const selectedEmails = new Set(
				selected.map((row) => row.email.trim().toLowerCase()),
			);
			const pool = existingQueue?.remaining?.length
				? existingQueue.remaining
				: selected;
			const deferred: DirectoryInvitee[] = pool.filter(
				(row) => !selectedEmails.has(row.email.trim().toLowerCase()),
			);

			if (deferred.length > 0) {
				// Keep unchecked people in the queue until Confirm succeeds.
				await setInviteQueue({
					userId: ctx.user.$id,
					orgId: ctx.orgId,
					remaining: pool,
					total: Math.max(
						existingQueue?.total ?? 0,
						pool.length,
						selected.length + deferred.length,
					),
				});
			} else if (!existingQueue) {
				// Natural-language invite with role already filled: nothing deferred.
				await clearInviteQueue(ctx.user.$id, ctx.orgId);
			} else {
				// Everyone in the queue was selected for this Confirm.
				await setInviteQueue({
					userId: ctx.user.$id,
					orgId: ctx.orgId,
					remaining: pool,
					total: existingQueue.total,
				});
			}

			const deferredNote =
				deferred.length > 0
					? ` After Confirm, I will ask about ${formatInviteNamesForAnswer(deferred)} next.`
					: "";

			if (selected.length === 1) {
				const current = selected[0]!;
				const singleArgs: Record<string, unknown> = {
					email: current.email,
					name: current.fullName,
					role: draft.role,
					department: draft.department,
					...(draft.division ? { division: draft.division } : {}),
				};
				const label = pendingActionLabel("invite_user", singleArgs);
				const preview = JSON.stringify(singleArgs, null, 2).slice(0, 500);
				const pending = await storePendingAction({
					userId: ctx.user.$id,
					orgId: ctx.orgId,
					toolName: "invite_user",
					args: singleArgs,
					label,
					preview,
				});
				return {
					answer: `I prepared **${label}**. Review and tap **Confirm** to send their invite link. Nothing is sent until you confirm.${deferredNote}${unmatchedNote}`,
					sources: [],
					suggestions: [
						{
							id: "confirm-hint",
							label: "What happens when I confirm?",
							action: {
								type: "prompt",
								text: "What will happen when I confirm this action?",
							},
						},
						{
							id: "open-pending-invites",
							label: "Open Pending Invitations",
							action: { type: "navigate", href: "/dashboard" },
						},
					],
					pendingAction: {
						id: pending.id,
						label,
						preview,
						toolName: "invite_user",
						args: singleArgs,
					},
				};
			}

			const invitees = selected.map((row) => ({
				email: row.email,
				name: row.fullName,
			}));
			const bulkArgs: Record<string, unknown> = {
				invitees,
				invitees_json: JSON.stringify(invitees),
				role: draft.role,
				department: draft.department,
				...(draft.division ? { division: draft.division } : {}),
			};
			const label = pendingActionLabel("invite_users", bulkArgs);
			const preview = JSON.stringify(bulkArgs, null, 2).slice(0, 500);
			const pending = await storePendingAction({
				userId: ctx.user.$id,
				orgId: ctx.orgId,
				toolName: "invite_users",
				args: bulkArgs,
				label,
				preview,
			});
			return {
				answer: `I prepared **${label}** for ${formatInviteNamesForAnswer(selected)}. Review and tap **Confirm** to send these invite links. Nothing is sent until you confirm.${deferredNote}${unmatchedNote}`,
				sources: [],
				suggestions: [
					{
						id: "confirm-hint",
						label: "What happens when I confirm?",
						action: {
							type: "prompt",
							text: "What will happen when I confirm this action?",
						},
					},
					{
						id: "open-pending-invites",
						label: "Open Pending Invitations",
						action: { type: "navigate", href: "/dashboard" },
					},
				],
				pendingAction: {
					id: pending.id,
					label,
					preview,
					toolName: "invite_users",
					args: bulkArgs,
				},
			};
		}

		// Single person, still need role/department.
		const current = matched[0]!;
		await setInviteQueue({
			userId: ctx.user.$id,
			orgId: ctx.orgId,
			remaining: matched,
			total: Math.max(existingQueue?.total ?? 0, matched.length),
		});
		return {
			answer: `I found **${current.fullName}** in the connected directory. Choose their CAALM role and department. Nothing is sent until you Confirm.${unmatchedNote}`,
			sources: [],
			suggestions: [],
			inputForm: inviteUsersForm({
				people: formatInvitePeopleLine([current]),
				role: draft.role,
				department: draft.department,
				division: draft.division,
			}),
		};
	}

	// Deterministic path: rename / change display name → confirm card (skip list_users).
	if (
		!remediationContext &&
		dataIntent === "update_user_profile" &&
		canUpdateUserProfile
	) {
		const draft = parseUserProfileRename(userMessage);
		if (draft) {
			let args: Record<string, unknown> = {
				userEmail: draft.lookup,
				fullName: draft.fullName,
			};
			const normalized = await normalizeUserToolPendingArgs(
				ctx.orgId,
				"update_user_profile",
				args,
			);
			if (normalized.error) {
				return {
					answer: normalized.error,
					sources: [],
					suggestions: suggestionsForTurn({ dataIntent }),
				};
			}
			args = normalized.args;
			const label = pendingActionLabel(
				"update_user_profile",
				args,
				normalized.subjectLabel,
			);
			const preview = JSON.stringify(args, null, 2).slice(0, 500);
			const pending = await storePendingAction({
				userId: ctx.user.$id,
				orgId: ctx.orgId,
				toolName: "update_user_profile",
				args,
				label,
				preview,
			});
			return {
				answer: `I prepared **${label}**. Review the details and tap **Confirm** to run it, or ask me to change something first.`,
				sources: [],
				suggestions: [
					{
						id: "confirm-hint",
						label: "What happens when I confirm?",
						action: {
							type: "prompt",
							text: "What will happen when I confirm this action?",
						},
					},
				],
				pendingAction: {
					id: pending.id,
					label,
					preview,
					toolName: "update_user_profile",
					args,
				},
			};
		}
	}

	// Deterministic path: open an editable draft card instead of a numbered quiz.
	if (!remediationContext && dataIntent === "create_task" && canCreateTask) {
		const draft = parseCreateTaskDraft(userMessage);
		const args: Record<string, unknown> = {
			title: draft.title,
			priority: draft.priority,
			...(draft.dueDate ? { dueDate: draft.dueDate } : {}),
			...(draft.description ? { description: draft.description } : {}),
		};
		const label = draft.title ? `Create task “${draft.title}”` : "Create task";
		const preview = JSON.stringify(args, null, 2).slice(0, 500);
		const pending = await storePendingAction({
			userId: ctx.user.$id,
			orgId: ctx.orgId,
			toolName: "create_task",
			args,
			label,
			preview,
		});
		return {
			answer: "",
			sources: [],
			suggestions: [],
			pendingAction: {
				id: pending.id,
				label,
				preview,
				toolName: "create_task",
				args,
			},
		};
	}

	// Vague “schedule a meeting” → inline form, never a typed quiz.
	if (
		!remediationContext &&
		dataIntent === "schedule_event" &&
		canCreateEvent &&
		!hasScheduleDateAndTime(userMessage)
	) {
		return {
			answer: "Fill this in to schedule it.",
			sources: [],
			suggestions: [],
			inputForm: scheduleEventForm(scheduleDefaultsFromMessage(userMessage)),
		};
	}

	// Deterministic path: pending tasks → call list_tasks (don't rely on the model).
	if (!remediationContext && dataIntent === "list_tasks" && canListTasks) {
		const toolResult = await runToolByName({ ...ctx, pathname }, "list_tasks", {
			pendingOnly: "true",
			limit: 15,
		});
		const answer =
			formatTaskAnswer(toolResult.result) ??
			formatGenericDataAnswer("list_tasks", toolResult.result);
		return {
			answer,
			sources: sourcesForTool("list_tasks", ragSources),
			suggestions: suggestionsForTurn({
				toolName: "list_tasks",
				dataIntent,
				taskCount: taskCountFromResult(toolResult.result),
			}),
			clientAction: toolResult.clientAction,
		};
	}

	// Deterministic path: list people (optional department filter from the message).
	if (!remediationContext && dataIntent === "list_users" && canListUsers) {
		const department = parseDepartmentFilter(userMessage);
		const toolResult = await runToolByName(
			{ ...ctx, pathname },
			"list_users",
			{
				...(department ? { department } : {}),
				limit: 25,
			},
		);
		return {
			answer: formatGenericDataAnswer("list_users", toolResult.result),
			sources: sourcesForTool("list_users", ragSources),
			suggestions: suggestionsForTurn({
				toolName: "list_users",
				dataIntent,
			}),
			clientAction: toolResult.clientAction,
		};
	}

	// Deterministic path: list departments (do not let the model call list_users).
	if (!remediationContext && dataIntent === "list_departments") {
		const toolResult = await runToolByName(
			{ ...ctx, pathname },
			"list_departments",
			{},
		);
		return {
			answer: formatGenericDataAnswer("list_departments", toolResult.result),
			sources: sourcesForTool("list_departments", ragSources),
			suggestions: suggestionsForTurn({
				toolName: "list_departments",
				dataIntent,
			}),
			clientAction: toolResult.clientAction,
		};
	}

	// Deterministic path: list roles.
	if (!remediationContext && dataIntent === "list_roles" && canListRoles) {
		const toolResult = await runToolByName(
			{ ...ctx, pathname },
			"list_roles",
			{ limit: 20 },
		);
		return {
			answer: formatGenericDataAnswer("list_roles", toolResult.result),
			sources: sourcesForTool("list_roles", ragSources),
			suggestions: suggestionsForTurn({
				toolName: "list_roles",
				dataIntent,
			}),
			clientAction: toolResult.clientAction,
		};
	}

	const systemInstruction = `You are CAALM Assistant, an in-app helper for contracts, licenses, audits, analytics, calendar, and tasks.

Rules:
- Write in plain, natural language for end users. Never show raw enums, snake_case, JSON, code paths, or API field names (say "Not started", not "not_started"; say "the Tasks page", not "/team/tasks").
- For live data (tasks, contracts, licenses, approvals, expirations, calendar events), ALWAYS call the matching tool. Never answer those from Knowledge Context alone.
- Creating tasks: NEVER ask the user to reply with a numbered list of fields (title, due date, priority, description). Call create_task with whatever you can parse from their message. Missing fields may be empty — the in-app draft card collects them with taps and short edits. Do not quiz in chat.
- Scheduling: when the user asks to schedule, book, or set up a meeting and you do not yet have all required fields (title, date, start time, end time, type), call request_input with intent="schedule_event" and the missing fields. Include optional fields for description and participants. Do NOT ask for this info in free text — always call request_input. Once the user fills the form and replies with the data, call create_calendar_event. Resolve relative dates ("tomorrow", "next Tuesday") against the current date below. If only a start time is given, default end time to 30 minutes later. Never invent participant emails; only include people the user named or emailed.
- Data collection: For ANY situation where you need multiple structured fields from the user before calling a tool, call request_input instead of asking in free text. This renders an inline form the user fills out with taps.
- Rescheduling: decide what the user wants to change before calling reschedule_calendar_event. If they only change the clock time (e.g. "move the review to 10am", "change it from 14:00 to 10:00", "make it 10 o'clock") and do not name a different day or date, omit newDate so the meeting stays on its existing date — only pass eventTitle and newStartTime. Only include newDate when the user explicitly asks for a different day (e.g. "to Friday", "next week", "the 14th", "August 14"). Never invent a new date for a time-only request. When listing or confirming, keep the original date visible if only the time changed.
- Knowledge Context is for product how-to only. Do not use Analytics, Reports, or Audit sources as a substitute for listing tasks.
- Never invent permissions or claim an action succeeded unless a tool returned success.
- After a tool returns data, summarize the rows clearly (titles, status, due dates). Never reply with only "Done."
- User profile changes: when the user asks to rename someone or change their name, job title, department, or division, call update_user_profile directly with that person's name or exact email. Do NOT call list_users first when they already named who to change — the confirm card resolves the directory email.
- Departments catalog: when the user asks which departments exist (not who is in one), call list_departments. Never answer with a people list for that question.
- People in a department: when the user asks for users/people in a department (e.g. "list users in IT"), call list_users with department set. Never call list_departments for that.
- Invites: CAALM invites are for product access only, and only for people already in the connected directory with a company email. Never invent invite success. Prefer invite_users / invite_user with directory emails, role, and department. The app shows a Confirm card before anything is sent.
- Only call navigate when the user asks to open or go to a page.
- Refuse legal, billing dispute, and security incident advice; suggest contacting an admin.
- Keep answers concise and actionable.
- Never use em dashes (—) or en dashes (–) as punctuation. Use a period, comma, or new sentence instead. Hyphens are fine only inside hyphenated words or labels (for example co-founder, well-known).
- One job per turn: do not claim unrelated profile edits when the user only asked to invite.
- Invites with several people: the app shows a clickable name list so the admin can include or remove people before choosing one shared role and department.

Current date and time (server timezone): ${new Date().toString()}
Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} (${new Date().toISOString().slice(0, 10)}). When the user says a weekday like "Friday", use the soonest upcoming that weekday (including today if it matches) — do not skip ahead a week unless they said "next Friday".

Knowledge Context (product help only):
${isLiveDataIntent(dataIntent) ? "Skipped for this live-data question." : contextText || "No specific docs matched."}

Current page path: ${pathname ?? "unknown"}
${contextRoutes?.length ? `Mentioned pages: ${contextRoutes.join(", ")}` : ""}
User permissions include: ${ctx.permissions.slice(0, 40).join(", ")}${ctx.permissions.length > 40 ? "…" : ""}
${remediationContext ? `\n${buildAuditRemediationPrompt(remediationContext)}` : ""}`;

	// Audit “Show me how”: live org-data research, findings report, optional apply card.
	if (remediationContext) {
		const capCloseIntent = detectCapCloseAssistIntent(userMessage);
		if (capCloseIntent?.kind === "open_dialog") {
			const canManageCaps = ctx.permissions.includes(
				PERMISSIONS.AUDIT.MANAGE_CAPS,
			);
			if (!canManageCaps) {
				return {
					answer:
						"You don't have permission to close corrective actions. Ask an admin for audit manage caps access.",
					sources: [],
					suggestions: [],
				};
			}
			if (!remediationContext.capId) {
				return {
					answer:
						"This finding does not have a corrective action yet. Confirm the finding and start the action first, then ask me to open Mark closed.",
					sources: ragSources,
					suggestions: [],
				};
			}
			const verificationNote = resolveVerificationNoteForClose({
				userMessage,
				priorAssistantContent: lastAssistantMessageContent(messages),
				stagedDraft: null,
			});
			if (!verificationNote.trim()) {
				return {
					answer:
						"I need the verification note text first. Ask me to write a verification note, then say open Mark closed dialog.",
					sources: ragSources,
					suggestions: [],
				};
			}
			const toolResult = await runToolByName(
				{ ...ctx, pathname },
				"prepare_close_corrective_action",
				{
					capId: remediationContext.capId,
					findingId: remediationContext.findingId,
					documentId: remediationContext.documentId,
					verificationNote,
				},
			);
			const err =
				toolResult.result &&
				typeof toolResult.result === "object" &&
				"error" in (toolResult.result as object)
					? String((toolResult.result as { error: string }).error)
					: toolResult.error;
			if (err) {
				return {
					answer: err,
					sources: ragSources,
					suggestions: [],
				};
			}
			const suggestions: AssistantSuggestion[] =
				toolResult.clientAction?.type === "open_close_cap"
					? [
							buildOpenCloseCapSuggestion({
								capId: toolResult.clientAction.capId,
								findingId: toolResult.clientAction.findingId,
								documentId: toolResult.clientAction.documentId,
								verificationNote: toolResult.clientAction.verificationNote,
							}),
						]
					: [];
			return {
				answer:
					"Opening Mark closed with your verification note — review and save when ready.",
				sources: ragSources,
				suggestions,
				clientAction: toolResult.clientAction,
			};
		}

		const research = await runAuditRemediationResearch({
			ctx,
			remediationContext,
			ragSources,
		});
		const canManageCaps = ctx.permissions.includes(
			PERMISSIONS.AUDIT.MANAGE_CAPS,
		);
		const analysis = buildImplementationAnalysis({
			finding: {
				$id: remediationContext.findingId,
				documentId: remediationContext.documentId,
				title: remediationContext.title,
				findingCode: remediationContext.findingCode,
			},
			cap:
				remediationContext.capId && remediationContext.capStatus
					? {
							$id: remediationContext.capId,
							title: remediationContext.capTitle ?? "Corrective action",
							status: remediationContext.capStatus as AuditCapStatus,
						}
					: null,
			canManageCaps,
		});
		let pendingAction: AssistantTurnResult["pendingAction"];
		const canManageFindings = ctx.permissions.includes(
			PERMISSIONS.AUDIT.MANAGE_FINDINGS,
		);
		if (
			research.hasConfirmAction &&
			canManageFindings &&
			!research.hasExecutableApply
		) {
			const args: Record<string, unknown> = {
				findingId: remediationContext.findingId,
				documentId: remediationContext.documentId,
				findingCode: remediationContext.findingCode,
				title: remediationContext.title,
				href: `/audits/upload/${remediationContext.documentId}#finding-${remediationContext.findingId}`,
			};
			const label = "Confirm finding";
			const preview = formatAuditFindingLabel(
				remediationContext.findingCode,
				remediationContext.title,
			);
			const pending = await storePendingAction({
				userId: ctx.user.$id,
				orgId: ctx.orgId,
				toolName: "confirm_finding",
				args,
				label,
				preview,
			});
			pendingAction = {
				id: pending.id,
				label,
				preview,
				toolName: "confirm_finding",
				args,
			};
		} else if (
			research.hasExecutableApply &&
			analysis.canApply &&
			analysis.applyArgs
		) {
			const args: Record<string, unknown> = {
				...analysis.applyArgs,
				capTitle: remediationContext.capTitle,
				href: analysis.href,
				changes: analysis.changes,
			};
			const label = "Start corrective action";
			const preview = analysis.changes
				.map(
					(change) => `${change.label}: ${change.current} → ${change.required}`,
				)
				.join("\n")
				.slice(0, 500);
			const pending = await storePendingAction({
				userId: ctx.user.$id,
				orgId: ctx.orgId,
				toolName: "apply_audit_remediation",
				args,
				label,
				preview,
			});
			pendingAction = {
				id: pending.id,
				label,
				preview,
				toolName: "apply_audit_remediation",
				args,
			};
		}
		return {
			answer: research.answer,
			sources: research.sources,
			suggestions: research.suggestions,
			pendingAction,
			researchSteps: research.steps,
		};
	}

	const forceTool =
		dataIntent === "list_pending_approvals" ||
		dataIntent === "search_contracts" ||
		dataIntent === "search_licenses" ||
		dataIntent === "expiring" ||
		dataIntent === "schedule_event" ||
		dataIntent === "view_schedule" ||
		dataIntent === "view_audit" ||
		dataIntent === "complete_task" ||
		dataIntent === "reschedule_event" ||
		dataIntent === "cancel_event" ||
		dataIntent === "list_users" ||
		dataIntent === "list_departments" ||
		dataIntent === "list_roles" ||
		dataIntent === "update_user_profile" ||
		dataIntent === "invite_user";

	const org = await getOrganization(ctx.orgId);
	const tier = normalizePricingTier(org?.subscriptionTier);
	const turnKind = resolveAssistantTurnKind({ dataIntent });
	let provider: AssistantLlmProvider = resolveAssistantProvider({
		tier,
		kind: turnKind,
	});

	if (provider === "claude" && !claudeApiKey) {
		if (tier === "enterprise") {
			return {
				answer:
					"Claude is not configured on this server. Ask your admin to set CLAUDE_API_KEY for Enterprise Ask CAALM.",
				sources: ragSources,
				suggestions: suggestionsForTurn({ dataIntent }),
			};
		}
		if (!googleApiKey) {
			return {
				answer:
					"AI is not configured on this server. You can still browse CAALM using the sidebar. For product help, open the demo tour tips on each module page.",
				sources: ragSources,
				suggestions: suggestionsForTurn({ dataIntent }),
			};
		}
		console.warn(
			"[SERVER] runAssistantTurn: CLAUDE_API_KEY missing; falling back to Gemini for growth action",
		);
		provider = "gemini";
	} else if (provider === "gemini" && !googleApiKey) {
		if (claudeApiKey && tier !== "starter") {
			console.warn(
				"[SERVER] runAssistantTurn: GOOGLE_API_KEY missing; falling back to Claude",
			);
			provider = "claude";
		} else {
			return {
				answer:
					"AI is not configured on this server. You can still browse CAALM using the sidebar. For product help, open the demo tour tips on each module page.",
				sources: ragSources,
				suggestions: suggestionsForTurn({ dataIntent }),
			};
		}
	}

	console.log(
		`[SERVER] runAssistantTurn: provider=${provider} tier=${tier} kind=${turnKind}`,
	);

	type NormalizedToolCall = {
		name: string;
		args: Record<string, unknown>;
		id?: string;
	};

	let toolCall: NormalizedToolCall | null = null;
	let textAnswer = "";
	let geminiFollowUp:
		| {
				history: ReturnType<typeof buildGeminiChatHistory>;
				modelContent: {
					role: string;
					parts: Array<Record<string, unknown>>;
				};
				model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>;
		  }
		| null = null;
	let claudeFollowUp:
		| {
				assistantContent: Awaited<
					ReturnType<typeof callClaudeAssistantTurn>
				>["assistantContent"];
				tools: ReturnType<typeof buildClaudeTools>;
		  }
		| null = null;

	if (provider === "claude") {
		const claudeTools = buildClaudeTools(allowedTools, true);
		const claudeTurn = await callClaudeAssistantTurn({
			systemInstruction,
			messages,
			userMessage,
			tools: claudeTools,
			forceTool,
		});
		if (claudeTurn.toolCall) {
			toolCall = {
				name: claudeTurn.toolCall.name,
				args: claudeTurn.toolCall.args,
				id: claudeTurn.toolCall.id,
			};
			claudeFollowUp = {
				assistantContent: claudeTurn.assistantContent,
				tools: claudeTools,
			};
		} else {
			textAnswer = claudeTurn.text || "I could not generate a response.";
		}
	} else {
		// Growth help: Gemini without tools (cheap RAG). Starter keeps tools.
		const geminiToolsEnabled = !(tier === "growth" && turnKind === "help");
		const genAI = new GoogleGenerativeAI(googleApiKey!);
		const model = genAI.getGenerativeModel({
			model: "gemini-3.5-flash-lite",
			systemInstruction,
			tools:
				geminiToolsEnabled && declarations.length
					? [{ functionDeclarations: declarations }]
					: undefined,
			toolConfig: geminiToolsEnabled
				? {
						functionCallingConfig: {
							mode: forceTool
								? FunctionCallingMode.ANY
								: FunctionCallingMode.AUTO,
						},
					}
				: undefined,
		});

		const history = buildGeminiChatHistory(messages, userMessage);
		const chat = model.startChat({ history });
		const result = await chat.sendMessage(userMessage);
		const response = result.response;
		const functionCalls = response.functionCalls();

		if (functionCalls?.length) {
			const call = functionCalls[0]!;
			const callWithId = call as typeof call & { id?: string };
			toolCall = {
				name: call.name,
				args: (call.args ?? {}) as Record<string, unknown>,
				id: callWithId.id,
			};
			const modelContent = response.candidates?.[0]?.content;
			geminiFollowUp = {
				history,
				modelContent: {
					role: modelContent?.role ?? "model",
					parts: (modelContent?.parts ?? []) as unknown as Array<
						Record<string, unknown>
					>,
				},
				model,
			};
		} else {
			textAnswer = response.text() || "I could not generate a response.";
		}
	}

	if (toolCall) {
		const call = toolCall;

		// request_input is a client-side form tool — handle before looking up in allowedTools.
		if (call.name === "request_input") {
			const args = call.args;
			const resolved = resolveInputForm({
				intent: String(args.intent ?? "input"),
				intro: String(args.intro ?? "Fill this in:"),
				rawFields: parseFieldsArg(args),
			});
			if (!resolved) {
				return {
					answer: "I need a few details, but the form did not load. Try again.",
					sources,
				};
			}
			return {
				answer: resolved.intro,
				sources: [],
				suggestions: [],
				inputForm: resolved.form,
			};
		}

		const tool = allowedTools.find((t) => t.name === call.name);
		if (!tool) {
			const knownTool = ASSISTANT_TOOLS.some((t) => t.name === call.name);
			if (!knownTool) {
				return {
					answer:
						"I don't have a tool for that exact step. For CAALM access invites, name people from the connected directory and include role and department — or use **Send Invite Link** on the dashboard.",
					sources: [],
					suggestions: suggestionsForTurn({ dataIntent }),
				};
			}
			return {
				answer:
					"I cannot run that action with your current permissions. Ask an admin if you need access.",
				sources: [],
				suggestions: suggestionsForTurn({ dataIntent }),
			};
		}

		let args = call.args;
		if (tool.name === "reschedule_calendar_event") {
			args = sanitizeRescheduleArgs(userMessage, args);
		}

		if (tool.name === "create_calendar_event" && isIncompleteSchedule(args)) {
			return {
				answer: "Fill this in to schedule it.",
				sources: [],
				suggestions: [],
				inputForm: scheduleFormFromArgs(args),
			};
		}

		if (tool.mutating) {
			const normalized = await normalizeUserToolPendingArgs(
				ctx.orgId,
				tool.name,
				args,
			);
			if (normalized.error) {
				return {
					answer: normalized.error,
					sources,
					suggestions: suggestionsForTurn({ dataIntent }),
				};
			}
			args = normalized.args;
			const label = pendingActionLabel(
				tool.name,
				args,
				normalized.subjectLabel,
			);
			const preview = JSON.stringify(args, null, 2).slice(0, 500);
			const pending = await storePendingAction({
				userId: ctx.user.$id,
				orgId: ctx.orgId,
				toolName: tool.name,
				args,
				label,
				preview,
			});
			const isTaskDraft =
				tool.name === "create_task" || tool.name === "create_task_for_contract";
			return {
				answer:
					tool.name === "create_calendar_event"
						? `I prepared **${label}**. Review the meeting card and tap **Confirm** to schedule it, or ask me to change something first.`
						: isTaskDraft
							? ""
							: `I prepared **${label}**. Review the details and tap **Confirm** to run it, or ask me to change something first.`,
				sources: [],
				suggestions: isTaskDraft
					? []
					: [
							{
								id: "confirm-hint",
								label: "What happens when I confirm?",
								action: {
									type: "prompt",
									text: "What will happen when I confirm this action?",
								},
							},
						],
				pendingAction: {
					id: pending.id,
					label,
					preview,
					toolName: tool.name,
					args,
				},
			};
		}

		const toolResult = await runToolByName(
			{ ...ctx, pathname },
			call.name,
			args,
		);

		if (call.name === "prepare_close_corrective_action") {
			const result = toolResult.result as { error?: string } | undefined;
			if (result?.error || toolResult.error) {
				return {
					answer:
						result?.error ?? toolResult.error ?? "Could not open Mark closed.",
					sources: sourcesForTool(call.name, ragSources),
					suggestions: [],
				};
			}
			const suggestions: AssistantSuggestion[] =
				toolResult.clientAction?.type === "open_close_cap"
					? [
							buildOpenCloseCapSuggestion({
								capId: toolResult.clientAction.capId,
								findingId: toolResult.clientAction.findingId,
								documentId: toolResult.clientAction.documentId,
								verificationNote: toolResult.clientAction.verificationNote,
							}),
						]
					: [];
			return {
				answer:
					"Opening Mark closed with your verification note — review and save when ready.",
				sources: sourcesForTool(call.name, ragSources),
				suggestions,
				clientAction: toolResult.clientAction,
			};
		}

		let text = "";
		if (provider === "claude" && claudeFollowUp && call.id) {
			text = (
				await callClaudeToolFollowUp({
					systemInstruction,
					messages,
					userMessage,
					assistantContent: claudeFollowUp.assistantContent,
					toolCallId: call.id,
					toolResult: toolResult.result ?? toolResult,
					tools: claudeFollowUp.tools,
				})
			).trim();
		} else if (provider === "gemini" && geminiFollowUp) {
			// Do not use chat.sendMessage for functionResponse — the SDK
			// still sends role "function", which Gemini 3.x rejects.
			const followUpContents = buildGeminiToolFollowUpContents({
				history: geminiFollowUp.history,
				userMessage,
				modelContent: geminiFollowUp.modelContent,
				functionCall: {
					name: call.name,
					args: call.args as object,
					id: call.id,
				},
				toolResult: toolResult.result ?? toolResult,
			});
			const followUp = await geminiFollowUp.model.generateContent({
				// GeminiContent is intentionally looser than SDK Content (id / thoughts).
				contents: followUpContents as unknown as Content[],
			});
			text = followUp.response.text()?.trim() ?? "";
		}

		const weakReply = !text || /^done\.?$/i.test(text);
		if (weakReply || DATA_TOOLS.has(call.name)) {
			text = formatGenericDataAnswer(
				call.name,
				toolResult.result ?? toolResult,
			);
		}

		const activityFeed =
			call.name === "list_audit_logs"
				? buildActivityFeed(toolResult.result ?? toolResult)
				: undefined;

		// Card owns the copy when a structured activity feed is present.
		const answer = activityFeed
			? ""
			: text || "I ran the request but got an empty reply.";

		return {
			answer,
			sources: sourcesForTool(call.name, ragSources),
			suggestions: suggestionsForTurn({
				toolName: call.name,
				dataIntent,
				taskCount: taskCountFromResult(toolResult.result),
			}),
			clientAction: toolResult.clientAction,
			...(activityFeed ? { activityFeed } : {}),
		};
	}

	// Model skipped tools on a live-data question — retry with forced list_tasks if possible.
	if (dataIntent === "list_tasks" && canListTasks) {
		const toolResult = await runToolByName({ ...ctx, pathname }, "list_tasks", {
			pendingOnly: "true",
			limit: 15,
		});
		return {
			answer:
				formatTaskAnswer(toolResult.result) ??
				formatGenericDataAnswer("list_tasks", toolResult.result),
			sources: sourcesForTool("list_tasks", ragSources),
			suggestions: suggestionsForTurn({
				toolName: "list_tasks",
				dataIntent,
				taskCount: taskCountFromResult(toolResult.result),
			}),
			clientAction: toolResult.clientAction,
		};
	}

	if (looksLikeFieldQuiz(textAnswer)) {
		const intent = dataIntent === "schedule_event" ? "schedule_event" : "input";
		return {
			answer: "Fill this in instead of typing answers.",
			sources: [],
			suggestions: [],
			inputForm: formFromQuizText(textAnswer, intent),
		};
	}

	return {
		answer: textAnswer,
		sources: ragSources,
		suggestions: suggestionsForTurn({ dataIntent }),
	};
}
