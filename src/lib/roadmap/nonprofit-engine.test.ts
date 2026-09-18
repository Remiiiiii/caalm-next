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
	postPullRequestComment: vi.fn(async () => ({
		posted: false,
		detail: "skip",
	})),
}));

describe("nonprofit roadmap engine", () => {
	beforeEach(() => {
		resetRoadmapMemoryForTests();
		clearOverviewCacheForTests();
	});

	it("seeds NPO ids with npo_ and leaves CLM ids unprefixed", () => {
		const clm = buildSeedSnapshot("clm");
		const npo = buildSeedSnapshot("npo");
		expect(clm.sections[0]?.$id).toBe("sec_00");
		expect(npo.sections[0]?.$id).toBe("npo_sec_00");
		expect(clm.tasks[0]?.$id.startsWith("task_")).toBe(true);
		expect(npo.tasks[0]?.$id.startsWith("npo_task_")).toBe(true);
		const clmIds = new Set(clm.sections.map((s) => s.$id));
		for (const section of npo.sections) {
			expect(clmIds.has(section.$id)).toBe(false);
		}
	});

	it("does not mix NPO sections into the CLM overview", async () => {
		const clm = await getOverview({ catalogKey: "clm" });
		const npo = await getOverview({ catalogKey: "npo" });
		expect(clm.sections[0]?.title).toBe("Roadmap Engine");
		expect(npo.sections[0]?.title).toBe("Nonprofit Roadmap Engine");
		expect(clm.sections).toHaveLength(16);
		expect(npo.sections).toHaveLength(11);
		expect(clm.sections.some((s) => s.id.startsWith("npo_"))).toBe(false);
		expect(npo.sections.every((s) => s.id.startsWith("npo_"))).toBe(true);
	});

	it("unlocks NPO section 0 and keeps section 1 locked", async () => {
		const npo = await getOverview({ catalogKey: "npo" });
		expect(npo.overallProgressPercent).toBe(0);
		expect(npo.sections[0]?.status).toBe("available");
		expect(npo.sections[1]?.status).toBe("locked");
		expect(npo.sections[1]?.title).toBe("Constituent CRM Foundation");
	});
});
