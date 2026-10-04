import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getGiveShareAnalytics } from "@/lib/give/share-analytics";
import { requireGiftOrgContext } from "@/lib/gifts/request-context";

export async function GET(request: NextRequest) {
	const ctx = await requireGiftOrgContext(
		request,
		PERMISSIONS.DONATIONS.CONFIG_VIEW,
	);
	if (!ctx.ok) return ctx.response;

	const daysRaw = Number(request.nextUrl.searchParams.get("days") || "90");
	const days = Number.isFinite(daysRaw)
		? Math.min(Math.max(Math.round(daysRaw), 1), 365)
		: 90;

	try {
		const analytics = await getGiveShareAnalytics(ctx.orgId, days);
		return NextResponse.json(analytics);
	} catch (error) {
		console.error("[give/share-analytics GET]", error);
		return NextResponse.json(
			{ error: "Failed to load share analytics" },
			{ status: 500 },
		);
	}
}
