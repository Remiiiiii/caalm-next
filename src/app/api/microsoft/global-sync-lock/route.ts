import { type NextRequest, NextResponse } from "next/server";
import {
	clearGlobalSyncLock,
	getGlobalSyncLockStatus,
	setGlobalSyncLock,
} from "@/lib/microsoft/sync-locks";

/**
 * GET /api/microsoft/global-sync-lock
 * Returns the current status of the global sync lock
 */
export async function GET(_request: NextRequest) {
	const status = getGlobalSyncLockStatus();

	return NextResponse.json({
		locked: status.isLocked,
		lockedBy: status.lockedBy || undefined,
		lockedAt:
			status.lockedAt > 0 ? new Date(status.lockedAt).toISOString() : undefined,
		message: status.message || undefined,
	});
}

/**
 * POST /api/microsoft/global-sync-lock
 * Sets or clears the global sync lock
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { action, message, lockedBy } = body;

		if (action === "lock") {
			setGlobalSyncLock(lockedBy, message);
			console.log("🚨 Global sync lock ACTIVATED", { lockedBy, message });

			return NextResponse.json({
				success: true,
				message: "Global sync lock activated",
				locked: true,
			});
		} else if (action === "unlock") {
			clearGlobalSyncLock();
			console.log("✅ Global sync lock DEACTIVATED");

			return NextResponse.json({
				success: true,
				message: "Global sync lock deactivated",
				locked: false,
			});
		} else {
			return NextResponse.json(
				{
					success: false,
					message: 'Invalid action. Use "lock" or "unlock"',
				},
				{ status: 400 },
			);
		}
	} catch (error) {
		console.error("Error handling global sync lock:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to handle sync lock",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
