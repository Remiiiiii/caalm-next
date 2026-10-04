import { ROADMAP_CATALOG } from "./catalog";
import type { RoadmapCatalogKey } from "./catalog-key";
import { NONPROFIT_ROADMAP_CATALOG } from "./nonprofit-catalog";
import { PLATFORM_READINESS_ROADMAP_CATALOG } from "./platform-readiness-catalog";
import type { RoadmapCatalogSection } from "./types";

export const ROADMAP_CATALOGS: Record<
	RoadmapCatalogKey,
	RoadmapCatalogSection[]
> = {
	clm: ROADMAP_CATALOG,
	npo: NONPROFIT_ROADMAP_CATALOG,
	prd: PLATFORM_READINESS_ROADMAP_CATALOG,
};

export function catalogForKey(key: RoadmapCatalogKey): RoadmapCatalogSection[] {
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
