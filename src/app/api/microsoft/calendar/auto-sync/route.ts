import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUserId } from "@/lib/microsoft/auth-utils";
import { syncOutlookCalendarForUser } from "@/lib/microsoft/calendar-sync.service";
import { requirePermission } from "@/lib/rbac/middleware";

/**
 * Auto-sync endpoint that polls Outlook for changes
 * Called periodically (every 30 seconds) by a client-side interval for near-instant updates.
 */
export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.INTEGRATIONS.OUTLOOK_SYNC,
	});
	if (denied) return denied;

	let userId: string;
	try {
		userId = await getCurrentUserId();
	} catch {
		return NextResponse.json(
			{ success: false, message: "Authentication required" },
			{ status: 401 },
		);
	}

	console.log("🔄 Auto-sync triggered for user:", userId);

	try {
		const outcome = await syncOutlookCalendarForUser(userId, {
			// Same date range as the main sync (±30 days) to prevent old events from being synced
			startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
			endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
			strategy: "newest",
		});

		if (outcome.success) {
			console.log("✅ Auto-sync completed successfully:", {
				syncedEvents: outcome.result?.syncedEvents || 0,
				conflicts: outcome.result?.conflicts?.length || 0,
				errors: outcome.result?.errors?.length || 0,
			});

			return NextResponse.json({
				success: true,
				message: "Auto-sync completed",
				result: outcome.result,
			});
		}

		console.error("❌ Auto-sync failed:", outcome);
		return NextResponse.json(
			{
				success: false,
				message: "Auto-sync failed",
				error: outcome.error || outcome.message,
			},
			{ status: outcome.httpStatus >= 400 ? outcome.httpStatus : 500 },
		);
	} catch (error) {
		console.error("Error in auto-sync:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Auto-sync error",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

/**
 * GET endpoint to check auto-sync status
 */
export async function GET(_request: NextRequest) {
	return NextResponse.json({
		success: true,
		message: "Auto-sync endpoint is active",
		recommendedInterval: "30 seconds",
	});
}
