import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { donationPageConfigErrorResponse } from "@/lib/give/donation-page-config/http";
import { getDonationPageConfigService } from "@/lib/give/donation-page-config/runtime";
import { requireGiveOrgContext } from "@/lib/give/request-context";

export async function GET(request: NextRequest) {
	const ctx = await requireGiveOrgContext(
		request,
		PERMISSIONS.DONATIONS.CONFIG_VIEW,
	);
	if (!ctx.ok) return ctx.response;
	try {
		const service = getDonationPageConfigService();
		const versions = await service.listVersions(ctx.orgId);
		return NextResponse.json({ versions });
	} catch (error) {
		return donationPageConfigErrorResponse(error);
	}
}
