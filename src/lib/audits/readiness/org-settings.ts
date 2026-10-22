import {
	getOrganization,
	type Organization,
	updateOrganization,
} from "@/lib/rbac/organizations";
import { resolveOrgTimezone } from "./timezone";
import {
	DEFAULT_ORG_TIMEZONE,
	type OrgAuditSettings,
	type SiteCrawlResult,
} from "./types";

export function getOrgAuditSettings(org: Organization): OrgAuditSettings {
	const settings = org.settings || {
		maxUsers: 10,
		maxDepartments: 3,
		features: [],
	};
	const timezone = resolveOrgTimezone(
		typeof settings.timezone === "string" ? settings.timezone : null,
	);
	const websiteRaw = settings.websiteUrl;
	const websiteUrl =
		typeof websiteRaw === "string" && websiteRaw.trim()
			? websiteRaw.trim()
			: null;
	return { timezone, websiteUrl };
}

export function mergeOrgAuditSettings(
	existing: Organization["settings"],
	updates: { timezone?: string; websiteUrl?: string | null },
): Organization["settings"] {
	return {
		...existing,
		maxUsers: existing?.maxUsers ?? 10,
		maxDepartments: existing?.maxDepartments ?? 3,
		features: existing?.features ?? [],
		...(updates.timezone !== undefined
			? { timezone: resolveOrgTimezone(updates.timezone) }
			: {}),
		...(updates.websiteUrl !== undefined
			? { websiteUrl: updates.websiteUrl?.trim() || "" }
			: {}),
	};
}

/** Reads the cached crawl from org.settings, if any has been stored. */
export function getCachedSiteCrawl(org: Organization): SiteCrawlResult | null {
	const cached = org.settings?.siteCrawlCache;
	return cached ? (cached as SiteCrawlResult) : null;
}

/** Persists a fresh crawl result on the org document (no new snapshot needed). */
export async function cacheSiteCrawl(
	orgId: string,
	crawl: SiteCrawlResult,
): Promise<void> {
	const org = await getOrganization(orgId);
	if (!org) return;
	await updateOrganization(orgId, {
		settings: { ...org.settings, siteCrawlCache: crawl },
	});
}

export { DEFAULT_ORG_TIMEZONE };
