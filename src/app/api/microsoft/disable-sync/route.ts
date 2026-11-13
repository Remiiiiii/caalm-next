import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	getValidIntegration,
	toggleSyncEnabled,
} from "@/lib/actions/calendar-integration.actions";
import { getCurrentUserId } from "@/lib/microsoft/auth-utils";
import { requirePermission } from "@/lib/rbac/middleware";

/**
 * Emergency stop: immediately disable Outlook calendar auto-sync for the
 * signed-in user, without disconnecting the integration.
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

	const integration = await getValidIntegration(userId, "microsoft");
	if (!integration?.$id) {
		return NextResponse.json(
			{
				success: false,
				message: "Microsoft calendar integration not found or expired",
			},
			{ status: 404 },
		);
	}

	try {
		await toggleSyncEnabled(integration.$id, false);
		return NextResponse.json({
			success: true,
			message: "Outlook calendar sync has been disabled.",
		});
	} catch (error) {
		console.error("Error disabling Outlook calendar sync:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to disable sync",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
