import { type NextRequest, NextResponse } from "next/server";
import { processApprovalSlas } from "@/lib/approvals/ApprovalSlaService";

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
		const result = await processApprovalSlas();
		return NextResponse.json({
			success: true,
			...result,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Failed to process approval SLAs:", error);
		return NextResponse.json(
			{ error: "Failed to process approval SLAs" },
			{ status: 500 },
		);
	}
}
