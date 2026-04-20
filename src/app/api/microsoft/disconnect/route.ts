import { type NextRequest, NextResponse } from "next/server";
import {
	deleteCalendarIntegration,
	getCalendarIntegration,
} from "@/lib/actions/calendar-integration.actions";
import { getCurrentUserId } from "@/lib/microsoft/auth-utils";

export async function POST(_request: NextRequest) {
	try {
		// Get current user ID
		let userId: string;

		try {
			userId = await getCurrentUserId();
		} catch (_authError) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		// Get the integration to delete
		const integration = await getCalendarIntegration(userId, "microsoft");

		if (!integration) {
			return NextResponse.json(
				{ error: "No Microsoft calendar integration found" },
				{ status: 404 },
			);
		}

		// Delete the integration
		await deleteCalendarIntegration(integration.$id!);

		return NextResponse.json({
			success: true,
			message: "Microsoft calendar integration disconnected successfully",
		});
	} catch (error) {
		console.error("Microsoft disconnect error:", error);

		return NextResponse.json(
			{
				error: "Failed to disconnect Microsoft calendar",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
