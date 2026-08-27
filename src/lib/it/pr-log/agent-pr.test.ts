import { describe, expect, it } from "vitest";
import type { GitHubPullRequestSummary } from "@/lib/roadmap/github-pr-match";
import {
	agentPrToSection,
	buildPrLogOverview,
	isAgentPullRequestBranch,
} from "./agent-pr";

function pr(
	overrides: Partial<GitHubPullRequestSummary> &
		Pick<GitHubPullRequestSummary, "number" | "headRef">,
): GitHubPullRequestSummary {
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

	it("marks a merged agent PR complete", () => {
		const section = agentPrToSection(
			pr({
				number: 49,
				title: "Roadmap engine",
				headRef: "cursor/clm-roadmap-engine-5329",
				state: "merged",
			}),
		);
		expect(section.status).toBe("complete");
		expect(section.progressPercent).toBe(100);
		expect(section.mergeBlockReason).toBeNull();
	});
});
