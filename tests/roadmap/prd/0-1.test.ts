import { describe, expect, it } from "vitest";
import { PLATFORM_READINESS_ROADMAP_CATALOG } from "@/lib/roadmap/platform-readiness-catalog";

describe("PRD 0.1 third catalog", () => {
	const task = PLATFORM_READINESS_ROADMAP_CATALOG[0]?.tasks.find(
		(t) => t.taskCode === "0.1",
	);

	it("catalog task documents the prd catalog key", () => {
		expect(task?.title).toMatch(/Third catalog/i);
		expect(task?.description).toMatch(/catalog=prd/);
	});
});
