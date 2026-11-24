/**
 * Sections added to the Todo Roadmap at runtime through the "generate
 * section from a prompt" feature (see /api/roadmap/todo/generate-section).
 *
 * shortcut: in-memory only, per server instance — a cold start or restart
 * loses anything added here. Upgrade to an Appwrite-backed collection (same
 * pattern as the other catalogs in roadmap-appwrite-tables.ts) once this
 * board needs to survive restarts for more than one developer's session.
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
