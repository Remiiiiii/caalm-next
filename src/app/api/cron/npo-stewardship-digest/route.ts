import { type NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron/is-authorized-cron";
import { sendStewardshipDigestsForFrequency } from "@/lib/stewardship/digest";

export async function GET(request: NextRequest) {
	if (!isAuthorizedCron(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const frequencyParam = request.nextUrl.searchParams.get("frequency");
	const frequency =
		frequencyParam === "weekly" ? "weekly" : ("daily" as const);

	try {
		const result = await sendStewardshipDigestsForFrequency(frequency);
		return NextResponse.json({
			success: true,
			frequency,
			...result,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("[SERVER] GET /api/cron/npo-stewardship-digest:", error);
		return NextResponse.json(
			{ error: "Failed to send stewardship digests" },
			{ status: 500 },
		);
	}
}
