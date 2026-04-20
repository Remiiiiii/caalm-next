import { type NextRequest, NextResponse } from "next/server";
import { getValidIntegration } from "@/lib/actions/calendar-integration.actions";
import { getCurrentUserId } from "@/lib/microsoft/auth-utils";
import { createGraphClient } from "@/lib/microsoft/graph-client";

export async function GET(_request: NextRequest) {
	try {
		const userId = await getCurrentUserId();
		if (!userId) {
			return NextResponse.json(
				{ success: false, message: "Authentication required" },
				{ status: 401 },
			);
		}

		// Get integration details
		const integration = await getValidIntegration(userId, "microsoft");
		if (!integration) {
			return NextResponse.json(
				{ success: false, message: "No Microsoft integration found" },
				{ status: 404 },
			);
		}

		// Create Graph client and get user info
		const graphClient = createGraphClient(
			integration.access_token,
			integration.refresh_token,
			new Date(integration.token_expiry),
		);

		const userInfo = await graphClient.getUserInfo();

		return NextResponse.json({
			success: true,
			displayName: userInfo.displayName,
			userPrincipalName: userInfo.userPrincipalName,
			mail: userInfo.mail,
		});
	} catch (error) {
		console.error("Error getting Microsoft user info:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to get user info",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
