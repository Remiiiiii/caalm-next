import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { hubspotConnector } from "@/lib/crm/connectors/hubspot.connector";
import { getCrmIntegration } from "@/lib/crm/integrations.repository";
import { resolveCrmOrgRequest } from "@/lib/crm/request-context";
import { getFreshHubSpotAccessToken } from "@/lib/crm/tokens";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.SETTINGS.INTEGRATIONS,
	});
	if (denied) return denied;

	const resolved = await resolveCrmOrgRequest(request, "hubspot");
	if ("response" in resolved) return resolved.response;

	try {
		const integration = await getCrmIntegration(resolved.orgId, "hubspot");
		if (!integration || integration.status !== "connected") {
			return NextResponse.json(
				{ error: "Connect HubSpot to load deal properties." },
				{ status: 400 },
			);
		}
		const token = await getFreshHubSpotAccessToken(integration);
		const properties = await hubspotConnector.listDealProperties(token);
		return NextResponse.json({ properties });
	} catch (error) {
		console.error("[crm/hubspot/properties]", error);
		return NextResponse.json(
			{ error: "Failed to load HubSpot deal properties" },
			{ status: 500 },
		);
	}
}
