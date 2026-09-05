import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCatalogLinkedPrNumbers } from "./catalog";
import {
	clearOverviewCacheForTests,
	completeSectionFromMerge,
	getOverview,
	recordCiTestResult,
	recordPassingRecheck,
	rejectForcedComplete,
} from "./service";
import { resetRoadmapMemoryForTests } from "./store";

const fetchPullRequestStatus = vi.fn();
const listOpenPullRequests = vi.fn(async () => []);
const fetchRoadmapCompletionGate = vi.fn();

vi.mock("./github", () => ({
	fetchPullRequestStatus: (args: { prNumber: number }) =>
		fetchPullRequestStatus(args),
	listOpenPullRequests: () => listOpenPullRequests(),
	fetchRoadmapCompletionGate: (args: { commitSha: string }) =>
		fetchRoadmapCompletionGate(args),
	postPullRequestComment: vi.fn(async () => ({
		posted: false,
		detail: "skip",
	})),
}));

function unknownPr(prNumber: number) {
	return { state: "unknown" as const, number: prNumber };
}

function mergedPr(prNumber: number, sha: string) {
	return {
		state: "merged" as const,
		number: prNumber,
		title: `PR #${prNumber}`,
		htmlUrl: `https://github.com/Remiiiiii/caalm-next/pull/${prNumber}`,
		mergeCommitSha: sha,
	};
}

function greenGate() {
	return {
		ok: true as const,
		playwrightPushPassed: true,
		deployProductionPassed: true,
	};
}

function redGate(reason: string) {
	return {
		ok: false as const,
		reason,
		playwrightPushPassed: false,
		deployProductionPassed: false,
	};
}

