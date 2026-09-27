import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCampaignById, updateCampaign } from "@/lib/campaigns";
import { requireGiftOrgContext } from "@/lib/gifts/request-context";
import { computeCampaignRoi } from "@/lib/development";
import { sumPostedGiftTotalForCampaign } from "@/lib/gifts/repository";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
	const ctx = await requireGiftOrgContext(request, PERMISSIONS.GIFTS.VIEW);
	if (!ctx.ok) return ctx.response;
	const { id } = await context.params;

	const campaign = await getCampaignById(id, ctx.orgId);
	if (!campaign) {
		return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
	}
	const postedTotal = await sumPostedGiftTotalForCampaign(ctx.orgId, id);
	const roi = computeCampaignRoi(postedTotal, campaign.campaignCost);
	return NextResponse.json({ ...campaign, postedTotal, roi });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
	const ctx = await requireGiftOrgContext(request, PERMISSIONS.GIFTS.CREATE);
	if (!ctx.ok) return ctx.response;
	const { id } = await context.params;

	try {
		const body = (await request.json()) as Record<string, unknown>;
		if (body.campaignCost != null && Number(body.campaignCost) < 0) {
			return NextResponse.json(
				{ error: "Campaign cost cannot be negative" },
				{ status: 400 },
			);
		}
		const campaign = await updateCampaign(id, ctx.orgId, {
			name: body.name != null ? String(body.name) : undefined,
			goalAmount:
				body.goalAmount != null ? Number(body.goalAmount) : undefined,
			currency: body.currency != null ? String(body.currency) : undefined,
			startDate:
				body.startDate === null
					? undefined
					: body.startDate != null
						? String(body.startDate)
						: undefined,
			endDate:
				body.endDate === null
					? undefined
					: body.endDate != null
						? String(body.endDate)
						: undefined,
			campaignCost:
				body.campaignCost === null
					? undefined
					: body.campaignCost != null
						? Number(body.campaignCost)
						: undefined,
		});
		if (!campaign) {
			return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
		}
		const postedTotal = await sumPostedGiftTotalForCampaign(ctx.orgId, id);
		const roi = computeCampaignRoi(postedTotal, campaign.campaignCost);
		return NextResponse.json({ ...campaign, postedTotal, roi });
	} catch (error) {
		console.error("[SERVER] campaigns PATCH:", error);
		return NextResponse.json(
			{ error: "Failed to update campaign" },
			{ status: 500 },
		);
	}
}
