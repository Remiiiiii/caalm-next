import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearOverviewCacheForTests, getOverview } from "@/lib/roadmap/service";
import {
	buildSeedSnapshot,
	resetRoadmapMemoryForTests,
} from "@/lib/roadmap/store";

vi.mock("@/lib/roadmap/github", () => ({
	fetchPullRequestStatus: async () => ({ state: "unknown" as const, number: 0 }),
	listOpenPullRequests: async () => [],
	fetchRoadmapCompletionGate: async () => ({
		ok: true as const,
		playwrightPushPassed: true,
		deployProductionPassed: true,
	}),
	postPullRequestComment: vi.fn(async () => ({
		posted: false,
		detail: "skip",
	})),
}));

describe("platform readiness roadmap engine", () => {
	beforeEach(() => {
		resetRoadmapMemoryForTests();
		clearOverviewCacheForTests();
	});

	it("seeds prd_ ids separate from clm and npo", () => {
		const prd = buildSeedSnapshot("prd");
		expect(prd.sections[0]?.$id).toBe("prd_sec_00");
		expect(prd.tasks[0]?.$id.startsWith("prd_task_")).toBe(true);
		const clm = buildSeedSnapshot("clm");
		expect(clm.sections.some((s) => s.$id === prd.sections[0]?.$id)).toBe(
			false,
		);
	});

	it("returns seven PRD sections on overview", async () => {
		const overview = await getOverview({ catalogKey: "prd" });
		expect(overview.sections).toHaveLength(7);
		expect(overview.sections[0]?.title).toBe(
			"Platform Readiness Roadmap Engine",
		);
		expect(overview.sections.every((s) => s.id.startsWith("prd_"))).toBe(true);
	});

	it("does not mix PRD into CLM overview", async () => {
		const clm = await getOverview({ catalogKey: "clm" });
		expect(clm.sections.some((s) => s.id.startsWith("prd_"))).toBe(false);
	});
});
