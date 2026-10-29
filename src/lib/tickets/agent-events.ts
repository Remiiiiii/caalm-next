/**
 * Folds the Cursor Cloud Agents run stream (server-sent events) into the
 * activity feed shown on the ticket page. The SDK docs describe the event
 * shapes (assistant message.content blocks, tool_call with call_id / status,
 * interaction_update with shell-output-delta) but warn that tool payloads are
 * not stable, so parsing is tolerant and anything unrecognised is ignored.
 */

export type AgentPhase = "starting" | "working" | "idle" | "error";

export type ActivityKind =
	| "assistant"
	| "thinking"
	| "tool"
	| "output"
	| "error";

export type ActivityLine = {
	id: number;
	kind: ActivityKind;
	text: string;
	/** Tool calls arrive twice (start, finish); the id lets the second update the first. */
	callId?: string;
	failed?: boolean;
};

export type AgentState = {
	phase: AgentPhase;
	detail: string;
	activity: ActivityLine[];
	/** The agent's final reply, once the run finishes. */
	result: string;
	finished: boolean;
	nextId: number;
};

export type AgentStreamEvent = { type: string; data: unknown };

export const MAX_ACTIVITY_LINES = 300;

export const initialAgentState: AgentState = {
	phase: "starting",
	detail: "",
	activity: [],
	result: "",
	finished: false,
	nextId: 1,
};

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function firstString(record: Record<string, unknown>, keys: string[]): string {
	for (const key of keys) {
		const value = record[key];
		if (typeof value === "string" && value) return value;
	}
	return "";
}

/** Text from a string payload, a `text`-style key, or `message.content` text blocks. */
export function eventText(data: unknown): string {
	if (typeof data === "string") return data;
	const record = asRecord(data);
	if (!record) return "";

	const direct = firstString(record, ["text", "delta", "message", "summary"]);
	if (direct) return direct;

	const message = asRecord(record.message);
	const content = message?.content ?? record.content;
	if (typeof content === "string") return content;
	if (Array.isArray(content)) {
		return content
			.map((block) => {
				const item = asRecord(block);
				return item && item.type !== "tool_use" && typeof item.text === "string"
					? item.text
					: "";
			})
			.join("");
	}
	return "";
}

function toolLabel(data: Record<string, unknown>): string {
	const name = firstString(data, ["name", "tool", "toolName", "title"]);
	const args = asRecord(data.args);
	const target = firstString(args ?? data, [
		"path",
		"targetFile",
		"target_file",
		"relativeWorkspacePath",
		"filePath",
		"command",
		"query",
		"url",
		"pattern",
	]);
	if (name && target) return `${name}: ${target}`;
	return name || target || "Using a tool";
}

function append(
	state: AgentState,
	line: Omit<ActivityLine, "id">,
	mergeWithPrevious = false,
): AgentState {
	if (!line.text) return state;
	const last = state.activity.at(-1);
	if (mergeWithPrevious && last && last.kind === line.kind) {
		const activity = [
			...state.activity.slice(0, -1),
			{ ...last, text: last.text + line.text },
		];
		return { ...state, activity };
	}
	const activity = [...state.activity, { id: state.nextId, ...line }].slice(
		-MAX_ACTIVITY_LINES,
	);
	return { ...state, activity, nextId: state.nextId + 1 };
}

function phaseFromStatus(status: string): AgentPhase | null {
	switch (status.toUpperCase()) {
		case "CREATING":
			return "starting";
		case "RUNNING":
		case "ACTIVE":
		case "WAITING_FOR_BACKGROUND_WORK":
			return "working";
		case "FINISHED":
		case "IDLE":
		case "CANCELLED":
			return "idle";
		case "ERROR":
		case "EXPIRED":
			return "error";
		default:
			return null;
	}
}

/**
 * The agent's closing message arrives as assistant text after its last tool
 * call, then again as the result. It belongs in the result pane only, so this
 * pulls those trailing lines out of the activity feed.
 */
function splitFinalReply(activity: ActivityLine[]): {
	activity: ActivityLine[];
	text: string;
} {
	let start = activity.length;
	while (start > 0 && activity[start - 1].kind === "assistant") start -= 1;
	return {
		activity: activity.slice(0, start),
		text: activity
			.slice(start)
			.map((line) => line.text)
			.join("\n\n"),
	};
}

function reduceToolCall(state: AgentState, data: unknown): AgentState {
	const record = asRecord(data);
	if (!record) return state;
	const callId = firstString(record, ["call_id", "callId", "id"]) || undefined;
	const status = firstString(record, ["status"]).toLowerCase();
	const working = { ...state, phase: "working" as const };

	const existing = callId
		? state.activity.findIndex((line) => line.callId === callId)
		: -1;
	if (existing >= 0) {
		// The finish event updates the line the start event created.
		// Arguments often arrive on a later event than the start, so refresh the label too.
		const activity = [...state.activity];
		activity[existing] = {
			...activity[existing],
			text: record.args ? toolLabel(record) : activity[existing].text,
			failed: status === "error",
		};
		return { ...working, activity };
	}
	return append(working, {
		kind: "tool",
		text: toolLabel(record),
		callId,
		failed: status === "error",
	});
}

export function reduceAgentEvent(
	state: AgentState,
	event: AgentStreamEvent,
): AgentState {
	switch (event.type) {
		case "status": {
			const record = asRecord(event.data);
			const status =
				typeof record?.status === "string"
					? record.status
					: typeof event.data === "string"
						? event.data
						: "";
			const phase = phaseFromStatus(status);
			if (!phase) return state;
			return {
				...state,
				phase,
				detail: status.replaceAll("_", " ").toLowerCase(),
			};
		}
		case "assistant":
			return append(
				{ ...state, phase: "working" },
				{ kind: "assistant", text: eventText(event.data) },
				true,
			);
		case "thinking":
			return append(
				{ ...state, phase: "working" },
				{ kind: "thinking", text: eventText(event.data) },
				true,
			);
		case "tool_call":
			return reduceToolCall(state, event.data);
		case "interaction_update": {
			const record = asRecord(event.data);
			if (record?.type !== "shell-output-delta") return state;
			return append(
				state,
				{ kind: "output", text: eventText(record.event ?? record) },
				true,
			);
		}
		case "result": {
			const reply = splitFinalReply(state.activity);
			const text = eventText(event.data) || reply.text;
			return {
				...state,
				phase: "idle",
				activity: reply.activity,
				result: text || state.result,
			};
		}
		case "error":
			return append(
				{ ...state, phase: "error" },
				{
					kind: "error",
					text: eventText(event.data) || "The agent reported an error",
				},
			);
		case "done": {
			// No result event arrived: the closing message is the result.
			const reply = state.result
				? { activity: state.activity, text: state.result }
				: splitFinalReply(state.activity);
			return {
				...state,
				activity: reply.activity,
				result: reply.text,
				finished: true,
				phase: state.phase === "error" ? "error" : "idle",
			};
		}
		default:
			// heartbeat and unknown events carry nothing to show.
			return state;
	}
}
