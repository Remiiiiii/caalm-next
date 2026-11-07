/**
 * Multi-catalog keys for roadmap boards (CLM, Nonprofit, Platform Readiness,
 * Production Tools). Task codes like "0.1" exist in each catalog, so entity
 * ids carry a prefix.
 */

export type RoadmapCatalogKey = "clm" | "npo" | "prd" | "pto";

/** Every board the engine seeds and reconciles (CLM, Nonprofit, Platform Readiness, Production Tools). */
export const ROADMAP_CATALOG_KEYS = [
	"clm",
	"npo",
	"prd",
	"pto",
] as const satisfies readonly RoadmapCatalogKey[];

export const DEFAULT_ROADMAP_CATALOG_KEY: RoadmapCatalogKey = "clm";

export function parseRoadmapCatalogKey(
	raw: string | null | undefined,
): RoadmapCatalogKey {
	if (raw === "npo") return "npo";
	if (raw === "prd" || raw === "platform" || raw === "platform-readiness") {
		return "prd";
	}
	if (raw === "pto" || raw === "production-tools") {
		return "pto";
	}
	return "clm";
}

export function catalogKeyFromEntityId(id: string): RoadmapCatalogKey {
	if (id.startsWith("npo_")) return "npo";
	if (id.startsWith("prd_")) return "prd";
	if (id.startsWith("pto_")) return "pto";
	return "clm";
}

export function catalogIdPrefix(key: RoadmapCatalogKey): string {
	if (key === "npo") return "npo_";
	if (key === "prd") return "prd_";
	if (key === "pto") return "pto_";
	return "";
}

/** Git branch prefix: clm/0-0.1-slug vs cursor/nonprofit/… vs cursor/platform-readiness/… vs cursor/production-tools/… */
export function catalogBranchPrefix(key: RoadmapCatalogKey): string {
	if (key === "npo") return "cursor/nonprofit";
	if (key === "prd") return "cursor/platform-readiness";
	if (key === "pto") return "cursor/production-tools";
	return "clm";
}

/** Canonical prefix plus legacy aliases so older branches still match. */
export function catalogBranchPrefixes(key: RoadmapCatalogKey): string[] {
	const canonical = catalogBranchPrefix(key);
	if (key === "npo") return [canonical, "npo"];
	if (key === "prd") return [canonical, "platform-readiness"];
	if (key === "pto") return [canonical, "production-tools"];
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

/**
 * Branches for the Production Tools Roadmap (Ask CAALM A–O tool gap list) —
 * excluded from the agent PR log.
 */
export function isProductionToolsRoadmapBranch(
	headRef: string | null | undefined,
): boolean {
	const ref = headRef?.trim() ?? "";
	if (/(?:^|\/)cursor\/production-tools(?:\/|-)/i.test(ref)) return true;
	return /^production-tools\//i.test(ref);
}
