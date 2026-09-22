import { type NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron/is-authorized-cron";
import { recomputeAllOrgs } from "@/lib/fundraising/segments-repository";

export async function GET(request: NextRequest) {
	if (!isAuthorizedCron(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const result = await recomputeAllOrgs();
		return NextResponse.json({
			success: true,
			...result,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("[SERVER] GET /api/cron/npo-rfm:", error);
		return NextResponse.json(
			{ error: "Failed to recompute RFM segments" },
			{ status: 500 },
		);
	}
}
