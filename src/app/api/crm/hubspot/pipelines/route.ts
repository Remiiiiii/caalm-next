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
				{ error: "Connect HubSpot to load pipelines." },
				{ status: 400 },
			);
		}
		const token = await getFreshHubSpotAccessToken(integration);
		const pipelines = await hubspotConnector.listPipelines(token);
		return NextResponse.json({ pipelines });
	} catch (error) {
		console.error("[crm/hubspot/pipelines]", error);
		return NextResponse.json(
			{ error: "Failed to load HubSpot pipelines" },
			{ status: 500 },
		);
	}
}
