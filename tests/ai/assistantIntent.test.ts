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
		expect(detectDataIntent("Find the Acme contract")).toBe("search_contracts");
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
		expect(detectDataIntent("Mark the budget task done")).toBe("complete_task");
		expect(detectDataIntent("Complete the onboarding task")).toBe(
			"complete_task",
		);
		expect(detectDataIntent("Check off the review task")).toBe("complete_task");
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

	it("detects reschedule and cancel requests", () => {
		expect(detectDataIntent("Move my 3pm meeting to Friday")).toBe(
			"reschedule_event",
		);
		expect(detectDataIntent("Reschedule the review call")).toBe(
			"reschedule_event",
		);
		expect(detectDataIntent("Change the review from 2pm to 10am")).toBe(
			"reschedule_event",
		);
		expect(detectDataIntent("Cancel my meeting tomorrow")).toBe("cancel_event");
		expect(detectDataIntent("Call off the budget review")).toBe("cancel_event");
	});

	it("treats new intents as live data", () => {
		expect(isLiveDataIntent("complete_task")).toBe(true);
		expect(isLiveDataIntent("view_audit")).toBe(true);
		expect(isLiveDataIntent("expiring")).toBe(true);
	});
});

describe("sanitizeRescheduleArgs - time-only vs date change", () => {
	const thursday = new Date(2026, 7, 6); // Aug 6, 2026 — Thursday

	it("drops newDate when the user only changes the time", async () => {
		const { sanitizeRescheduleArgs } = await import(
			"@/lib/assistant/rescheduleArgs"
		);
		expect(
			sanitizeRescheduleArgs(
				"Change the review from 14:00 to 10:00",
				{
					eventTitle: "Contract Renewal Review",
					newDate: "2026-08-14",
					newStartTime: "10:00",
				},
				thursday,
			),
		).toEqual({
			eventTitle: "Contract Renewal Review",
			newStartTime: "10:00",
		});
		expect(
			sanitizeRescheduleArgs(
				"Move the review to 10am",
				{
					eventTitle: "Review",
					newDate: "2026-08-14",
					newStartTime: "10:00",
				},
				thursday,
			),
		).not.toHaveProperty("newDate");
	});

	it("resolves Friday to the upcoming Friday, not next week", async () => {
		const { sanitizeRescheduleArgs } = await import(
			"@/lib/assistant/rescheduleArgs"
		);
		// Thu Aug 6 → soonest Friday is Aug 7 (not Aug 14)
		expect(
			sanitizeRescheduleArgs(
				"Move my review to Friday at 10am",
				{
					eventTitle: "Review",
					newDate: "2026-08-14",
					newStartTime: "10:00",
				},
				thursday,
			),
		).toEqual({
			eventTitle: "Review",
			newDate: "2026-08-07",
			newStartTime: "10:00",
		});
	});

	it("resolves next Friday to the following week", async () => {
		const { sanitizeRescheduleArgs } = await import(
			"@/lib/assistant/rescheduleArgs"
		);
		expect(
			sanitizeRescheduleArgs(
				"Move the review to next Friday at 10am",
				{
					eventTitle: "Review",
					newDate: "2026-08-07",
					newStartTime: "10:00",
				},
				thursday,
			),
		).toEqual({
			eventTitle: "Review",
			newDate: "2026-08-14",
			newStartTime: "10:00",
		});
	});
});

describe("buildGeminiChatHistory", () => {
	it("drops leading assistant turns so history starts with user", async () => {
		const { buildGeminiChatHistory } = await import(
			"@/lib/assistant/geminiHistory"
		);
		const history = buildGeminiChatHistory(
			[
				{ role: "assistant", content: "Action completed" },
				{ role: "user", content: "Move review to Friday" },
				{ role: "assistant", content: "Prepared move" },
				{ role: "user", content: "Change it back to 2pm" },
			],
			"Change it back to 2pm",
		);
		expect(history[0]?.role).toBe("user");
		expect(history.at(-1)?.role).toBe("model");
		expect(
			history.some((h) => h.parts[0]?.text === "Change it back to 2pm"),
		).toBe(false);
	});
});
