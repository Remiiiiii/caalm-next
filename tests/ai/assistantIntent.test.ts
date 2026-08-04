import { describe, expect, it } from "vitest";
import { detectDataIntent, isLiveDataIntent } from "@/lib/assistant/intent";

describe("detectDataIntent - scheduling", () => {
	it("detects schedule-a-meeting requests", () => {
		expect(detectDataIntent("Schedule a meeting tomorrow at 2pm")).toBe(
			"schedule_event",
		);
		expect(detectDataIntent("Set up a review with Sarah next Tuesday")).toBe(
			"schedule_event",
		);
		expect(detectDataIntent("Book a call for Friday morning")).toBe(
			"schedule_event",
		);
	});

	it("detects schedule viewing requests", () => {
		expect(detectDataIntent("What's on my calendar today?")).toBe(
			"view_schedule",
		);
		expect(detectDataIntent("Show my schedule for Thursday")).toBe(
			"view_schedule",
		);
		expect(detectDataIntent("Am I free tomorrow afternoon?")).toBe(
			"view_schedule",
		);
	});

	it("does not hijack unrelated queries", () => {
		expect(detectDataIntent("Show my pending tasks")).toBe("list_tasks");
		expect(detectDataIntent("Find the Acme contract")).toBe(
			"search_contracts",
		);
		expect(detectDataIntent("Which licenses are expiring soon?")).toBe(
			"expiring",
		);
		expect(detectDataIntent("Hello")).toBeNull();
	});

	it("treats scheduling intents as live data", () => {
		expect(isLiveDataIntent("schedule_event")).toBe(true);
		expect(isLiveDataIntent("view_schedule")).toBe(true);
	});

	it("detects complete-task requests", () => {
		expect(detectDataIntent("Mark the budget task done")).toBe(
			"complete_task",
		);
		expect(detectDataIntent("Complete the onboarding task")).toBe(
			"complete_task",
		);
		expect(detectDataIntent("Check off the review task")).toBe(
			"complete_task",
		);
		// "my" must not shadow complete_task with list_tasks
		expect(detectDataIntent("Complete my onboarding task")).toBe(
			"complete_task",
		);
		expect(detectDataIntent("Mark my task done")).toBe("complete_task");
	});

	it("detects audit viewing requests", () => {
		expect(detectDataIntent("Show recent activity")).toBe("view_audit");
		expect(detectDataIntent("View the audit log")).toBe("view_audit");
		expect(detectDataIntent("Who changed the contract?")).toBe("view_audit");
	});

	it("detects expiration briefs", () => {
		expect(detectDataIntent("What contracts are expiring soon?")).toBe(
			"expiring",
		);
		expect(detectDataIntent("Which licenses are up for renewal?")).toBe(
			"expiring",
		);
	});

	it("treats new intents as live data", () => {
		expect(isLiveDataIntent("complete_task")).toBe(true);
		expect(isLiveDataIntent("view_audit")).toBe(true);
		expect(isLiveDataIntent("expiring")).toBe(true);
	});
});
