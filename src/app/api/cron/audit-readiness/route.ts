import { type NextRequest, NextResponse } from "next/server";
import { runDueReadinessAudits } from "@/lib/audits/readiness/run-audit";

function isAuthorizedCron(request: NextRequest): boolean {
	const authHeader = request.headers.get("authorization");
	if (!authHeader?.startsWith("Bearer ")) return false;
	const token = authHeader.slice("Bearer ".length).trim();
	const expected =
		process.env.CRON_SECRET || process.env.CRON_SECRET_TOKEN || "";
	return Boolean(expected) && token === expected;
}

/**
 * Hourly cron: for each org, if local time is 09:00–09:59 and cadence is due
 * (weekly Mon / monthly day 1 / quarterly Jan|Apr|Jul|Oct day 1), run snapshot.
 */
export async function GET(request: NextRequest) {
	if (!isAuthorizedCron(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const result = await runDueReadinessAudits(new Date());
		return NextResponse.json({
			success: true,
			...result,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("[SERVER] audit-readiness cron failed", error);
		return NextResponse.json(
			{
				error:
					error instanceof Error ? error.message : "Audit readiness cron failed",
			},
			{ status: 500 },
		);
	}
}
