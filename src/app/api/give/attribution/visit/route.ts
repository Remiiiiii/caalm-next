import { type NextRequest, NextResponse } from "next/server";
import {
	hasShareAttribution,
	parseGiveShareAttribution,
} from "@/lib/give/attribution";
import { resolveOrganizationByGiveSlug } from "@/lib/give/org";
import { createGiveShareVisit } from "@/lib/give/share-events";
import { handleRateLimit } from "@/lib/services/redis-rate-limit";

function clientIp(request: NextRequest): string {
	return (
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
		request.headers.get("x-real-ip") ||
		"unknown"
	);
}

export async function POST(request: NextRequest) {
	try {
		const body = (await request.json()) as Record<string, unknown>;
		const orgSlug = String(body.orgSlug || "").trim();
		if (!orgSlug) {
			return NextResponse.json({ error: "orgSlug is required" }, { status: 400 });
		}

		const attribution = parseGiveShareAttribution(body);
		if (!hasShareAttribution(attribution)) {
			return NextResponse.json({ skipped: true });
		}

		const rate = await handleRateLimit(`give-visit:${clientIp(request)}:${orgSlug}`, {
			windowSec: 60,
			maxRequests: 30,
		});
		if (!rate.success) {
			return NextResponse.json({ error: "Too many requests" }, { status: 429 });
		}

		const org = await resolveOrganizationByGiveSlug(orgSlug);
		if (!org) {
			return NextResponse.json({ error: "Organization not found" }, { status: 404 });
		}

		await createGiveShareVisit({
			orgId: org.$id,
			giveSlug: orgSlug,
			attribution,
		});
		return NextResponse.json({ ok: true });
	} catch (error) {
		console.error("[give/attribution/visit POST]", error);
		return NextResponse.json({ error: "Visit not recorded" }, { status: 500 });
	}
}
