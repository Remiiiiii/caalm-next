import { type NextRequest, NextResponse } from "next/server";
import { fetchBriefing } from "@/lib/briefing/fetch-briefing";
import { requirePermission } from "@/lib/rbac/middleware";
import { CACHE_KEYS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {});
	if (denied) return denied;

	try {
		const payload = await CacheManager.withCache(
			"briefing",
			CACHE_KEYS.briefing.snapshot(),
			() => fetchBriefing(),
			60,
		);

		return NextResponse.json(payload, {
			headers: {
				"Cache-Control": "private, max-age=0, must-revalidate",
			},
		});
	} catch (error) {
		console.error("[briefing]", error);
		return NextResponse.json(
			{ markets: [], news: [] },
			{ status: 200 },
		);
	}
}
