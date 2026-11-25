import { ROADMAP_CATALOG } from "./catalog";
import type { RoadmapCatalogKey } from "./catalog-key";
import { NONPROFIT_ROADMAP_CATALOG } from "./nonprofit-catalog";
import { PLATFORM_READINESS_ROADMAP_CATALOG } from "./platform-readiness-catalog";
import { PRODUCTION_TOOLS_ROADMAP_CATALOG } from "./production-tools-catalog";
import { getDynamicTodoSections } from "./todo/dynamic-sections";
import { TODO_ROADMAP_CATALOG } from "./todo/todo-catalog";
import type { RoadmapCatalogSection } from "./types";

export const ROADMAP_CATALOGS: Record<
	RoadmapCatalogKey,
	RoadmapCatalogSection[]
> = {
	clm: ROADMAP_CATALOG,
	npo: NONPROFIT_ROADMAP_CATALOG,
	prd: PLATFORM_READINESS_ROADMAP_CATALOG,
	pto: PRODUCTION_TOOLS_ROADMAP_CATALOG,
	todo: TODO_ROADMAP_CATALOG,
};

export function catalogForKey(key: RoadmapCatalogKey): RoadmapCatalogSection[] {
	if (key === "todo") {
		// The todo board also carries sections added at runtime through the
		// "generate section from a prompt" feature — see dynamic-sections.ts.
		return [...ROADMAP_CATALOGS.todo, ...getDynamicTodoSections()];
	}
	return ROADMAP_CATALOGS[key];
}

export function allCatalogPrNumbers(): number[] {
	const numbers: number[] = [];
	for (const catalog of Object.values(ROADMAP_CATALOGS)) {
		for (const section of catalog) {
			numbers.push(...(section.linkedPrNumbers ?? []));
		}
	}
	return numbers;
}
