import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
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
		const body = (await request.json()) as {
			targetVersionNumber?: number;
			changeSummary?: string;
		};
		if (typeof body.targetVersionNumber !== "number") {
			return NextResponse.json(
				{ error: "targetVersionNumber is required" },
				{ status: 400 },
			);
		}
		const service = getDonationPageConfigService();
		const result = await service.revert({
			orgId: ctx.orgId,
			targetVersionNumber: body.targetVersionNumber,
			actor: {
				userId: ctx.user.$id,
				userName: ctx.user.name || "Unknown",
				userEmail: ctx.user.email || "",
			},
			changeSummary: body.changeSummary?.trim() || undefined,
		});
		return NextResponse.json(result);
	} catch (error) {
		return donationPageConfigErrorResponse(error);
	}
}
