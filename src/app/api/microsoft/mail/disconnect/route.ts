import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	deleteOutlookMailIntegration,
	getOutlookMailIntegration,
} from "@/lib/actions/outlook-mail-integration.actions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { requireStepUp } from "@/lib/auth/step-up";
import { getCurrentUserId } from "@/lib/microsoft/auth-utils";
import { requirePermission } from "@/lib/rbac/middleware";

export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.INTEGRATIONS.OUTLOOK_CONNECT,
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
		const integration = await getOutlookMailIntegration(userId);
		if (!integration?.$id) {
			return NextResponse.json(
				{ error: "No Outlook mail integration found" },
				{ status: 404 },
			);
		}

		await deleteOutlookMailIntegration(integration.$id);

		return NextResponse.json({
			success: true,
			message: "Outlook mail disconnected successfully",
		});
	} catch (error) {
		console.error("[SERVER] Outlook mail disconnect error:", error);
		return NextResponse.json(
			{
				error: "Failed to disconnect Outlook mail",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
