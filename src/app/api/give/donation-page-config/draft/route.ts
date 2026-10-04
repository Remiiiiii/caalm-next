import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { donationPageConfigErrorResponse } from "@/lib/give/donation-page-config/http";
import type { DonationPageConfigPayload } from "@/lib/give/donation-page-config/types";
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
		const draft = await service.getOrCreateDraft(ctx.orgId);
		const published = await service.getPublished(ctx.orgId);
		return NextResponse.json({ draft, published });
	} catch (error) {
		return donationPageConfigErrorResponse(error);
	}
}

export async function PATCH(request: NextRequest) {
	const ctx = await requireGiveOrgContext(
		request,
		PERMISSIONS.DONATIONS.CONFIG_EDIT,
	);
	if (!ctx.ok) return ctx.response;
	try {
		const body = (await request.json()) as {
			payload?: DonationPageConfigPayload;
			expectedVersion?: number;
		};
		if (!body.payload || typeof body.expectedVersion !== "number") {
			return NextResponse.json(
				{ error: "payload and expectedVersion are required" },
				{ status: 400 },
			);
		}
		const service = getDonationPageConfigService();
		const result = await service.updateDraft({
			orgId: ctx.orgId,
			payload: body.payload,
			expectedVersion: body.expectedVersion,
		});
		return NextResponse.json(result);
	} catch (error) {
		return donationPageConfigErrorResponse(error);
	}
}
