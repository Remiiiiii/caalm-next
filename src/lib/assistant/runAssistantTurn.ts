import {
	FunctionCallingMode,
	type FunctionDeclaration,
	GoogleGenerativeAI,
	SchemaType,
} from "@google/generative-ai";
import type { AssistantAuthContext } from "@/lib/assistant/auth";
import {
	formatDueDate,
	formatPriority,
	formatTaskStatus,
} from "@/lib/assistant/formatLabels";
import { detectDataIntent, isLiveDataIntent } from "@/lib/assistant/intent";
import type { RetrievedSource } from "@/lib/assistant/knowledge/retrieve";
import { retrieveKnowledge } from "@/lib/assistant/knowledge/retrieve";
import {
	type AssistantSuggestion,
	suggestionsForTurn,
} from "@/lib/assistant/suggestions";
import {
	getToolsForPermissions,
	runToolByName,
} from "@/lib/assistant/tools/registry";
import type { ToolDefinition } from "@/lib/assistant/tools/types";
import { storePendingAction } from "@/lib/assistant/tools/types";

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
	};
	clientAction?: { type: "navigate"; href: string };
};

const DATA_TOOLS = new Set([
	"list_tasks",
	"search_contracts",
	"search_licenses",
	"list_pending_approvals",
]);

const apiKey = process.env.GOOGLE_API_KEY;

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
		return [];
	}
	return ragSources;
}

export async function runAssistantTurn(params: {
	ctx: AssistantAuthContext;
	messages: ChatTurnMessage[];
	userMessage: string;
	pathname?: string;
}): Promise<AssistantTurnResult> {
	const { ctx, messages, userMessage, pathname } = params;
	const dataIntent = detectDataIntent(userMessage);
	const { sources: ragSources, contextText } = retrieveKnowledge(
		userMessage,
		pathname,
	);
	// For live-data questions, do not let weak RAG matches steer the answer.
	const sources = isLiveDataIntent(dataIntent) ? [] : ragSources;

	if (!apiKey) {
		return {
			answer:
				"AI is not configured on this server. You can still browse CAALM using the sidebar. For product help, open the demo tour tips on each module page.",
			sources: ragSources,
			suggestions: suggestionsForTurn({ dataIntent }),
		};
	}

	const allowedTools = getToolsForPermissions(ctx.permissions);
	const declarations = buildFunctionDeclarations(allowedTools);
	const canListTasks = allowedTools.some((t) => t.name === "list_tasks");

	// Deterministic path: pending tasks → call list_tasks (don't rely on the model).
	if (dataIntent === "list_tasks" && canListTasks) {
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

	const systemInstruction = `You are CAALM Assistant, an in-app helper for contracts, licenses, audits, analytics, calendar, and tasks.

Rules:
- Write in plain, natural language for end users. Never show raw enums, snake_case, JSON, code paths, or API field names (say "Not started", not "not_started"; say "the Tasks page", not "/team/tasks").
- For live data (tasks, contracts, licenses, approvals, expirations), ALWAYS call the matching tool. Never answer those from Knowledge Context alone.
- Knowledge Context is for product how-to only. Do not use Analytics, Reports, or Audit sources as a substitute for listing tasks.
- Never invent permissions or claim an action succeeded unless a tool returned success.
- After a tool returns data, summarize the rows clearly (titles, status, due dates). Never reply with only "Done."
- Only call navigate when the user asks to open or go to a page.
- Refuse legal, billing dispute, and security incident advice; suggest contacting an admin.
- Keep answers concise and actionable.

Knowledge Context (product help only):
${isLiveDataIntent(dataIntent) ? "Skipped for this live-data question." : contextText || "No specific docs matched."}

Current page path: ${pathname ?? "unknown"}
User permissions include: ${ctx.permissions.slice(0, 40).join(", ")}${ctx.permissions.length > 40 ? "…" : ""}`;

	const forceTool =
		dataIntent === "list_pending_approvals" ||
		dataIntent === "search_contracts" ||
		dataIntent === "search_licenses" ||
		dataIntent === "expiring";

	const genAI = new GoogleGenerativeAI(apiKey);
	const model = genAI.getGenerativeModel({
		model: "gemini-2.5-flash-lite",
		systemInstruction,
		tools: declarations.length
			? [{ functionDeclarations: declarations }]
			: undefined,
		toolConfig: {
			functionCallingConfig: {
				mode: forceTool ? FunctionCallingMode.ANY : FunctionCallingMode.AUTO,
			},
		},
	});

	const history = messages.slice(-12).map((m) => ({
		role: m.role === "assistant" ? "model" : "user",
		parts: [{ text: m.content }],
	}));

	const chat = model.startChat({ history });
	const result = await chat.sendMessage(userMessage);
	const response = result.response;

	const functionCalls = response.functionCalls();
	if (functionCalls?.length) {
		const call = functionCalls[0];
		const tool = allowedTools.find((t) => t.name === call.name);
		if (!tool) {
			return {
				answer: "I cannot run that action with your current permissions.",
				sources,
				suggestions: suggestionsForTurn({ dataIntent }),
			};
		}

		const args = (call.args ?? {}) as Record<string, unknown>;

		if (tool.mutating) {
			const label =
				tool.name === "create_task"
					? `Create task “${args.title ?? "Untitled"}”`
					: tool.name === "generate_report"
						? `Generate report for ${args.department ?? "your department"}`
						: `Confirm ${tool.name}`;
			const preview = JSON.stringify(args, null, 2).slice(0, 500);
			const pending = storePendingAction({
				userId: ctx.user.$id,
				orgId: ctx.orgId,
				toolName: tool.name,
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
					toolName: tool.name,
				},
			};
		}

		const toolResult = await runToolByName(
			{ ...ctx, pathname },
			call.name,
			args,
		);
		const followUp = await chat.sendMessage([
			{
				functionResponse: {
					name: call.name,
					response: { output: toolResult.result ?? toolResult },
				},
			},
		]);
		let text = followUp.response.text()?.trim() ?? "";
		const weakReply = !text || /^done\.?$/i.test(text);
		if (weakReply || DATA_TOOLS.has(call.name)) {
			text = formatGenericDataAnswer(
				call.name,
				toolResult.result ?? toolResult,
			);
		}

		return {
			answer: text || "I ran the request but got an empty reply.",
			sources: sourcesForTool(call.name, ragSources),
			suggestions: suggestionsForTurn({
				toolName: call.name,
				dataIntent,
				taskCount: taskCountFromResult(toolResult.result),
			}),
			clientAction: toolResult.clientAction,
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

	return {
		answer: response.text() || "I could not generate a response.",
		sources: ragSources,
		suggestions: suggestionsForTurn({ dataIntent }),
	};
}
