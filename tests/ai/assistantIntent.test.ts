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
});
