import { type NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron/is-authorized-cron";
import { pollDueNewsFeeds } from "@/lib/news/ingest/run-feed";

export async function GET(request: NextRequest) {
	if (!isAuthorizedCron(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	try {
		const results = await pollDueNewsFeeds();
		return NextResponse.json({
			success: true,
			...results,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("[SERVER] GET /api/cron/poll-news-feeds:", error);
		return NextResponse.json(
			{ error: "Failed to poll news feeds" },
			{ status: 500 },
		);
	}
}
