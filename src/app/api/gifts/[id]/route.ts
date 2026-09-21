import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	GiftDomainError,
	getGiftById,
	isGiftMethod,
	requireGiftOrgContext,
	updateDraftGift,
} from "@/lib/gifts";
import { enrichGift } from "@/lib/gifts/enrich";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
	const ctx = await requireGiftOrgContext(request, PERMISSIONS.GIFTS.VIEW);
	if (!ctx.ok) return ctx.response;
	const { id } = await context.params;
	const gift = await getGiftById(id, ctx.orgId);
	if (!gift) {
		return NextResponse.json({ error: "Gift not found" }, { status: 404 });
	}
	return NextResponse.json(await enrichGift(gift));
}

export async function PATCH(request: NextRequest, context: RouteContext) {
	const ctx = await requireGiftOrgContext(request, PERMISSIONS.GIFTS.CREATE);
	if (!ctx.ok) return ctx.response;
	const { id } = await context.params;

	try {
		const existing = await getGiftById(id, ctx.orgId);
		if (!existing) {
			return NextResponse.json({ error: "Gift not found" }, { status: 404 });
		}
		if (existing.status !== "draft") {
			return NextResponse.json(
				{ error: "Posted gifts cannot change amount, date, or donor" },
				{ status: 409 },
			);
		}
		const body = (await request.json()) as Record<string, unknown>;
		const patch = {
			amount: body.amount != null ? Number(body.amount) : undefined,
			currency: body.currency != null ? String(body.currency) : undefined,
			giftDate: body.giftDate != null ? String(body.giftDate) : undefined,
			method: isGiftMethod(body.method) ? body.method : undefined,
			constituentId:
				body.constituentId != null ? String(body.constituentId) : undefined,
			campaignId:
				body.campaignId === null
					? null
					: body.campaignId != null
						? String(body.campaignId)
						: undefined,
			designationId:
				body.designationId === null
					? null
					: body.designationId != null
						? String(body.designationId)
						: undefined,
			contractId:
				body.contractId === null
					? null
					: body.contractId != null
						? String(body.contractId)
						: undefined,
			anonymous:
				body.anonymous != null ? Boolean(body.anonymous) : undefined,
		};
		const gift = await updateDraftGift(id, ctx.orgId, patch);
		return NextResponse.json(gift);
	} catch (error) {
		if (error instanceof GiftDomainError) {
			return NextResponse.json({ error: error.message }, { status: error.status });
		}
		console.error("[SERVER] gifts PATCH:", error);
		return NextResponse.json({ error: "Failed to update gift" }, { status: 500 });
	}
}
