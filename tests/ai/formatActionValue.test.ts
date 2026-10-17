import { describe, expect, it } from "vitest";
import {
	flattenResultFields,
	formatActionValue,
} from "@/lib/assistant/formatActionValue";
import { formatGenericSuccessSummary } from "@/lib/assistant/actionCompleted";

describe("formatActionValue", () => {
	it("never returns [object Object] for nested objects", () => {
		expect(
			formatActionValue({
				title: "Test task creation",
				priority: "medium",
				status: "not_started",
			}),
		).toBe("Test task creation");
		expect(formatActionValue({ a: 1, b: "two" })).not.toContain(
			"[object Object]",
		);
	});

	it("joins arrays as readable lists", () => {
		expect(formatActionValue(["finance", "review"])).toBe("finance, review");
		expect(formatActionValue([{ title: "A" }, { title: "B" }])).toBe("A, B");
	});
});

describe("flattenResultFields + formatGenericSuccessSummary", () => {
	it("expands nested task objects instead of [object Object]", () => {
		const summary = formatGenericSuccessSummary('Create task "Test"', {
			task: {
				title: "Test task creation",
				priority: "medium",
				status: "not_started",
			},
		});
		expect(summary).not.toContain("[object Object]");
		expect(summary).toContain("Test task creation");
		expect(summary).toContain("Priority");
	});

	it("flattens nested domain objects into field rows", () => {
		const rows = flattenResultFields(
			{
				task: {
					title: "Q4 planning",
					priority: "high",
					$id: "abc",
				},
			},
			new Set(["$id", "id"]),
		);
		expect(rows.some((r) => r.value === "Q4 planning")).toBe(true);
		expect(rows.every((r) => r.value !== "[object Object]")).toBe(true);
	});
});
