import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { GiftDomainError, requireGiftOrgContext, voidPostedGift } from "@/lib/gifts";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
	const ctx = await requireGiftOrgContext(request, PERMISSIONS.GIFTS.VOID);
	if (!ctx.ok) return ctx.response;
	const { id } = await context.params;

	try {
		const gift = await voidPostedGift(id, ctx.orgId);
		return NextResponse.json(gift);
	} catch (error) {
		if (error instanceof GiftDomainError) {
			return NextResponse.json({ error: error.message }, { status: error.status });
		}
		console.error("[SERVER] gifts void:", error);
		return NextResponse.json({ error: "Failed to void gift" }, { status: 500 });
	}
}
