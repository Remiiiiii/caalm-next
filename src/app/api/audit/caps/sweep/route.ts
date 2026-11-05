import { type NextRequest, NextResponse } from "next/server";
import { sweepAuditCaps } from "@/lib/audit-upload/sweep-caps";

function isAuthorizedCron(request: NextRequest): boolean {
	const authHeader = request.headers.get("authorization");
	if (!authHeader?.startsWith("Bearer ")) return false;
	const token = authHeader.slice("Bearer ".length).trim();
	const expected =
		process.env.CRON_SECRET || process.env.CRON_SECRET_TOKEN || "";
	return Boolean(expected) && token === expected;
}

export async function POST(request: NextRequest) {
	if (!isAuthorizedCron(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const result = await sweepAuditCaps();
		return NextResponse.json({
			success: true,
			...result,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("[SERVER] POST /api/audit/caps/sweep:", error);
		return NextResponse.json(
			{ error: "Failed to sweep corrective actions" },
			{ status: 500 },
		);
	}
}
