export const dynamic = "force-dynamic";

import { RiskAvertedDetailPage } from "@/components/dashboard/RiskAvertedDetailPage";
import { PERMISSIONS } from "@/constants/permissions";
import { computeRiskImpact } from "@/lib/dashboard/risk-impact.service";
import type { RiskImpactSnapshot } from "@/lib/dashboard/risk-impact.types";
import { requirePagePermission } from "@/lib/rbac/page-guards";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { CACHE_KEYS, CACHE_TTLS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";

export default async function RiskAvertedPage() {
	const user = await requirePagePermission(PERMISSIONS.CONTRACTS.VIEW);

	// Prefetch the default "ytd" snapshot while the RSC is rendering so the
	// client component can hydrate with data already in hand (no skeleton flash).
	// getUserDefaultOrganization is wrapped in React cache() so the repeat call
	// here is free — the result was already fetched by requirePagePermission above.
	let prefetched: RiskImpactSnapshot | null = null;
	try {
		const defaultOrg = await getUserDefaultOrganization(user.$id);
		const orgId = defaultOrg?.orgId || "default_organization";
		prefetched = await CacheManager.withCache(
			"dashboard/risk-impact",
			CACHE_KEYS.dashboard.riskImpact(orgId, user.$id, "ytd"),
			() => computeRiskImpact({ userId: user.$id, orgId, period: "ytd" }),
			CACHE_TTLS.medium,
		);
	} catch {
		// Degrade gracefully; client-side SWR loads data independently
	}

	return <RiskAvertedDetailPage initialSnapshot={prefetched} />;
}
