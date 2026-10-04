import { describe, expect, it } from "vitest";
import {
	matchPullRequestToTask,
	resolveCatalogFromPrMatch,
} from "./github-pr-match";

describe("PRD github pr match", () => {
	const pr = {
		number: 9001,
		title: "PRD 1.1 Org filter on view-all contract lists",
		htmlUrl: "https://example.com/pull/9001",
		headRef: "cursor/platform-readiness/1-1.1-org-scope",
		state: "open" as const,
	};

	it("maps branch to PRD section 1 task 1.1", () => {
		expect(matchPullRequestToTask(pr, 1, "1.1", "prd")).toBe(true);
		expect(matchPullRequestToTask(pr, 1, "1.1", "clm")).toBe(false);
	});

	it("resolveCatalogFromPrMatch returns prd", () => {
		expect(resolveCatalogFromPrMatch(pr)).toEqual({
			catalogKey: "prd",
			sectionNumber: 1,
		});
	});

	it("maps batch branch s01-b1 to section 1 tasks in batch", () => {
		const batchPr = {
			...pr,
			number: 9002,
			title: "PRD S1 B1 Workspace data isolation (1.1–1.4)",
			headRef: "cursor/platform-readiness/s01-b1-5329",
		};
		expect(matchPullRequestToTask(batchPr, 1, "1.4", "prd")).toBe(true);
		expect(matchPullRequestToTask(batchPr, 1, "1.1", "clm")).toBe(false);
	});
});
