import type { GitHubPullRequestSummary } from "@/lib/roadmap/github-pr-match";
import type { PrLogOverview, PrLogSection } from "./types";

/** Cloud agent branches look like `cursor/funding-retention-pursuit-9ee5`. */
export function isAgentPullRequestBranch(headRef: string): boolean {
	return /(?:^|\/)cursor\//i.test(headRef.trim());
}

export function agentPrMergeBlockReason(pr: GitHubPullRequestSummary): string {
	if (pr.draft) return "Draft — not ready to merge";
	if (pr.state === "merged") return "";
	if (pr.state === "closed") return "Closed without merge";
	return "Waiting to merge";
}

export function agentPrToSection(pr: GitHubPullRequestSummary): PrLogSection {
	const complete = pr.state === "merged";
	const closed = pr.state === "closed";
	const status = complete ? "complete" : closed ? "locked" : "in_progress";
	const block = agentPrMergeBlockReason(pr);

	return {
		id: `pr-${pr.number}`,
		sectionNumber: pr.number,
		title: pr.title,
		status,
		progressPercent: complete ? 100 : 0,
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
			},
		],
		mergeBlockReason: complete ? null : block,
		headRef: pr.headRef,
		htmlUrl: pr.htmlUrl,
		draft: Boolean(pr.draft),
		prNumber: pr.number,
	};
}

export function buildPrLogOverview(
	prs: GitHubPullRequestSummary[],
): PrLogOverview {
	const sections = prs
		.filter((pr) => isAgentPullRequestBranch(pr.headRef))
		.sort((a, b) => b.number - a.number)
		.map(agentPrToSection);

	const complete = sections.filter((s) => s.status === "complete").length;
	const overallProgressPercent =
		sections.length === 0
			? 0
			: Math.round((complete / sections.length) * 100);

	return { overallProgressPercent, sections };
}
