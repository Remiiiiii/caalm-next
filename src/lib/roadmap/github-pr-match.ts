/**
 * Match GitHub PRs to roadmap sections/tasks.
 * Section cards use catalog `linkedPrNumbers` (topic match), not "Section N:" titles.
 */

import {
	ROADMAP_CATALOG,
	getCatalogLinkedPrNumbers,
	getSectionNumberForPr,
} from "./catalog";

export type GitHubPullRequestSummary = {
	number: number;
	title: string;
	htmlUrl: string;
	headRef: string;
	state: "open" | "closed" | "merged";
	draft?: boolean;
	createdAt?: string;
};

export type ResolvedPullRequest = GitHubPullRequestSummary & {
	source: "linked" | "catalog" | "discovered_task" | "discovered_section";
};

export function matchPullRequestToSection(
	pr: GitHubPullRequestSummary,
	sectionNumber: number,
): boolean {
	const catalogMatch = getCatalogLinkedPrNumbers(sectionNumber).includes(
		pr.number,
	);
	const branchMatch = new RegExp(`(?:^|/)clm/${sectionNumber}-`, "i").test(
		pr.headRef,
	);
	return catalogMatch || branchMatch;
}

/** Task branch convention: clm/{section}-{taskCode}-slug */
export function matchPullRequestToTask(
	pr: GitHubPullRequestSummary,
	sectionNumber: number,
	taskCode: string,
): boolean {
	const escapedCode = taskCode.replace(/\./g, "\\.");
	const branchMatch = new RegExp(
		`clm/${sectionNumber}-${escapedCode}(?:-|$)`,
		"i",
	).test(pr.headRef);
	const titleMatch = new RegExp(`\\b${escapedCode}\\b`).test(pr.title);
	return branchMatch || titleMatch;
}

export function findSectionPullRequest(
	openPrs: GitHubPullRequestSummary[],
	sectionNumber: number,
): GitHubPullRequestSummary | null {
	return (
		openPrs.find((pr) => matchPullRequestToSection(pr, sectionNumber)) ?? null
	);
}

export function findTaskPullRequest(
	openPrs: GitHubPullRequestSummary[],
	sectionNumber: number,
	taskCode: string,
): GitHubPullRequestSummary | null {
	const taskMatch = openPrs.find((pr) =>
		matchPullRequestToTask(pr, sectionNumber, taskCode),
	);
	return taskMatch ?? null;
}

/**
 * Map a PR to a section when it is not yet in `linkedPrNumbers`.
 * Catalog number wins, then `clm/{section}-` branch, then task-code title/branch.
 */
export function resolveSectionFromPrMatch(
	pr: GitHubPullRequestSummary,
): number | undefined {
	const fromCatalog = getSectionNumberForPr(pr.number);
	if (fromCatalog != null) return fromCatalog;

	for (const section of ROADMAP_CATALOG) {
		if (matchPullRequestToSection(pr, section.sectionNumber)) {
			return section.sectionNumber;
		}
		const stack = [...section.tasks];
		while (stack.length) {
			const task = stack.pop()!;
			if (matchPullRequestToTask(pr, section.sectionNumber, task.taskCode)) {
				return section.sectionNumber;
			}
			if (task.children?.length) stack.push(...task.children);
		}
	}
	return undefined;
}

/**
 * Drop HTML comments and tags from a GitHub PR body.
 * The roadmap pane shows markdown only; Cursor footer buttons are noise.
 */
export function stripHtmlFromPrBody(markdown: string): string {
	return markdown
		.replace(/<!--[\s\S]*?-->/g, "")
		.replace(
			/<(div|picture|section|footer|table|header|aside|nav)[\s\S]*?<\/\1>/gi,
			"",
		)
		.replace(/<a\b[\s\S]*?<\/a>/gi, "")
		.replace(/<[^>]+>/g, "")
		.replace(/&nbsp;/gi, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}
