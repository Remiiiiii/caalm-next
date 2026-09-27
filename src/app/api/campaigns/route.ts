import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { createCampaign, listCampaigns } from "@/lib/campaigns";
import { requireGiftOrgContext } from "@/lib/gifts/request-context";
import { sumPostedGiftTotalForCampaign } from "@/lib/gifts/repository";

export async function GET(request: NextRequest) {
	const ctx = await requireGiftOrgContext(request, PERMISSIONS.GIFTS.VIEW);
	if (!ctx.ok) return ctx.response;

	try {
		const campaigns = await listCampaigns(ctx.orgId);
		const withTotals = await Promise.all(
			campaigns.map(async (campaign) => ({
				...campaign,
				postedTotal: await sumPostedGiftTotalForCampaign(ctx.orgId, campaign.$id),
			})),
		);
		return NextResponse.json({ items: withTotals });
	} catch (error) {
		console.error("[SERVER] campaigns GET:", error);
		return NextResponse.json(
			{ error: "Failed to list campaigns" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	const ctx = await requireGiftOrgContext(request, PERMISSIONS.GIFTS.CREATE);
	if (!ctx.ok) return ctx.response;

	try {
		const body = (await request.json()) as Record<string, unknown>;
		const name = String(body.name || "").trim();
		if (!name) {
			return NextResponse.json({ error: "Name is required" }, { status: 400 });
		}
		const campaign = await createCampaign({
			orgId: ctx.orgId,
			name,
			goalAmount:
				body.goalAmount != null ? Number(body.goalAmount) : undefined,
			currency: String(body.currency || "USD"),
			startDate: body.startDate ? String(body.startDate) : undefined,
			endDate: body.endDate ? String(body.endDate) : undefined,
		});
		return NextResponse.json(campaign, { status: 201 });
	} catch (error) {
		console.error("[SERVER] campaigns POST:", error);
		return NextResponse.json(
			{ error: "Failed to create campaign" },
			{ status: 500 },
		);
	}
}
