import { isNonprofitRoadmapBranch } from "@/lib/roadmap/catalog-key";
import type { GitHubPullRequestSummary } from "@/lib/roadmap/github-pr-match";
import type { PrLogOverview, PrLogSection } from "./types";

export type PrLogSourcePr = GitHubPullRequestSummary & {
	/** True only when every GitHub check on the merge commit succeeded. */
	checksPassed?: boolean;
	checksReason?: string;
};

/**
 * PR log only lists Cursor agent branches such as
 * `cursor/funding-retention-pursuit-9ee5`. Nonprofit Roadmap work uses
 * `cursor/nonprofit/…` and is not an agent-log card.
 */
export function isAgentPullRequestBranch(headRef: string): boolean {
	const ref = headRef.trim();
	if (isNonprofitRoadmapBranch(ref)) return false;
	return /(?:^|\/)cursor\//i.test(ref);
}

/**
 * Merged to main; later production deploys shipped the work. The merge-SHA
 * check run is stale (#78 production deploy failed, #49 Playwright failed)
 * so the live gate would keep them forever.
 */
export const PR_LOG_RESOLVED_NUMBERS = new Set([49, 78]);

/**
 * Merged agent PRs stay on the log until checksPassed. Closed-without-merge
 * and fully green merges are dropped from the live list.
 */
export function shouldKeepAgentPrOnLog(pr: PrLogSourcePr): boolean {
	if (!isAgentPullRequestBranch(pr.headRef)) return false;
	if (PR_LOG_RESOLVED_NUMBERS.has(pr.number)) return false;
	if (pr.state === "closed") return false;
	if (pr.state === "merged") return pr.checksPassed !== true;
	return true;
}

export function agentPrMergeBlockReason(pr: PrLogSourcePr): string {
	if (pr.draft) return "Draft — not ready to merge";
	if (pr.state === "merged") {
		return pr.checksPassed === true
			? ""
			: pr.checksReason || "Merged — waiting for GitHub checks to succeed";
	}
	if (pr.state === "closed") return "Closed without merge";
	return "Waiting to merge";
}

export function agentPrToSection(pr: PrLogSourcePr): PrLogSection {
	const complete = pr.state === "merged" && pr.checksPassed === true;
	const checksPending = pr.state === "merged" && pr.checksPassed !== true;
	const closed = pr.state === "closed";
	const status = complete ? "complete" : closed ? "locked" : "in_progress";
	const block = agentPrMergeBlockReason(pr);

	return {
		id: `pr-${pr.number}`,
		sectionNumber: pr.number,
		title: pr.title,
		status,
		progressPercent: complete ? 100 : checksPending ? 50 : 0,
		taskCounts: {
			total: 1,
			complete: complete ? 1 : 0,
			locked: closed ? 1 : 0,
			available: 0,
			in_progress: complete || closed ? 0 : 1,
			in_review: 0,
			blocked: 0,
		},
		prTitle: pr.title,
		prLinks: [
			{
				number: pr.number,
				title: pr.title,
				state: pr.state,
				checksPassed: pr.checksPassed === true,
			},
		],
		mergeBlockReason: complete ? null : block,
		headRef: pr.headRef,
		htmlUrl: pr.htmlUrl,
		draft: Boolean(pr.draft),
		prNumber: pr.number,
	};
}

export function buildPrLogOverview(prs: PrLogSourcePr[]): PrLogOverview {
	const sections = prs
		.filter(shouldKeepAgentPrOnLog)
		.sort((a, b) => b.number - a.number)
		.map(agentPrToSection);

	const complete = sections.filter((s) => s.status === "complete").length;
	const overallProgressPercent =
		sections.length === 0 ? 0 : Math.round((complete / sections.length) * 100);

	return { overallProgressPercent, sections };
}
