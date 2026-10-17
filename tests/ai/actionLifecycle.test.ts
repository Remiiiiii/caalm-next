import { describe, expect, it } from "vitest";
import {
	buildCompletedActionLifecycle,
	buildFailedActionLifecycle,
	buildPendingActionLifecycle,
} from "@/lib/assistant/actionLifecycle";

const actor = {
	userId: "u1",
	name: "Victor Ramirez",
	avatar: "avatar-file-id",
	department: "IT",
	departmentLabel: "IT",
};

describe("buildPendingActionLifecycle", () => {
	it("builds awaiting-confirmation create task fields with assignee", () => {
		const card = buildPendingActionLifecycle(
			{
				id: "p1",
				label: 'Create task "Test task creation"',
				preview: "{}",
				toolName: "create_task",
				args: {
					title: "Test task creation",
					dueDate: "2026-10-20",
					priority: "medium",
				},
			},
			actor,
		);
		expect(card.state).toBe("pending");
		expect(card.actionLabel).toBe("Create task");
		expect(card.entityTitle).toBe("Test task creation");
		expect(card.fields.find((f) => f.label === "Assignee")?.assignee?.avatar).toBe(
			"avatar-file-id",
		);
		expect(card.fields.find((f) => f.label === "Status")?.value).toBe("Open");
		expect(card.footerNote).toBe("Nothing has changed yet.");
	});
});

describe("buildCompletedActionLifecycle", () => {
	it("shows before → after for reschedule", () => {
		const card = buildCompletedActionLifecycle({
			pending: {
				id: "p2",
				label: "Move event",
				preview: "{}",
				toolName: "reschedule_calendar_event",
				args: { eventTitle: "Contract Renewal Review" },
			},
			result: {
				title: "Contract Renewal Review",
				eventId: "evt-6a74f9xxxx",
				date: "2026-08-07",
				startTime: "10:00",
				endTime: "10:30",
				previousDate: "2026-08-06",
				previousStartTime: "09:00",
				previousEndTime: "09:30",
				invitedCount: 2,
			},
			actor,
		});
		expect(card.state).toBe("completed");
		expect(card.actionLabel).toBe("Move event");
		const dateField = card.fields.find((f) => f.label === "Date");
		expect(dateField?.previousValue).toBeTruthy();
		expect(dateField?.value).toBeTruthy();
		expect(dateField?.previousValue).not.toBe(dateField?.value);
		expect(card.fields.find((f) => f.label === "Invitees")?.value).toBe(
			"2 notified",
		);
		expect(card.footerNote).not.toMatch(/CAALM Assistant|AUD-/i);
	});

	it("expands create_task result without [object Object]", () => {
		const card = buildCompletedActionLifecycle({
			pending: {
				id: "p3",
				label: "Create task",
				preview: "{}",
				toolName: "create_task",
				args: { title: "Q4 planning", priority: "medium" },
			},
			result: {
				task: {
					$id: "task0041",
					title: "Q4 planning",
					priority: "medium",
					status: "not_started",
				},
			},
			actor,
		});
		expect(card.state).toBe("completed");
		expect(JSON.stringify(card)).not.toContain("[object Object]");
		expect(card.entityTitle).toBe("Q4 planning");
	});
});

describe("buildFailedActionLifecycle", () => {
	it("marks retry as safe", () => {
		const card = buildFailedActionLifecycle({
			pending: {
				id: "p4",
				label: "Send invite",
				preview: "{}",
				toolName: "create_task",
				args: { title: "Kelly Mohr" },
			},
			errorMessage: "The invite service timed out. Nothing was sent.",
			errorCode: "ERR_TIMEOUT · req_8c21",
			actor,
		});
		expect(card.state).toBe("failed");
		expect(card.retrySafe).toBe(true);
		expect(card.footerNote).toMatch(/Safe to retry/i);
	});
});
