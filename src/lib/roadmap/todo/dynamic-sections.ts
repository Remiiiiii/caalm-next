/**
 * Sections beyond the static 20 in todo-catalog.ts — both freshly generated
 * (via the "generate section from a prompt" feature, see
 * /api/roadmap/todo/generate-section) and synced in from GitHub's real todo
 * roadmap PRs (see sync-from-github.ts, the source of truth for anything
 * beyond a single request's optimistic add).
 *
 * This module stays import-safe for the client bundle too (catalogForKey is
 * reachable from client code via github-pr-match.ts's display helpers), so
 * it never touches Node built-ins — GitHub syncing lives in
 * sync-from-github.ts, a server-only module that reconciles this in-memory
 * store via reconcileDynamicTodoSections().
 */

import type { RoadmapCatalogSection } from "../types";

declare global {
	// eslint-disable-next-line no-var
	var __caalmDynamicTodoSections: RoadmapCatalogSection[] | undefined;
}

function sectionsRef(): RoadmapCatalogSection[] {
	if (!globalThis.__caalmDynamicTodoSections) {
		globalThis.__caalmDynamicTodoSections = [];
	}
	return globalThis.__caalmDynamicTodoSections;
}

export function getDynamicTodoSections(): RoadmapCatalogSection[] {
	return sectionsRef();
}

/**
 * Server-only sync hook — upserts by sectionNumber so a section this process
 * already knows about (e.g. just generated, ahead of GitHub's own PR-list
 * cache catching up) isn't dropped until GitHub's version is actually seen.
 */
export function reconcileDynamicTodoSections(
	sections: RoadmapCatalogSection[],
): void {
	const byNumber = new Map(
		sectionsRef().map((section) => [section.sectionNumber, section]),
	);
	for (const section of sections) {
		byNumber.set(section.sectionNumber, section);
	}
	globalThis.__caalmDynamicTodoSections = [...byNumber.values()].sort(
		(a, b) => a.sectionNumber - b.sectionNumber,
	);
}

/** Next sectionNumber after the static catalog and every section added so far. */
export function nextDynamicTodoSectionNumber(
	staticSectionCount: number,
): number {
	const highest = sectionsRef().reduce(
		(max, section) => Math.max(max, section.sectionNumber),
		staticSectionCount,
	);
	return highest + 1;
}

export function addDynamicTodoSection(section: RoadmapCatalogSection): void {
	sectionsRef().push(section);
}
