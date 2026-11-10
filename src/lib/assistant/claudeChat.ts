import Anthropic from "@anthropic-ai/sdk";
import type { ToolDefinition } from "@/lib/assistant/tools/types";

export type ClaudeChatMessage = {
	role: "user" | "assistant";
	content: string;
};

export type ClaudeToolCall = {
	id: string;
	name: string;
	args: Record<string, unknown>;
};

export type ClaudeTurnResult = {
	text: string;
	toolCall: ClaudeToolCall | null;
	/** Full assistant content blocks — needed for tool_result follow-up. */
	assistantContent: Anthropic.ContentBlock[];
};

/** Current Sonnet on the Claude API (4.5 ids are deprecated / 404). */
const DEFAULT_MODEL = "claude-sonnet-5-5";

const RETIRED_SONNET_MODELS = new Set([
	"claude-sonnet-4-5",
	"claude-sonnet-4-5-20250929",
	"claude-sonnet-4-20250514",
]);

function claudeModel(): string {
	const configured = process.env.CLAUDE_SONNET_MODEL?.trim();
	if (!configured || RETIRED_SONNET_MODELS.has(configured)) {
		return DEFAULT_MODEL;
	}
	return configured;
}

function getClient(): Anthropic {
	const apiKey = process.env.CLAUDE_API_KEY;
	if (!apiKey) {
		throw new Error("CLAUDE_API_KEY is not configured");
	}
	return new Anthropic({ apiKey });
}

/** Anthropic history: drop current user turn, keep last 12, merge same-role. */
export function buildClaudeChatHistory(
	messages: ClaudeChatMessage[],
	userMessage: string,
): Anthropic.MessageParam[] {
	let prior = [...messages];
	const last = prior[prior.length - 1];
	if (last?.role === "user" && last.content === userMessage) {
		prior = prior.slice(0, -1);
	}

	prior = prior.slice(-12);
	while (prior.length > 0 && prior[0]!.role === "assistant") {
		prior = prior.slice(1);
	}

	const merged: ClaudeChatMessage[] = [];
	for (const m of prior) {
		const content = m.content?.trim();
		if (!content) continue;
		const prev = merged[merged.length - 1];
		if (prev && prev.role === m.role) {
			prev.content = `${prev.content}\n\n${content}`;
		} else {
			merged.push({ role: m.role, content });
		}
	}

	return merged.map((m) => ({
		role: m.role,
		content: m.content,
	}));
}

function mapJsonSchemaType(
	type: string | undefined,
): "string" | "number" | "boolean" | "object" | "array" {
	switch (type) {
		case "number":
			return "number";
		case "boolean":
			return "boolean";
		case "object":
			return "object";
		case "array":
			return "array";
		default:
			return "string";
	}
}

/** Convert CAALM tool defs (+ optional request_input) into Anthropic tools. */
export function buildClaudeTools(
	tools: ToolDefinition[],
	includeRequestInput: boolean,
): Anthropic.Tool[] {
	const mapped: Anthropic.Tool[] = tools.map((tool) => {
		const props = (tool.parameters.properties ?? {}) as Record<
			string,
			{ type?: string; description?: string; enum?: string[] }
		>;
		const properties: Record<string, Record<string, unknown>> = {};
		for (const [key, val] of Object.entries(props)) {
			properties[key] = {
				type: mapJsonSchemaType(val.type),
				description: val.description,
				...(val.enum ? { enum: val.enum } : {}),
			};
		}
		return {
			name: tool.name,
			description: tool.description,
			input_schema: {
				type: "object" as const,
				properties,
				required: (tool.parameters.required as string[]) ?? [],
			},
		};
	});

	if (includeRequestInput) {
		mapped.push({
			name: "request_input",
			description:
				'Show the user a structured form to fill in instead of asking in free text. Call this whenever you need multiple fields from the user (e.g. scheduling details). Pass fields_json as a JSON array of {name,label,type,placeholder?,required?,options?} objects. Field types: text, date, time, select, textarea. For select fields, options must be an array of strings (e.g. ["meeting","review"]), never objects.',
			input_schema: {
				type: "object" as const,
				properties: {
					intent: {
						type: "string",
						description:
							"Short key for what is being collected, e.g. schedule_event",
					},
					intro: {
						type: "string",
						description: "Brief message shown above the form",
					},
					fields_json: {
						type: "string",
						description: "JSON array of field objects",
					},
				},
				required: ["intent", "intro", "fields_json"],
			},
		});
	}

	return mapped;
}

function parseTurn(response: Anthropic.Message): ClaudeTurnResult {
	const assistantContent = response.content;
	let text = "";
	let toolCall: ClaudeToolCall | null = null;

	for (const block of assistantContent) {
		if (block.type === "text") {
			text += block.text;
		} else if (block.type === "tool_use" && !toolCall) {
			toolCall = {
				id: block.id,
				name: block.name,
				args:
					block.input && typeof block.input === "object"
						? (block.input as Record<string, unknown>)
						: {},
			};
		}
	}

	return {
		text: text.trim(),
		toolCall,
		assistantContent,
	};
}

export async function callClaudeAssistantTurn(params: {
	systemInstruction: string;
	messages: ClaudeChatMessage[];
	userMessage: string;
	tools: Anthropic.Tool[];
	forceTool: boolean;
}): Promise<ClaudeTurnResult> {
	const client = getClient();
	const history = buildClaudeChatHistory(params.messages, params.userMessage);
	// Sonnet 5.5 rejects tool_choice "any" / "tool" — use auto and nudge in the prompt.
	const system = params.forceTool
		? `${params.systemInstruction}\n\nFor this request you must call exactly one of the provided tools. Do not reply with text only.`
		: params.systemInstruction;
	const response = await client.messages.create({
		model: claudeModel(),
		max_tokens: 4096,
		system,
		messages: [...history, { role: "user", content: params.userMessage }],
		tools: params.tools.length ? params.tools : undefined,
		tool_choice: params.tools.length ? { type: "auto" } : undefined,
	});
	return parseTurn(response);
}

export async function callClaudeToolFollowUp(params: {
	systemInstruction: string;
	messages: ClaudeChatMessage[];
	userMessage: string;
	assistantContent: Anthropic.ContentBlock[];
	toolCallId: string;
	toolResult: unknown;
	tools: Anthropic.Tool[];
}): Promise<string> {
	const client = getClient();
	const history = buildClaudeChatHistory(params.messages, params.userMessage);
	const toolPayload =
		typeof params.toolResult === "string"
			? params.toolResult
			: JSON.stringify(params.toolResult ?? {});

	const response = await client.messages.create({
		model: claudeModel(),
		max_tokens: 4096,
		system: params.systemInstruction,
		messages: [
			...history,
			{ role: "user", content: params.userMessage },
			{ role: "assistant", content: params.assistantContent },
			{
				role: "user",
				content: [
					{
						type: "tool_result",
						tool_use_id: params.toolCallId,
						content: toolPayload,
					},
				],
			},
		],
		tools: params.tools.length ? params.tools : undefined,
	});

	return parseTurn(response).text;
}
