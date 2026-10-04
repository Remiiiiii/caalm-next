/**
 * Multi-catalog keys for roadmap boards (CLM, Nonprofit, Platform Readiness).
 * Task codes like "0.1" exist in each catalog, so entity ids carry a prefix.
 */

export type RoadmapCatalogKey = "clm" | "npo" | "prd";

export const DEFAULT_ROADMAP_CATALOG_KEY: RoadmapCatalogKey = "clm";

export function parseRoadmapCatalogKey(
	raw: string | null | undefined,
): RoadmapCatalogKey {
	if (raw === "npo") return "npo";
	if (raw === "prd" || raw === "platform" || raw === "platform-readiness") {
		return "prd";
	}
	return "clm";
}

export function catalogKeyFromEntityId(id: string): RoadmapCatalogKey {
	if (id.startsWith("npo_")) return "npo";
	if (id.startsWith("prd_")) return "prd";
	return "clm";
}

export function catalogIdPrefix(key: RoadmapCatalogKey): string {
	if (key === "npo") return "npo_";
	if (key === "prd") return "prd_";
	return "";
}

/** Git branch prefix: clm/0-0.1-slug vs cursor/nonprofit/… vs cursor/platform-readiness/… */
export function catalogBranchPrefix(key: RoadmapCatalogKey): string {
	if (key === "npo") return "cursor/nonprofit";
	if (key === "prd") return "cursor/platform-readiness";
	return "clm";
}

/** Canonical prefix plus legacy aliases so older branches still match. */
export function catalogBranchPrefixes(key: RoadmapCatalogKey): string[] {
	const canonical = catalogBranchPrefix(key);
	if (key === "npo") return [canonical, "npo"];
	if (key === "prd") return [canonical, "platform-readiness"];
	return [canonical];
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

/**
 * Branches for the Platform Readiness Roadmap — excluded from the agent PR log.
 */
export function isPlatformReadinessRoadmapBranch(
	headRef: string | null | undefined,
): boolean {
	const ref = headRef?.trim() ?? "";
	if (/(?:^|\/)cursor\/platform-readiness(?:\/|-)/i.test(ref)) return true;
	return /^platform-readiness\//i.test(ref);
}
