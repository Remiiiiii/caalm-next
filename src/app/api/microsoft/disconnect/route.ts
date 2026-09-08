import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	deleteCalendarIntegration,
	getCalendarIntegration,
} from "@/lib/actions/calendar-integration.actions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { requireStepUp } from "@/lib/auth/step-up";
import { requirePermission } from "@/lib/rbac/middleware";
import { getCurrentUserId } from "@/lib/microsoft/auth-utils";

export async function POST(request: NextRequest) {
	try {
		const permissionCheck = await requirePermission(request, {
			permission: PERMISSIONS.SETTINGS.INTEGRATIONS,
		});
		if (permissionCheck) return permissionCheck;

		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const stepUpCheck = requireStepUp(request, user.$id);
		if (stepUpCheck) return stepUpCheck;

		let userId: string;
		try {
			userId = await getCurrentUserId();
		} catch (_authError) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const integration = await getCalendarIntegration(userId, "microsoft");

		if (!integration) {
			return NextResponse.json(
				{ error: "No Microsoft calendar integration found" },
				{ status: 404 },
			);
		}

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
