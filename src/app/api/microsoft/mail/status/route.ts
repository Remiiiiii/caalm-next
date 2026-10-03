import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getOutlookMailIntegrationStatus } from "@/lib/actions/outlook-mail-integration.actions";
import { getCurrentUserId } from "@/lib/microsoft/auth-utils";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.INTEGRATIONS.OUTLOOK_CONNECT,
	});
	if (denied) return denied;

	try {
		const userId = await getCurrentUserId();
		const status = await getOutlookMailIntegrationStatus(userId);
		return NextResponse.json(status);
	} catch {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}
}
