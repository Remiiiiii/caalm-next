import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { requireITHubOrgContext } from "@/lib/it/require-it-hub-org";
import { buildOrgITSnapshot } from "@/lib/it/org-it-snapshot";
import { CACHE_KEYS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";

export async function GET(request: NextRequest) {
	const ctx = await requireITHubOrgContext(
		request,
		PERMISSIONS.IT.VIEW_MONITORING,
	);
	if (!ctx.ok) return ctx.response;

	try {
		const snapshot = await CacheManager.withCache(
			"it/hub-snapshot",
			CACHE_KEYS.it.hubSnapshot(ctx.orgId),
			() => buildOrgITSnapshot(ctx.orgId),
			60,
		);
		return NextResponse.json({
			success: true,
			data: snapshot,
			isPlatformCrossOrg: ctx.isPlatformCrossOrg,
		});
	} catch (error) {
		console.error("[IT hub overview]", error);
		return NextResponse.json(
			{ error: "Failed to load IT hub overview" },
			{ status: 500 },
		);
	}
}
