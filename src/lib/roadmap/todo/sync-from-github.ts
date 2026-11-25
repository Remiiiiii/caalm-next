/**
 * Makes GitHub the source of truth for the Todo Roadmap's sections beyond
 * the static 20: any open or closed PR on a cursor/todo/* branch titled
 * `TODO {sectionNumber}.{taskIndex} {title}` gets turned back into a
 * RoadmapCatalogSection — preferring the structured sidecar JSON its branch
 * carries (written by open-stub-pr.ts next to the ticket marker file), and
 * falling back to parsing the PR's own body for PRs opened before that
 * sidecar existed. Every matching PR always yields a section (never dropped
 * silently) — that's also what keeps next-section numbering collision-free,
 * since a PR this sync can't see is a PR its number could get reused.
 *
 * Server-only — never import from catalogs.ts or anything client-reachable
 * (see dynamic-sections.ts's own comment on why that boundary matters).
 */

import { isTodoRoadmapBranch } from "../catalog-key";
import {
	fetchPullRequestStatus,
	fetchRepoFileAtRef,
	listOpenPullRequests,
	listRecentlyClosedPullRequests,
} from "../github";
import type { GitHubPullRequestSummary } from "../github-pr-match";
import type { RoadmapCatalogSection } from "../types";
import { reconcileDynamicTodoSections } from "./dynamic-sections";
import { TODO_ROADMAP_CATALOG } from "./todo-catalog";
import { todoSectionSidecarPath } from "./todo-pr-body";

const STATIC_PR_NUMBERS = new Set(
	TODO_ROADMAP_CATALOG.flatMap((section) => section.linkedPrNumbers ?? []),
);

const TITLE_RE = /^TODO\s+(\d+)\.\d+\s+(.+)$/i;

type TodoSectionSidecar = {
	title: string;
	sourceRef: string;
	description: string;
	acceptanceCriteria: string[];
	testSuiteRef: string;
};

export function parseTitle(
	title: string,
): { sectionNumber: number; title: string } | null {
	const match = TITLE_RE.exec(title);
	if (!match) return null;
	return { sectionNumber: Number(match[1]), title: match[2]!.trim() };
}

export function extractDoneWhenItems(body: string): string[] {
	const heading = "## Done when";
	const start = body.indexOf(heading);
	if (start < 0) return [];
	const rest = body.slice(start + heading.length);
	const end = rest.indexOf("\n## ");
	const section = end >= 0 ? rest.slice(0, end) : rest;
	const items: string[] = [];
	for (const line of section.split("\n")) {
		const match = /^-\s*\[[ xX]\]\s*(.+)$/.exec(line.trim());
		if (match) items.push(match[1]!.trim());
	}
	return items;
}

/** Reconstructs a "Who: x. What: y. ..." description from the PR's rendered spec section. */
export function extractSpecDescription(body: string): string {
	const heading = "## Who / What / Where / Why / When / How";
	const start = body.indexOf(heading);
	if (start < 0) return "";
	const rest = body.slice(start + heading.length);
	const end = rest.indexOf("## Done when");
	const section = end >= 0 ? rest.slice(0, end) : rest;
	return section
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.startsWith("-"))
		.map((line) => line.replace(/^-\s*\*\*(\w+):\*\*\s*/, "$1: "))
		.join(" ");
}

async function sectionFromPrBody(
	pr: GitHubPullRequestSummary,
	sectionNumber: number,
	title: string,
	taskCode: string,
): Promise<RoadmapCatalogSection> {
	const status = await fetchPullRequestStatus({ prNumber: pr.number }).catch(
		() => null,
	);
	const body = status?.body ?? "";
	const description = extractSpecDescription(body) || "See PR for details.";
	const acceptanceCriteria = extractDoneWhenItems(body);
	return {
		sectionNumber,
		title,
		sourceRef: `PR #${pr.number}`,
		linkedPrNumbers: [pr.number],
		tasks: [
			{
				taskCode,
				title,
				description,
				acceptanceCriteria,
				testSuiteRef: `tests/roadmap/todo/${taskCode.replace(/\./g, "-")}.test.ts`,
				linkedPrNumber: pr.number,
			},
		],
	};
}

async function sectionFromPr(
	pr: GitHubPullRequestSummary,
	sectionNumber: number,
	fallbackTitle: string,
): Promise<RoadmapCatalogSection> {
	const taskCode = `${sectionNumber}.1`;
	const raw = await fetchRepoFileAtRef(
		todoSectionSidecarPath(sectionNumber),
		pr.headRef,
	).catch(() => null);
	if (raw) {
		try {
			const data = JSON.parse(raw) as TodoSectionSidecar;
			return {
				sectionNumber,
				title: data.title,
				sourceRef: data.sourceRef,
				linkedPrNumbers: [pr.number],
				tasks: [
					{
						taskCode,
						title: data.title,
						description: data.description,
						acceptanceCriteria: data.acceptanceCriteria,
						testSuiteRef: data.testSuiteRef,
						linkedPrNumber: pr.number,
					},
				],
			};
		} catch {
			// fall through to body parsing below
		}
	}
	return sectionFromPrBody(pr, sectionNumber, fallbackTitle, taskCode);
}

let cache: { fetchedAt: number; sections: RoadmapCatalogSection[] } | null =
	null;
const CACHE_MS = 30_000;

/**
 * Refreshes the in-memory dynamic-sections store from GitHub and returns
 * what it found. Cached like the other GitHub list calls — pass skipCache
 * right after creating a PR so the board shows it without a 30s wait.
 */
export async function syncTodoSectionsFromGitHub(options?: {
	skipCache?: boolean;
}): Promise<RoadmapCatalogSection[]> {
	const now = Date.now();
	if (!options?.skipCache && cache && now - cache.fetchedAt < CACHE_MS) {
		reconcileDynamicTodoSections(cache.sections);
		return cache.sections;
	}

	const [open, closed] = await Promise.all([
		listOpenPullRequests(),
		listRecentlyClosedPullRequests(),
	]);
	const byNumber = new Map<number, GitHubPullRequestSummary>();
	for (const pr of [...open, ...closed]) byNumber.set(pr.number, pr);

	const candidates: Array<{
		pr: GitHubPullRequestSummary;
		sectionNumber: number;
		title: string;
	}> = [];
	for (const pr of byNumber.values()) {
		if (STATIC_PR_NUMBERS.has(pr.number)) continue;
		if (!isTodoRoadmapBranch(pr.headRef)) continue;
		const parsed = parseTitle(pr.title);
		if (!parsed) continue;
		candidates.push({
			pr,
			sectionNumber: parsed.sectionNumber,
			title: parsed.title,
		});
	}

	const sections = (
		await Promise.all(
			candidates.map(({ pr, sectionNumber, title }) =>
				sectionFromPr(pr, sectionNumber, title),
			),
		)
	).sort((a, b) => a.sectionNumber - b.sectionNumber);

	cache = { fetchedAt: now, sections };
	reconcileDynamicTodoSections(sections);
	return sections;
}
