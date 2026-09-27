import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { buildRetentionSummary } from "@/lib/funding";
import { requireFundingOrgContext } from "@/lib/funding/request-context";

export async function GET(request: NextRequest) {
	const ctx = await requireFundingOrgContext(
		request,
		PERMISSIONS.FUNDING.VIEW,
	);
	if (!ctx.ok) return ctx.response;

	try {
		const missingFundOnly =
			request.nextUrl.searchParams.get("missingFund") === "true";
		const summary = await buildRetentionSummary({
			orgId: ctx.orgId,
			missingFundOnly,
		});
		return NextResponse.json(summary);
	} catch (error) {
		console.error("[funding/retention GET]", error);
		return NextResponse.json(
			{ error: "Failed to load retention streams" },
			{ status: 500 },
		);
	}
}
