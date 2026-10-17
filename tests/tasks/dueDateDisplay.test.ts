import { describe, expect, it } from "vitest";
import { getTaskDueDisplay } from "@/lib/tasks/dueDateDisplay";
import { formatTaskDisplayId } from "@/lib/tasks/formatTaskDisplayId";

describe("getTaskDueDisplay", () => {
	const tz = "America/New_York";
	const now = new Date("2026-10-16T16:00:00.000Z");

	it("marks a past date overdue in the org timezone", () => {
		const result = getTaskDueDisplay({
			dueDate: "2026-07-29",
			status: "not_started",
			timeZone: tz,
			now,
		});
		expect(result.tone).toBe("overdue");
		expect(result.showAlert).toBe(true);
		expect(result.relative).toBe("79 days overdue");
	});

	it("says Due today when the org calendar day matches", () => {
		const result = getTaskDueDisplay({
			dueDate: "2026-10-16",
			status: "not_started",
			timeZone: tz,
			now,
		});
		expect(result.tone).toBe("today");
		expect(result.relative).toBe("Due today");
		expect(result.showAlert).toBe(false);
	});

	it("does not treat a completed task as overdue", () => {
		const result = getTaskDueDisplay({
			dueDate: "2026-07-29",
			status: "done",
			timeZone: tz,
			now,
		});
		expect(result.tone).toBe("default");
		expect(result.showAlert).toBe(false);
	});
});

describe("formatTaskDisplayId", () => {
	it("uses trailing digits from the row id", () => {
		expect(formatTaskDisplayId("abc0031")).toBe("TSK-0031");
	});
});
