import { describe, expect, it } from "vitest";
import {
	agentPrToSection,
	buildPrLogOverview,
	isAgentPullRequestBranch,
	type PrLogSourcePr,
	shouldKeepAgentPrOnLog,
} from "./agent-pr";

function pr(
	overrides: Partial<PrLogSourcePr> & Pick<PrLogSourcePr, "number" | "headRef">,
): PrLogSourcePr {
	return {
		title: "Sample",
		htmlUrl: `https://github.com/Remiiiiii/caalm-next/pull/${overrides.number}`,
		state: "open",
		...overrides,
	};
}

describe("isAgentPullRequestBranch", () => {
	it("matches Cursor cloud agent branches", () => {
		expect(
			isAgentPullRequestBranch("cursor/funding-retention-pursuit-9ee5"),
		).toBe(true);
	});

	it("ignores CLM tracking stubs and human branches", () => {
		expect(isAgentPullRequestBranch("clm/5-e-signature")).toBe(false);
		expect(isAgentPullRequestBranch("fix-billing-spinner")).toBe(false);
	});
});

describe("nonprofit catalog stubs stay off the PR log", () => {
	it("drops NPO section stub branches and titles", () => {
		expect(
			shouldKeepAgentPrOnLog(
				pr({
					number: 88,
					title: "NPO S1 B1 catalog stub",
					headRef: "cursor/npo-s01-b1-340a",
					draft: true,
				}),
			),
		).toBe(false);
		expect(
			shouldKeepAgentPrOnLog(
				pr({
					number: 107,
					title: "NPO S9 B2 catalog stub",
					headRef: "cursor/npo-s09-b2-340a",
					draft: true,
				}),
			),
		).toBe(false);
		expect(
			shouldKeepAgentPrOnLog(
				pr({
					number: 86,
					title: "Add Nonprofit Roadmap as a Development project",
					headRef: "cursor/nonprofit-roadmap-340a",
				}),
			),
		).toBe(true);
	});

	it("omits catalog stubs from the live overview", () => {
		const overview = buildPrLogOverview([
			pr({
				number: 88,
				title: "NPO S1 B1 catalog stub",
				headRef: "cursor/npo-s01-b1-340a",
			}),
			pr({
				number: 80,
				title: "Open agent PR",
				headRef: "cursor/open-work-aaaa",
			}),
		]);
		expect(overview.sections.map((s) => s.prNumber)).toEqual([80]);
	});
});

describe("buildPrLogOverview", () => {
	it("turns agent PRs into section cards and skips the rest", () => {
		const overview = buildPrLogOverview([
			pr({
				number: 66,
				title: "Funding & Retention: dollar-ranked streams + pursuit pipeline",
				headRef: "cursor/funding-retention-pursuit-9ee5",
				draft: true,
			}),
			pr({
				number: 65,
				title: "Positioning & Packaging Cleanup",
				headRef: "clm/15-packaging-cleanup",
			}),
		]);

		expect(overview.sections).toHaveLength(1);
		expect(overview.sections[0]?.sectionNumber).toBe(66);
		expect(overview.sections[0]?.id).toBe("pr-66");
		expect(overview.sections[0]?.status).toBe("in_progress");
		expect(overview.sections[0]?.progressPercent).toBe(0);
		expect(overview.sections[0]?.mergeBlockReason).toBe(
			"Draft — not ready to merge",
		);
		expect(overview.overallProgressPercent).toBe(0);
	});

	it("keeps a merged agent PR until checks pass", () => {
		const waiting = pr({
			number: 49,
			title: "Roadmap engine",
			headRef: "cursor/clm-roadmap-engine-5329",
			state: "merged",
			checksPassed: false,
			checksReason: "Waiting for GitHub checks to finish (Playwright E2E)",
		});
		expect(shouldKeepAgentPrOnLog(waiting)).toBe(true);
		const section = agentPrToSection(waiting);
		expect(section.status).toBe("in_progress");
		expect(section.progressPercent).toBe(50);
		expect(section.mergeBlockReason).toContain("Playwright E2E");
	});

	it("drops a merged agent PR after checks succeed", () => {
		expect(
			shouldKeepAgentPrOnLog(
				pr({
					number: 49,
					title: "Roadmap engine",
					headRef: "cursor/clm-roadmap-engine-5329",
					state: "merged",
					checksPassed: true,
				}),
			),
		).toBe(false);
	});

	it("omits green merges from the live overview", () => {
		const overview = buildPrLogOverview([
			pr({
				number: 80,
				title: "Open agent PR",
				headRef: "cursor/open-work-aaaa",
			}),
			pr({
				number: 79,
				title: "Merged, checks still running",
				headRef: "cursor/merged-pending-bbbb",
				state: "merged",
				checksPassed: false,
			}),
			pr({
				number: 78,
				title: "Merged and green",
				headRef: "cursor/merged-green-cccc",
				state: "merged",
				checksPassed: true,
			}),
		]);
		expect(overview.sections.map((s) => s.prNumber)).toEqual([80, 79]);
	});
});
