import { describe, expect, it } from "vitest";
import {
	buildActivityFeed,
	classifyKind,
	formatWhenMeta,
} from "@/lib/assistant/activityFeed";

describe("formatWhenMeta", () => {
	it("formats activity timestamp without Due prefix", () => {
		const label = formatWhenMeta(new Date(2026, 7, 6));
		expect(label).toBe("Aug 6, 2026");
		expect(label.startsWith("Due")).toBe(false);
	});
});

describe("classifyKind", () => {
	it("uses target_type calendar_event for schedule", () => {
		expect(
			classifyKind({
				title: "Something happened",
				targetType: "calendar_event",
			}),
		).toBe("schedule");
	});

	it("detects assistant feedback from title", () => {
		expect(
			classifyKind({
				title: "Assistant feedback: up",
				action: "create",
			}),
		).toBe("feedback");
	});

	it("detects tasks from target_type", () => {
		expect(
			classifyKind({
				title: "Updated item",
				targetType: "task",
			}),
		).toBe("task");
	});
});

describe("buildActivityFeed", () => {
	it("builds day groups without Due labels", () => {
		const feed = buildActivityFeed({
			logs: [
				{
					title: "Assistant scheduled event: Review",
					action: "create",
					user: "Victor",
					when: "2026-08-06T15:00:00.000Z",
					module: "system",
					target_type: "calendar_event",
				},
			],
		});
		expect(feed?.title).toBe("Here's the recent activity");
		expect(feed?.days[0]?.items[0]?.kind).toBe("schedule");
		expect(feed?.days[0]?.items[0]?.whenLabel).not.toMatch(/^Due /);
	});
});
