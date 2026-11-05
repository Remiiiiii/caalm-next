import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearOverviewCacheForTests, getOverview } from "@/lib/roadmap/service";
import {
	buildSeedSnapshot,
	resetRoadmapMemoryForTests,
} from "@/lib/roadmap/store";

vi.mock("@/lib/roadmap/github", () => ({
	fetchPullRequestStatus: async ({ prNumber }: { prNumber: number }) => ({
		state: "unknown" as const,
		number: prNumber,
	}),
	listOpenPullRequests: async () => [],
	fetchRoadmapCompletionGate: async () => ({
		ok: true as const,
		playwrightPushPassed: true,
		deployProductionPassed: true,
	}),
	postPullRequestComment: vi.fn(async () => ({ posted: false, detail: "skip" })),
}));

describe("production tools roadmap engine", () => {
	beforeEach(() => {
		resetRoadmapMemoryForTests();
		clearOverviewCacheForTests();
	});

	it("seeds pto_ ids separate from clm and prd", () => {
		const pto = buildSeedSnapshot("pto");
		expect(pto.sections[0]?.$id).toBe("pto_sec_00");
		expect(pto.tasks[0]?.$id.startsWith("pto_task_")).toBe(true);
		const clm = buildSeedSnapshot("clm");
		expect(clm.sections.some((s) => s.$id === pto.sections[0]?.$id)).toBe(
			false,
		);
	});

	it("returns 16 PTO sections (engine + A–O) on overview", async () => {
		const overview = await getOverview({ catalogKey: "pto" });
		expect(overview.sections).toHaveLength(16);
		expect(overview.sections[0]?.title).toBe(
			"Production Tools Roadmap Engine",
		);
		expect(overview.sections.every((s) => s.id.startsWith("pto_"))).toBe(true);
	});

	it("marks the engine section complete (seedComplete)", async () => {
		const overview = await getOverview({ catalogKey: "pto" });
		const engine = overview.sections.find((s) => s.sectionNumber === 0);
		expect(engine?.status).toBe("complete");
		expect(engine?.progressPercent).toBe(100);
	});

	it("does not mix PTO into the CLM overview", async () => {
		const clm = await getOverview({ catalogKey: "clm" });
		expect(clm.sections.some((s) => s.id.startsWith("pto_"))).toBe(false);
	});
});
