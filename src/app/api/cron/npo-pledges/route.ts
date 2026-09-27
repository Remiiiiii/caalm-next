import { type NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron/is-authorized-cron";
import { processDuePledgeInstallments } from "@/lib/pledges";

export async function GET(request: NextRequest) {
	if (!isAuthorizedCron(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const result = await processDuePledgeInstallments();
		return NextResponse.json({
			success: true,
			...result,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("[SERVER] GET /api/cron/npo-pledges:", error);
		return NextResponse.json(
			{ error: "Failed to process pledge installments" },
			{ status: 500 },
		);
	}
}
