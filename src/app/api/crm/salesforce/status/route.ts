import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCrmIntegration } from "@/lib/crm/integrations.repository";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

export async function GET(request: NextRequest) {
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
		const integration = await getCrmIntegration(orgId, "salesforce");
		return NextResponse.json({
			status: integration?.status || "disconnected",
			requested: integration?.status === "pending_setup",
		});
	} catch (error) {
		console.error("[crm/salesforce/status]", error);
		return NextResponse.json(
			{ error: "Failed to load Salesforce status" },
			{ status: 500 },
		);
	}
}
