import { type NextRequest, NextResponse } from "next/server";
import { processObligationReminders } from "@/lib/funding/obligation-reminder.service";

function isAuthorizedCron(request: NextRequest): boolean {
	const authHeader = request.headers.get("authorization");
	if (!authHeader?.startsWith("Bearer ")) return false;
	const token = authHeader.slice("Bearer ".length).trim();
	const expected =
		process.env.CRON_SECRET || process.env.CRON_SECRET_TOKEN || "";
	return Boolean(expected) && token === expected;
}

export async function GET(request: NextRequest) {
	if (!isAuthorizedCron(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const result = await processObligationReminders();
		return NextResponse.json({
			success: true,
			...result,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("[SERVER] GET /api/cron/obligation-reminders] Error:", error);
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Failed to process obligation reminders",
			},
			{ status: 500 },
		);
	}
}
