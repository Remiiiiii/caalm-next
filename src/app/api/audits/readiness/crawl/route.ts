import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	getCachedSiteCrawl,
	getOrgAuditSettings,
} from "@/lib/audits/readiness/org-settings";
import { crawlAndCacheSite } from "@/lib/audits/readiness/site-crawl";
import { requirePermission } from "@/lib/rbac/middleware";
import { getOrganization } from "@/lib/rbac/organizations";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

const RE_CRAWL_COOLDOWN_MS = 5 * 60 * 1000;

/**
 * Dedicated re-crawl: just the public-site check, not a full readiness run
 * or a new snapshot. Same permission as editing the website URL.
 */
export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.SETTINGS.EDIT,
	});
	if (denied) return denied;

	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}

	const defaultOrg = await getUserDefaultOrganization(user.$id);
	if (!defaultOrg?.orgId) {
		return NextResponse.json(
			{ error: "Organization not found" },
			{ status: 404 },
		);
	}

	const org = await getOrganization(defaultOrg.orgId);
	if (!org) {
		return NextResponse.json(
			{ error: "Organization not found" },
			{ status: 404 },
		);
	}

	const { websiteUrl } = getOrgAuditSettings(org);
	if (!websiteUrl) {
		return NextResponse.json(
			{ error: "No website URL configured" },
			{ status: 400 },
		);
	}

	const cached = getCachedSiteCrawl(org);
	if (cached) {
		const retryAt = new Date(cached.crawledAt).getTime() + RE_CRAWL_COOLDOWN_MS;
		if (retryAt > Date.now()) {
			return NextResponse.json(
				{
					error: "Re-crawl is rate limited",
					retryAt: new Date(retryAt).toISOString(),
				},
				{ status: 429 },
			);
		}
	}

	const siteCrawl = await crawlAndCacheSite(defaultOrg.orgId, websiteUrl);

	return NextResponse.json({ success: true, data: { siteCrawl } });
}
