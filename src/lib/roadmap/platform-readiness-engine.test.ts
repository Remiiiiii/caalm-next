import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearOverviewCacheForTests, getOverview } from "@/lib/roadmap/service";
import {
	buildSeedSnapshot,
	resetRoadmapMemoryForTests,
} from "@/lib/roadmap/store";

const fetchPullRequestStatus = vi.fn();
const fetchRoadmapCompletionGate = vi.fn();

vi.mock("@/lib/roadmap/github", () => ({
	fetchPullRequestStatus: (args: { prNumber: number }) =>
		fetchPullRequestStatus(args),
	listOpenPullRequests: async () => [],
	fetchRoadmapCompletionGate: (args: { commitSha: string }) =>
		fetchRoadmapCompletionGate(args),
	postPullRequestComment: vi.fn(async () => ({
		posted: false,
		detail: "skip",
	})),
}));

describe("platform readiness roadmap engine", () => {
	beforeEach(() => {
		resetRoadmapMemoryForTests();
		clearOverviewCacheForTests();
		fetchPullRequestStatus.mockReset();
		fetchPullRequestStatus.mockImplementation(async ({ prNumber }) => ({
			state: "unknown" as const,
			number: prNumber,
		}));
		fetchRoadmapCompletionGate.mockReset();
		fetchRoadmapCompletionGate.mockResolvedValue({
			ok: true as const,
			playwrightPushPassed: true,
			deployProductionPassed: true,
		});
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

	it("finds PRD tasks by linked batch PR number", async () => {
		const { getTasksByPrNumber } = await import("@/lib/roadmap/store");
		const tasks = await getTasksByPrNumber(180);
		expect(tasks.some((t) => t.$id.startsWith("prd_task_1_"))).toBe(true);
		expect(tasks.map((t) => t.taskCode).sort()).toEqual([
			"1.1",
			"1.2",
			"1.3",
			"1.4",
		]);
	});

	it("completes section 1 tasks when batch PR 180 is merged with green CI", async () => {
		fetchPullRequestStatus.mockImplementation(async ({ prNumber }) => {
			if (prNumber === 179 || prNumber === 180) {
				return {
					state: "merged" as const,
					number: prNumber,
					title: `PR #${prNumber}`,
					htmlUrl: `https://github.com/example/pull/${prNumber}`,
					mergeCommitSha: `sha${prNumber}`,
				};
			}
			return { state: "unknown" as const, number: prNumber };
		});

		const overview = await getOverview({
			catalogKey: "prd",
			skipCache: true,
		});
		const s1 = overview.sections.find((s) => s.sectionNumber === 1);
		expect(s1?.progressPercent).toBe(100);
		expect(s1?.taskCounts.complete).toBe(4);
		expect(s1?.status).toBe("complete");
	});

	it("does not mix PRD into CLM overview", async () => {
		const clm = await getOverview({ catalogKey: "clm" });
		expect(clm.sections.some((s) => s.id.startsWith("prd_"))).toBe(false);
	});
});
