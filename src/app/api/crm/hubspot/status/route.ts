import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { hubspotConnector } from "@/lib/crm/connectors/hubspot.connector";
import { getCrmIntegration } from "@/lib/crm/integrations.repository";
import { resolveCrmOrgRequest } from "@/lib/crm/request-context";
import { getFreshHubSpotAccessToken } from "@/lib/crm/tokens";
import { parseCrmConfig } from "@/lib/crm/types";
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
		if (!integration || integration.status === "disconnected") {
			return NextResponse.json({
				connected: false,
				status: "disconnected",
				config: null,
				portalId: null,
				displayName: null,
				lastSyncAt: null,
				lastError: null,
			});
		}

		let displayName: string | null = null;
		if (integration.status === "connected" && integration.tokens_json) {
			try {
				const token = await getFreshHubSpotAccessToken(integration);
				const info = await hubspotConnector.verifyConnection(token);
				displayName = info.displayName || null;
			} catch {
				displayName = integration.portal_id
					? `Hub ${integration.portal_id}`
					: null;
			}
		}

		return NextResponse.json({
			connected: integration.status === "connected",
			status: integration.status,
			config: parseCrmConfig(integration.config_json),
			portalId: integration.portal_id || null,
			displayName,
			lastSyncAt: integration.last_sync_at || null,
			lastError: integration.last_error || null,
		});
	} catch (error) {
		console.error("[crm/hubspot/status]", error);
		return NextResponse.json(
			{ error: "Failed to load HubSpot status" },
			{ status: 500 },
		);
	}
}
