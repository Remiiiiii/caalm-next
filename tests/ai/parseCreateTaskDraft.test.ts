import { describe, expect, it } from "vitest";
import { detectDataIntent } from "@/lib/assistant/intent";
import {
	parseCreateTaskDraft,
	parseDueDateFromText,
	parseTaskTitleFromText,
} from "@/lib/assistant/parseCreateTaskDraft";

describe("detectDataIntent create_task", () => {
	it("detects create-task requests", () => {
		expect(detectDataIntent("Help me create a new task")).toBe("create_task");
		expect(detectDataIntent("Create a task for renewing Acme")).toBe(
			"create_task",
		);
		expect(detectDataIntent("Add a new todo")).toBe("create_task");
	});

	it("does not steal list or complete intents", () => {
		expect(detectDataIntent("Show my pending tasks")).toBe("list_tasks");
		expect(detectDataIntent("Mark the budget task done")).toBe("complete_task");
	});
});

describe("parseCreateTaskDraft", () => {
	const now = new Date(2026, 9, 16); // Oct 16, 2026

	it("opens an empty draft when the user only asks to create", () => {
		const draft = parseCreateTaskDraft("Help me create a new task", now);
		expect(draft.title).toBe("");
		expect(draft.priority).toBe("medium");
		expect(draft.dueDate).toBeUndefined();
	});

	it("parses title, due, and priority from one sentence", () => {
		const draft = parseCreateTaskDraft(
			"Create a task renew Acme license tomorrow high priority",
			now,
		);
		expect(draft.title.toLowerCase()).toContain("renew");
		expect(draft.dueDate).toBe("2026-10-17");
		expect(draft.priority).toBe("high");
	});

	it("parses relative due dates", () => {
		expect(parseDueDateFromText("due today", now)).toBe("2026-10-16");
		expect(parseDueDateFromText("due tomorrow", now)).toBe("2026-10-17");
		expect(parseDueDateFromText("next week", now)).toBe("2026-10-23");
	});

	it("leaves title blank for vague create prompts", () => {
		expect(parseTaskTitleFromText("create a task")).toBe("");
		expect(parseTaskTitleFromText("Help me create a new task")).toBe("");
	});
});
