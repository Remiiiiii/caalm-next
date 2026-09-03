import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { upsertCrmIntegration } from "@/lib/crm/integrations.repository";
import { resolveCrmOrgRequest } from "@/lib/crm/request-context";
import { requirePermission } from "@/lib/rbac/middleware";

export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.SETTINGS.INTEGRATIONS,
	});
	if (denied) return denied;

	const resolved = await resolveCrmOrgRequest(request, "salesforce");
	if ("response" in resolved) return resolved.response;

	try {
		await upsertCrmIntegration({
			orgId: resolved.orgId,
			provider: "salesforce",
			status: "pending_setup",
			connectedBy: resolved.user.$id,
			lastError: null,
		});
		return NextResponse.json({
			success: true,
			message:
				"Salesforce setup requested. CAALM will enable the connector after a discovery call and sandbox access.",
		});
	} catch (error) {
		console.error("[crm/salesforce/request-setup]", error);
		return NextResponse.json(
			{ error: "Failed to record Salesforce setup request" },
			{ status: 500 },
		);
	}
}
