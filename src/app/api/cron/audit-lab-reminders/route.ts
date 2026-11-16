import { type NextRequest, NextResponse } from "next/server";
import { listSessions } from "@/lib/audit-lab/repository";
import { enqueueSessionReminders } from "@/lib/audit-lab/notifications";

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
		const orgId = request.nextUrl.searchParams.get("orgId");
		if (!orgId) {
			return NextResponse.json(
				{ error: "orgId query parameter is required" },
				{ status: 400 },
			);
		}
		const sessions = await listSessions(orgId, 50);
		const scheduled = sessions.filter((s) => s.status === "scheduled");
		let sent = 0;
		for (const session of scheduled) {
			const result = await enqueueSessionReminders(session);
			sent += result.sent;
		}
		return NextResponse.json({
			success: true,
			sessions: scheduled.length,
			notificationsSent: sent,
		});
	} catch (error) {
		console.error("[SERVER] GET /api/cron/audit-lab-reminders", error);
		return NextResponse.json(
			{ error: "Failed to process Audit Lab reminders" },
			{ status: 500 },
		);
	}
}