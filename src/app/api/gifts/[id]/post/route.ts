import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { GiftDomainError, postGift, requireGiftOrgContext } from "@/lib/gifts";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
	const ctx = await requireGiftOrgContext(request, PERMISSIONS.GIFTS.CREATE);
	if (!ctx.ok) return ctx.response;
	const { id } = await context.params;

	try {
		const gift = await postGift(id, ctx.orgId);
		return NextResponse.json(gift);
	} catch (error) {
		if (error instanceof GiftDomainError) {
			return NextResponse.json({ error: error.message }, { status: error.status });
		}
		console.error("[SERVER] gifts post:", error);
		return NextResponse.json({ error: "Failed to post gift" }, { status: 500 });
	}
}