describe("roadmap service", () => {
	beforeEach(() => {
		resetRoadmapMemoryForTests();
		clearOverviewCacheForTests();
		fetchPullRequestStatus.mockReset();
		fetchPullRequestStatus.mockImplementation(async ({ prNumber }) =>
			unknownPr(prNumber),
		);
		listOpenPullRequests.mockReset();
		listOpenPullRequests.mockResolvedValue([]);
		fetchRoadmapCompletionGate.mockReset();
		fetchRoadmapCompletionGate.mockResolvedValue(greenGate());
	});

	it("seeds section 0 available with tasks locked and overall progress at 0", async () => {
		fetchPullRequestStatus.mockImplementation(async ({ prNumber }) => ({
			state: "open" as const,
			number: prNumber,
			title: `Catalog PR ${prNumber}`,
		}));
		const overview = await getOverview();
		expect(overview.overallProgressPercent).toBe(0);
		const s0 = overview.sections.find((s) => s.sectionNumber === 0);
		expect(s0?.status).toBe("available");
		expect(s0?.taskCounts.available).toBe(0);
		expect(s0?.taskCounts.locked).toBeGreaterThanOrEqual(1);
		const s1 = overview.sections.find((s) => s.sectionNumber === 1);
		expect(s1?.status).toBe("locked");
	});

	it("rejects forced complete with 403", async () => {
		await expect(rejectForcedComplete()).rejects.toMatchObject({
			status: 403,
		});
	});

	it("records a failing CI run without completing the section", async () => {
		const failed = await recordCiTestResult({
			prNumber: 49,
			commitSha: "abc111",
			result: "failed",
			logsUrl: "https://ci.example/1",
			summary: "2 failed",
		});
		expect(failed.clearedToMerge).toBe(false);

		const overview = await getOverview();
		const s0 = overview.sections.find((s) => s.sectionNumber === 0)!;
		expect(s0.taskCounts.complete).toBe(0);
	});

	it("completes every section 0 task after PR 49 merges with a green run", async () => {
		const { getSectionTaskTree } = await import("./service");
		const overview = await getOverview();
		const s0 = overview.sections.find((s) => s.sectionNumber === 0)!;
		const tree = await getSectionTaskTree(s0.id);
		expect(tree.tasks[0]?.status).toBe("locked");

		const mergeSha = "deadbeef01";
		await recordCiTestResult({
			prNumber: 49,
			commitSha: mergeSha,
			result: "passed",
			logsUrl: "https://ci.example/49",
			summary: "all green",
		});
		await recordPassingRecheck({
			taskId: tree.tasks[0]!.$id,
			prNumber: 49,
			commitSha: mergeSha,
		});

		const merged = await completeSectionFromMerge({
			prNumber: 49,
			mergeCommitSha: mergeSha,
			baseBranch: "main",
		});
		expect(merged.completed).toBe(true);
		expect(merged.sectionNumber).toBe(0);
		expect(merged.tasks.every((t) => t.status === "complete")).toBe(true);

		const after = await getSectionTaskTree(s0.id);
		expect(after.tasks.every((t) => t.status === "complete")).toBe(true);

		const nextOverview = await getOverview();
		const s1 = nextOverview.sections.find((s) => s.sectionNumber === 1)!;
		expect(s1.status).toBe("available");
		expect(s1.taskCounts.complete).toBe(0);
	});

	it("refuses section completion when no passing run exists for the merge sha", async () => {
		const merged = await completeSectionFromMerge({
			prNumber: 49,
			mergeCommitSha: "newmerge",
			baseBranch: "main",
		});
		expect(merged.completed).toBe(false);
		expect(merged.reason).toMatch(/no passing test run/i);

		const overview = await getOverview();
		const s0 = overview.sections.find((s) => s.sectionNumber === 0)!;
		expect(s0.taskCounts.complete).toBe(0);
	});

	it("completes a multi-PR section task-by-task as each catalog PR merges", async () => {
		const { getSectionTaskTree } = await import("./service");
		await recordCiTestResult({
			prNumber: 49,
			commitSha: "sha49",
			result: "passed",
			logsUrl: "https://ci.example/49",
			summary: "ok",
		});
		await completeSectionFromMerge({
			prNumber: 49,
			mergeCommitSha: "sha49",
			baseBranch: "main",
		});

		const section1Prs = getCatalogLinkedPrNumbers(1);
		expect(section1Prs.length).toBeGreaterThan(1);
		const [first, ...rest] = section1Prs;
		const last = rest[rest.length - 1]!;

		await recordCiTestResult({
			prNumber: first!,
			commitSha: `sha${first}`,
			result: "passed",
			logsUrl: `https://ci.example/${first}`,
			summary: "ok",
		});

		const firstMerge = await completeSectionFromMerge({
			prNumber: first!,
			mergeCommitSha: `sha${first}`,
			baseBranch: "main",
		});
		expect(firstMerge.completed).toBe(false);
		expect(firstMerge.tasks.filter((t) => t.status === "complete").length).toBe(1);

		const s1 = (await getOverview()).sections.find((s) => s.sectionNumber === 1)!;
		expect(s1.progressPercent).toBeGreaterThan(0);
		expect(s1.progressPercent).toBeLessThan(100);

		const shaByPr = new Map<number, string>();
		for (const n of section1Prs) {
			shaByPr.set(n, `sha${n}`);
		}
		fetchPullRequestStatus.mockImplementation(async ({ prNumber }) => {
			if (section1Prs.includes(prNumber) && prNumber !== last) {
				return mergedPr(prNumber, shaByPr.get(prNumber)!);
			}
			return unknownPr(prNumber);
		});

		for (const n of rest.slice(0, -1)) {
			await recordCiTestResult({
				prNumber: n,
				commitSha: shaByPr.get(n)!,
				result: "passed",
				logsUrl: `https://ci.example/${n}`,
				summary: "ok",
			});
			await completeSectionFromMerge({
				prNumber: n,
				mergeCommitSha: shaByPr.get(n)!,
				baseBranch: "main",
			});
		}
		await recordCiTestResult({
			prNumber: last,
			commitSha: shaByPr.get(last)!,
			result: "passed",
			logsUrl: `https://ci.example/${last}`,
			summary: "ok",
		});

		const lastMerge = await completeSectionFromMerge({
			prNumber: last,
			mergeCommitSha: shaByPr.get(last)!,
			baseBranch: "main",
		});
		expect(lastMerge.completed).toBe(true);
		expect(lastMerge.sectionNumber).toBe(1);
		expect(lastMerge.tasks.every((t) => t.status === "complete")).toBe(true);
	});

	it("marks 3.1 complete when GitHub shows PR 51 merged", async () => {
		fetchPullRequestStatus.mockImplementation(async ({ prNumber }) => {
			if (prNumber === 51) return mergedPr(51, "sha51");
			return unknownPr(prNumber);
		});

		const overview = await getOverview();
		const s3 = overview.sections.find((s) => s.sectionNumber === 3)!;
		expect(s3.taskCounts.complete).toBe(1);
		expect(s3.taskCounts.total).toBe(5);
		expect(s3.status).not.toBe("complete");

		const { getSectionTaskTree } = await import("./service");
		const tree = await getSectionTaskTree(s3.id);
		const byCode = Object.fromEntries(tree.tasks.map((t) => [t.taskCode, t]));
		expect(byCode["3.1"]?.status).toBe("complete");
		expect(byCode["3.5"]?.status).not.toBe("complete");
	});

	it("does not mark tasks complete from merge alone without required CI checks", async () => {
		fetchRoadmapCompletionGate.mockResolvedValue(
			redGate(
				"Waiting for Tests and Vercel deploy / Deploy to Vercel (production) to pass",
			),
		);
		fetchPullRequestStatus.mockImplementation(async ({ prNumber }) => {
			if (prNumber === 51) return mergedPr(51, "sha51");
			return unknownPr(prNumber);
		});

		const overview = await getOverview();
		const s3 = overview.sections.find((s) => s.sectionNumber === 3)!;
		expect(s3.taskCounts.complete).toBe(0);
	});

	it("refuses section completion when Deploy to Vercel (production) is missing", async () => {
		fetchRoadmapCompletionGate.mockResolvedValue(
			redGate(
				"Waiting for Tests and Vercel deploy / Deploy to Vercel (production) to pass",
			),
		);
		await recordCiTestResult({
			prNumber: 49,
			commitSha: "nodeploy",
			result: "passed",
			logsUrl: "https://ci.example/49",
			summary: "playwright only",
		});

		const merged = await completeSectionFromMerge({
			prNumber: 49,
			mergeCommitSha: "nodeploy",
			baseBranch: "main",
		});
		expect(merged.completed).toBe(false);
		expect(merged.reason).toMatch(/Deploy to Vercel \(production\)/i);

		const overview = await getOverview();
		const s0 = overview.sections.find((s) => s.sectionNumber === 0)!;
		expect(s0.taskCounts.complete).toBe(0);
	});
});
