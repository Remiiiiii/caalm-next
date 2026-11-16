import { type NextRequest, NextResponse } from "next/server";
import { processEvidenceChasers } from "@/lib/audit-lab/chasers";

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
		const result = await processEvidenceChasers(orgId);
		return NextResponse.json({ success: true, ...result });
	} catch (error) {
		console.error("[SERVER] GET /api/cron/audit-lab-chasers", error);
		return NextResponse.json(
			{ error: "Failed to process evidence chasers" },
			{ status: 500 },
		);
	}
}