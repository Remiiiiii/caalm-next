import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { listPostedGiftsForContract } from "@/lib/gifts/contract-gifts";
import { enrichGift } from "@/lib/gifts/enrich";
import { requireFundingOrgContext } from "@/lib/funding/request-context";

type RouteContext = { params: Promise<{ contractId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
	const ctx = await requireFundingOrgContext(
		request,
		PERMISSIONS.FUNDING.VIEW,
	);
	if (!ctx.ok) return ctx.response;
	const { contractId } = await context.params;

	try {
		const { items, cashTotal } = await listPostedGiftsForContract(
			ctx.orgId,
			contractId,
		);
		const enriched = await Promise.all(items.map((g) => enrichGift(g)));
		return NextResponse.json({ items: enriched, cashTotal });
	} catch (error) {
		console.error("[funding/streams/gifts GET]", error);
		return NextResponse.json(
			{ error: "Failed to load linked gifts" },
			{ status: 500 },
		);
	}
}
