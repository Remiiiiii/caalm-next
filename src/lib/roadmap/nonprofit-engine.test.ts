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

	it("opens the project at 1.1 after the in-tree engine section", async () => {
		const seed = buildSeedSnapshot("npo");
		expect(seed.tasks.find((t) => t.taskCode === "0.1")?.status).toBe(
			"complete",
		);
		expect(seed.tasks.find((t) => t.taskCode === "0.2")?.status).toBe(
			"complete",
		);
		expect(seed.tasks.find((t) => t.taskCode === "1.1")?.status).toBe(
			"available",
		);
		expect(seed.tasks.find((t) => t.taskCode === "1.2")?.status).toBe("locked");
		expect(seed.sections[0]?.status).toBe("complete");
		expect(seed.sections[1]?.status).toBe("in_progress");

		const npo = await getOverview({ catalogKey: "npo" });
		expect(npo.sections[0]?.status).toBe("complete");
		expect(npo.sections[0]?.prLinks?.map((pr) => pr.number)).toEqual([86]);
		expect(npo.sections[1]?.prLinks?.map((pr) => pr.number)).toEqual([
			88, 89, 92,
		]);
		expect(npo.sections[2]?.prLinks?.map((pr) => pr.number)).toEqual([90, 93]);
		expect(npo.sections[3]?.prLinks?.map((pr) => pr.number)).toEqual([87, 91]);
		expect(npo.sections[4]?.prLinks?.map((pr) => pr.number)).toEqual([94, 97]);
		expect(npo.sections[5]?.prLinks?.map((pr) => pr.number)).toEqual([95, 100]);
		expect(npo.sections[6]?.prLinks?.map((pr) => pr.number)).toEqual([98, 99]);
		expect(npo.sections[7]?.prLinks?.map((pr) => pr.number)).toEqual([96, 103]);
		expect(npo.sections[8]?.prLinks?.map((pr) => pr.number)).toEqual([
			104, 102,
		]);
		expect(npo.sections[9]?.prLinks?.map((pr) => pr.number)).toEqual([
			105, 107,
		]);
		expect(npo.sections[10]?.prLinks?.map((pr) => pr.number)).toEqual([
			106, 101,
		]);
		expect(npo.sections[1]?.prLinks?.[0]?.title).toMatch(/S1 B1/);
		expect(npo.sections[1]?.status).toBe("in_progress");
		expect(npo.sections[1]?.title).toBe("Constituent CRM Foundation");
		expect(npo.sections[1]?.nextTaskCode).toBe("1.1");
		expect(npo.sections[1]?.mergeBlockReason).toMatch(/1\.1/);
	});
});
