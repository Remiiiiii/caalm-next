import { describe, expect, it } from "vitest";
import {
	eventText,
	initialAgentState,
	MAX_ACTIVITY_LINES,
	reduceAgentEvent,
} from "./agent-events";

const ev = (type: string, data: unknown) => ({ type, data });

describe("reduceAgentEvent", () => {
	it("maps run statuses to phases and ignores unknown ones", () => {
		const running = reduceAgentEvent(
			initialAgentState,
			ev("status", { status: "RUNNING" }),
		);
		expect(running.phase).toBe("working");
		expect(
			reduceAgentEvent(running, ev("status", { status: "FINISHED" })).phase,
		).toBe("idle");
		expect(
			reduceAgentEvent(running, ev("status", { status: "ERROR" })).phase,
		).toBe("error");
		expect(reduceAgentEvent(running, ev("status", { status: "???" }))).toBe(
			running,
		);
	});

	it("reads assistant text blocks and merges consecutive chunks", () => {
		let state = reduceAgentEvent(
			initialAgentState,
			ev("assistant", {
				message: {
					content: [
						{ type: "text", text: "Looking " },
						{ type: "tool_use", name: "read_file" },
					],
				},
			}),
		);
		state = reduceAgentEvent(state, ev("assistant", { text: "at the code" }));
		expect(state.activity).toHaveLength(1);
		expect(state.activity[0].text).toBe("Looking at the code");
	});

	it("updates a tool line when its call finishes instead of adding another", () => {
		let state = reduceAgentEvent(
			initialAgentState,
			ev("tool_call", {
				call_id: "c1",
				name: "read_file",
				status: "running",
				args: { path: "src/a.ts" },
			}),
		);
		expect(state.activity[0]).toMatchObject({
			kind: "tool",
			text: "read_file: src/a.ts",
			failed: false,
		});
		state = reduceAgentEvent(
			state,
			ev("tool_call", { call_id: "c1", name: "read_file", status: "error" }),
		);
		expect(state.activity).toHaveLength(1);
		expect(state.activity[0].failed).toBe(true);
	});

	it("fills in a tool's target when its arguments arrive on a later event", () => {
		let state = reduceAgentEvent(
			initialAgentState,
			ev("tool_call", { callId: "c9", name: "grep_search", status: "running" }),
		);
		expect(state.activity[0].text).toBe("grep_search");
		state = reduceAgentEvent(
			state,
			ev("tool_call", {
				callId: "c9",
				name: "grep_search",
				status: "running",
				args: { pattern: "TKT-2026-0003" },
			}),
		);
		expect(state.activity).toHaveLength(1);
		expect(state.activity[0].text).toBe("grep_search: TKT-2026-0003");
	});

	it("shows shell output from interaction updates and ignores other updates", () => {
		let state = reduceAgentEvent(
			initialAgentState,
			ev("interaction_update", {
				type: "shell-output-delta",
				event: { text: "tests passed" },
			}),
		);
		expect(state.activity[0]).toMatchObject({
			kind: "output",
			text: "tests passed",
		});
		const before = state;
		state = reduceAgentEvent(
			state,
			ev("interaction_update", { type: "token-delta" }),
		);
		expect(state).toBe(before);
	});

	it("records the result, errors and the end of the stream", () => {
		let state = reduceAgentEvent(
			initialAgentState,
			ev("result", { text: "Opened a PR" }),
		);
		expect(state.result).toBe("Opened a PR");
		expect(state.phase).toBe("idle");
		state = reduceAgentEvent(state, ev("error", { message: "boom" }));
		expect(state.phase).toBe("error");
		expect(state.activity.at(-1)).toMatchObject({
			kind: "error",
			text: "boom",
		});
		state = reduceAgentEvent(state, ev("done", {}));
		expect(state.finished).toBe(true);
		expect(state.phase).toBe("error");
	});

	it("keeps the closing message in the result, not the activity feed", () => {
		let state = reduceAgentEvent(
			initialAgentState,
			ev("assistant", { text: "Let me look at the route." }),
		);
		state = reduceAgentEvent(
			state,
			ev("tool_call", { call_id: "c1", name: "read", args: { path: "a.ts" } }),
		);
		state = reduceAgentEvent(state, ev("assistant", { text: "All fixed." }));
		state = reduceAgentEvent(state, ev("result", { text: "All fixed." }));
		expect(state.result).toBe("All fixed.");
		expect(state.activity.map((line) => line.kind)).toEqual([
			"assistant",
			"tool",
		]);
	});

	it("uses the closing message as the result when no result event comes", () => {
		let state = reduceAgentEvent(
			initialAgentState,
			ev("assistant", { text: "Done: fixed the route." }),
		);
		state = reduceAgentEvent(state, ev("done", {}));
		expect(state.result).toBe("Done: fixed the route.");
		expect(state.activity).toHaveLength(0);
	});

	it("ignores heartbeats", () => {
		expect(reduceAgentEvent(initialAgentState, ev("heartbeat", {}))).toBe(
			initialAgentState,
		);
	});

	it("caps the feed length", () => {
		let state = initialAgentState;
		for (let i = 0; i < MAX_ACTIVITY_LINES + 10; i += 1) {
			state = reduceAgentEvent(
				state,
				ev("tool_call", { call_id: `c${i}`, name: `t${i}` }),
			);
		}
		expect(state.activity).toHaveLength(MAX_ACTIVITY_LINES);
	});
});

describe("eventText", () => {
	it("reads strings, text keys and content blocks", () => {
		expect(eventText("hi")).toBe("hi");
		expect(eventText({ content: "c" })).toBe("c");
		expect(eventText({ content: [{ type: "text", text: "b" }] })).toBe("b");
		expect(eventText(null)).toBe("");
	});
});
