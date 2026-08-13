import { type NextRequest, NextResponse } from "next/server";
import { pollInProgressAgents } from "@/lib/tickets/ticket-resolve.service";

export async function POST(request: NextRequest) {
	const cronSecret = process.env.CRON_SECRET;
	const authHeader = request.headers.get("authorization");
	if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const orgId =
		request.nextUrl.searchParams.get("orgId") || "default_organization";
	const updated = await pollInProgressAgents(orgId);
	return NextResponse.json({ ok: true, updated });
}

export async function GET(request: NextRequest) {
	return POST(request);
}
