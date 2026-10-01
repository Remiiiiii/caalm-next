import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	deleteGmailIntegration,
	getGmailIntegration,
} from "@/lib/actions/gmail-integration.actions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { requireStepUp } from "@/lib/auth/step-up";
import { revokeToken } from "@/lib/gmail/oauth";
import { getCurrentUserId } from "@/lib/microsoft/auth-utils";
import { requirePermission } from "@/lib/rbac/middleware";

export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.INTEGRATIONS.GMAIL_MANAGE,
	});
	if (denied) return denied;

	try {
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const stepUpCheck = requireStepUp(request, user.$id);
		if (stepUpCheck) return stepUpCheck;

		const userId = await getCurrentUserId();
		const integrationRaw = await getGmailIntegration(userId);
		if (!integrationRaw?.$id) {
			return NextResponse.json(
				{ error: "No Gmail integration found" },
				{ status: 404 },
			);
		}

		const refreshToken = integrationRaw.refresh_token;
		if (refreshToken) {
			try {
				await revokeToken(refreshToken);
			} catch {
				// Still remove local integration if revoke fails
			}
		}

		await deleteGmailIntegration(integrationRaw.$id);

		return NextResponse.json({
			success: true,
			message: "Gmail disconnected successfully",
		});
	} catch (error) {
		console.error("[SERVER] Gmail disconnect error:", error);
		return NextResponse.json(
			{
				error: "Failed to disconnect Gmail",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
