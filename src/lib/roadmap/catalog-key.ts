/**
 * Dual-catalog keys for the CLM board and the Nonprofit board.
 * Task codes like "0.1" exist in both catalogs, so entity ids carry a prefix.
 */

export type RoadmapCatalogKey = "clm" | "npo";

export const DEFAULT_ROADMAP_CATALOG_KEY: RoadmapCatalogKey = "clm";

export function parseRoadmapCatalogKey(
	raw: string | null | undefined,
): RoadmapCatalogKey {
	return raw === "npo" ? "npo" : "clm";
}

export function catalogKeyFromEntityId(id: string): RoadmapCatalogKey {
	return id.startsWith("npo_") ? "npo" : "clm";
}

export function catalogIdPrefix(key: RoadmapCatalogKey): string {
	return key === "npo" ? "npo_" : "";
}

/** Git branch prefix: clm/0-0.1-slug vs cursor/nonprofit/0-0.1-slug */
export function catalogBranchPrefix(key: RoadmapCatalogKey): string {
	return key === "npo" ? "cursor/nonprofit" : "clm";
}

/** Canonical prefix plus legacy `npo/` so older stub branches still match. */
export function catalogBranchPrefixes(key: RoadmapCatalogKey): string[] {
	const canonical = catalogBranchPrefix(key);
	return key === "npo" ? [canonical, "npo"] : [canonical];
}

/**
 * Branches that belong on the Nonprofit Roadmap, never the PR log.
 * Canonical: `cursor/nonprofit/…`. Engine: `cursor/nonprofit-roadmap-340a`.
 * Retired: `npo/…` and `cursor/npo-s01-b1-340a`.
 */
export function isNonprofitRoadmapBranch(
	headRef: string | null | undefined,
): boolean {
	const ref = headRef?.trim() ?? "";
	if (/(?:^|\/)cursor\/nonprofit(?:\/|-)/i.test(ref)) return true;
	if (/(?:^|\/)cursor\/npo-/i.test(ref)) return true;
	return /^npo\//i.test(ref);
}
