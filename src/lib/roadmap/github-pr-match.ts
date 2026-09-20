/**
 * Match GitHub PRs to roadmap sections/tasks.
 * Section cards use catalog `linkedPrNumbers` (topic match), not "Section N:" titles.
 * CLM branches are `clm/{section}-{code}-*`.
 * Nonprofit branches are `cursor/nonprofit/{section}-{code}-*` (legacy `npo/` still matches).
 */

import type { RoadmapCatalogKey } from "./catalog-key";
import {
	catalogBranchPrefixes,
	DEFAULT_ROADMAP_CATALOG_KEY,
} from "./catalog-key";
import {
	linkedPrNumbersInCatalog,
	sectionNumberForPrIn,
} from "./catalog-query";
import { catalogForKey } from "./catalogs";

export type GitHubPullRequestSummary = {
	number: number;
	title: string;
	htmlUrl: string;
	headRef: string;
	state: "open" | "closed" | "merged";
	draft?: boolean;
	createdAt?: string;
	/** Present on merged PRs from the GitHub pulls payload. */
	mergeCommitSha?: string;
};

export type ResolvedPullRequest = GitHubPullRequestSummary & {
	source: "linked" | "catalog" | "discovered_task" | "discovered_section";
};

export type CatalogSectionMatch = {
	catalogKey: RoadmapCatalogKey;
	sectionNumber: number;
};

/** Closed or merged PRs stay on the board with strikethrough + status. */
export function isSettledRoadmapPullRequestState(
	state: string | undefined,
): boolean {
	return state === "closed" || state === "merged";
}

/** Catalog PRs stay listed after close/merge on every board. */
export function shouldListRoadmapSectionPullRequest(
	_state: "open" | "closed" | "merged" | "unknown" | undefined,
	_catalogKey: RoadmapCatalogKey,
): boolean {
	return true;
}

export function matchPullRequestToSection(
	pr: GitHubPullRequestSummary,
	sectionNumber: number,
	catalogKey: RoadmapCatalogKey = DEFAULT_ROADMAP_CATALOG_KEY,
): boolean {
	const catalogMatch = linkedPrNumbersInCatalog(
		catalogForKey(catalogKey),
		sectionNumber,
	).includes(pr.number);
	const branchMatch = catalogBranchPrefixes(catalogKey).some((prefix) =>
		new RegExp(`(?:^|/)${prefix}/${sectionNumber}-`, "i").test(pr.headRef),
	);
	return catalogMatch || branchMatch;
}

/** Task branch: clm/{section}-{taskCode}-slug or cursor/nonprofit/{section}-{taskCode}-slug */
export function matchPullRequestToTask(
	pr: GitHubPullRequestSummary,
	sectionNumber: number,
	taskCode: string,
	catalogKey: RoadmapCatalogKey = DEFAULT_ROADMAP_CATALOG_KEY,
): boolean {
	const escapedCode = taskCode.replace(/\./g, "\\.");
	const branchMatch = catalogBranchPrefixes(catalogKey).some((prefix) =>
		new RegExp(`${prefix}/${sectionNumber}-${escapedCode}(?:-|$)`, "i").test(
			pr.headRef,
		),
	);
	// NPO titles must include "NPO 1.1" so they cannot complete CLM task 1.1.
	const titleMatch =
		catalogKey === "npo"
			? new RegExp(`\\bNPO\\s+${escapedCode}\\b`, "i").test(pr.title)
			: !/\bNPO\s+\d+\.\d+/i.test(pr.title) &&
				new RegExp(`\\b${escapedCode}\\b`).test(pr.title);
	return branchMatch || titleMatch;
}

export function findSectionPullRequest(
	openPrs: GitHubPullRequestSummary[],
	sectionNumber: number,
	catalogKey: RoadmapCatalogKey = DEFAULT_ROADMAP_CATALOG_KEY,
): GitHubPullRequestSummary | null {
	return (
		openPrs.find((pr) =>
			matchPullRequestToSection(pr, sectionNumber, catalogKey),
		) ?? null
	);
}

export function findTaskPullRequest(
	openPrs: GitHubPullRequestSummary[],
	sectionNumber: number,
	taskCode: string,
	catalogKey: RoadmapCatalogKey = DEFAULT_ROADMAP_CATALOG_KEY,
): GitHubPullRequestSummary | null {
	const taskMatch = openPrs.find((pr) =>
		matchPullRequestToTask(pr, sectionNumber, taskCode, catalogKey),
	);
	return taskMatch ?? null;
}

/**
 * Map a PR to a catalog + section when it is not yet in `linkedPrNumbers`.
 * Linked numbers win, then `clm/` / `cursor/nonprofit/` branch, then task-code title.
 */
export function resolveCatalogFromPrMatch(
	pr: GitHubPullRequestSummary,
): CatalogSectionMatch | undefined {
	for (const catalogKey of ["clm", "npo"] as const) {
		const fromCatalog = sectionNumberForPrIn(
			catalogForKey(catalogKey),
			pr.number,
		);
		if (fromCatalog != null) {
			return { catalogKey, sectionNumber: fromCatalog };
		}
	}

	for (const catalogKey of ["clm", "npo"] as const) {
		for (const section of catalogForKey(catalogKey)) {
			if (matchPullRequestToSection(pr, section.sectionNumber, catalogKey)) {
				return { catalogKey, sectionNumber: section.sectionNumber };
			}
			const stack = [...section.tasks];
			while (stack.length) {
				const task = stack.pop()!;
				if (
					matchPullRequestToTask(
						pr,
						section.sectionNumber,
						task.taskCode,
						catalogKey,
					)
				) {
					return { catalogKey, sectionNumber: section.sectionNumber };
				}
				if (task.children?.length) stack.push(...task.children);
			}
		}
	}
	return undefined;
}

/**
 * Map a PR to a section when it is not yet in `linkedPrNumbers`.
 * Defaults to CLM when both catalogs could match a bare task code.
 */
export function resolveSectionFromPrMatch(
	pr: GitHubPullRequestSummary,
): number | undefined {
	return resolveCatalogFromPrMatch(pr)?.sectionNumber;
}

/**
 * Drop a leading `5.1 ` or `NPO 5.1 ` task-code prefix so the pane title
 * matches the catalog task name.
 */
export function displayPullRequestTitle(title: string): string {
	return title.replace(/^(?:NPO\s+)?\d+\.\d+\s+/i, "").trim();
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
