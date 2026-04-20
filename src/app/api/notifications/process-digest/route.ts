import { type NextRequest, NextResponse } from "next/server";
import { digestService } from "@/lib/services/digestService";

/**
 * POST /api/notifications/process-digest
 * Background job/cron endpoint to process pending digest notifications
 *
 * This endpoint should be called by a cron job at regular intervals:
 * - For daily digests: Run every hour to catch any that are ready
 * - For weekly digests: Run daily to catch any that are ready
 *
 * Security: This endpoint should be protected with an API key or secret
 * to prevent unauthorized access.
 */
export async function POST(_request: NextRequest) {
	try {
		// Optional: Add authentication/authorization check here
		// const authHeader = request.headers.get('authorization');
		// if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		//   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		// }

		console.log("[CRON] Processing pending digest notifications...");

		const stats = await digestService.processPendingDigests();

		console.log("[CRON] Digest processing complete:", stats);

		return NextResponse.json({
			success: true,
			stats: {
				processed: stats.processed,
				sent: stats.sent,
				errors: stats.errors,
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("[CRON] Failed to process digests:", error);
		return NextResponse.json(
			{
				error: "Failed to process digests",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

/**
 * GET /api/notifications/process-digest
 * Vercel Cron calls this endpoint with GET requests
 * Also serves as a health check endpoint
 */
export async function GET(request: NextRequest) {
	try {
		// Check if this is a Vercel Cron request (has Authorization header with Bearer token)
		const authHeader = request.headers.get("authorization");
		const isCronRequest = authHeader?.startsWith("Bearer ");

		if (isCronRequest) {
			// This is a cron job request - process digests
			console.log("[CRON] Processing pending digest notifications...");

			const stats = await digestService.processPendingDigests();

			console.log("[CRON] Digest processing complete:", stats);

			return NextResponse.json({
				success: true,
				stats: {
					processed: stats.processed,
					sent: stats.sent,
					errors: stats.errors,
				},
				timestamp: new Date().toISOString(),
			});
		} else {
			// This is a health check request
			const pendingItems = await digestService.getPendingDigestItems();
			return NextResponse.json({
				status: "ok",
				pendingItems: pendingItems.length,
				timestamp: new Date().toISOString(),
			});
		}
	} catch (error) {
		console.error("[CRON] Failed to process digests:", error);
		return NextResponse.json(
			{
				error: "Failed to process digests",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
