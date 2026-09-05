import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { disconnectCrmIntegration } from "@/lib/crm/integrations.repository";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.SETTINGS.INTEGRATIONS,
	});
	if (denied) return denied;

	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}

	const orgId =
		getOrgIdFromRequest(request) ||
		(await getUserDefaultOrganization(user.$id))?.orgId;
	if (!orgId) {
		return NextResponse.json({ error: "orgId is required" }, { status: 400 });
	}

	try {
		await disconnectCrmIntegration(orgId, "hubspot");
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("[hubspot/disconnect]", error);
		return NextResponse.json(
			{ error: "Failed to disconnect HubSpot" },
			{ status: 500 },
		);
	}
}
