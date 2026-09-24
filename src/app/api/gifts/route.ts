import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	createDraftGift,
	GiftDomainError,
	isGiftMethod,
	listGifts,
	requireGiftOrgContext,
} from "@/lib/gifts";

export async function GET(request: NextRequest) {
	const ctx = await requireGiftOrgContext(request, PERMISSIONS.GIFTS.VIEW);
	if (!ctx.ok) return ctx.response;

	const params = request.nextUrl.searchParams;
	const page = Math.max(Number(params.get("page") || "1"), 1);
	const pageSize = Math.min(Math.max(Number(params.get("pageSize") || "20"), 1), 100);
	const statusParam = params.get("status");

	try {
		const result = await listGifts({
			orgId: ctx.orgId,
			status:
				statusParam === "draft" ||
				statusParam === "posted" ||
				statusParam === "voided"
					? statusParam
					: undefined,
			search: params.get("search") || undefined,
			campaignId: params.get("campaignId") || undefined,
			limit: pageSize,
			offset: (page - 1) * pageSize,
		});
		return NextResponse.json({
			items: result.items,
			total: result.total,
			page,
			pageSize,
		});
	} catch (error) {
		console.error("[SERVER] gifts GET:", error);
		return NextResponse.json({ error: "Failed to list gifts" }, { status: 500 });
	}
}

export async function POST(request: NextRequest) {
	const ctx = await requireGiftOrgContext(request, PERMISSIONS.GIFTS.CREATE);
	if (!ctx.ok) return ctx.response;

	try {
		const body = (await request.json()) as Record<string, unknown>;
		const amount = Number(body.amount);
		const method = body.method;
		const constituentId = String(body.constituentId || "").trim();
		const giftDate = String(body.giftDate || "").trim();
		if (!Number.isFinite(amount) || amount <= 0) {
			return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
		}
		if (!constituentId || !giftDate) {
			return NextResponse.json(
				{ error: "constituentId and giftDate are required" },
				{ status: 400 },
			);
		}
		if (!isGiftMethod(method)) {
			return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
		}

		const gift = await createDraftGift({
			orgId: ctx.orgId,
			amount,
			currency: String(body.currency || "USD"),
			giftDate,
			method,
			constituentId,
			campaignId: body.campaignId ? String(body.campaignId) : undefined,
			designationId: body.designationId ? String(body.designationId) : undefined,
			contractId: body.contractId ? String(body.contractId) : undefined,
			anonymous: Boolean(body.anonymous),
		});
		return NextResponse.json(gift, { status: 201 });
	} catch (error) {
		if (error instanceof GiftDomainError) {
			return NextResponse.json({ error: error.message }, { status: error.status });
		}
		console.error("[SERVER] gifts POST:", error);
		return NextResponse.json({ error: "Failed to create gift" }, { status: 500 });
	}
}
