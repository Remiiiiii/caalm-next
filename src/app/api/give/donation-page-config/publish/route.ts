import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { donationPageConfigActorFromUser } from "@/lib/give/donation-page-config/actor";
import { donationPageConfigErrorResponse } from "@/lib/give/donation-page-config/http";
import { getDonationPageConfigService } from "@/lib/give/donation-page-config/runtime";
import { requireGiveOrgContext } from "@/lib/give/request-context";

export async function POST(request: NextRequest) {
	const ctx = await requireGiveOrgContext(
		request,
		PERMISSIONS.DONATIONS.CONFIG_EDIT,
	);
	if (!ctx.ok) return ctx.response;
	try {
		const body = (await request.json().catch(() => ({}))) as {
			changeSummary?: string;
		};
		const service = getDonationPageConfigService();
		const result = await service.publish({
			orgId: ctx.orgId,
			actor: donationPageConfigActorFromUser(ctx.user),
			changeSummary: body.changeSummary?.trim() || undefined,
		});
		return NextResponse.json(result);
	} catch (error) {
		return donationPageConfigErrorResponse(error);
	}
}
