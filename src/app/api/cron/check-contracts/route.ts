import { type NextRequest, NextResponse } from "next/server";
import { checkDocumentExpirations } from "@/lib/actions/notification.actions";

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
		const result = await checkDocumentExpirations();
		return NextResponse.json({
			success: true,
			notificationsCreated: result?.notificationsCreated || 0,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Failed to check document expirations:", error);
		return NextResponse.json(
			{ error: "Failed to check document expirations" },
			{ status: 500 },
		);
	}
}
