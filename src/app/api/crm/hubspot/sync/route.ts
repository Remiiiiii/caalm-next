import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCrmIntegration } from "@/lib/crm/integrations.repository";
import { resolveCrmOrgRequest } from "@/lib/crm/request-context";
import { syncHubSpotDeals } from "@/lib/crm/sync-hubspot";
import { requirePermission } from "@/lib/rbac/middleware";

export async function POST(request: NextRequest) {
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
				{ error: "Connect HubSpot before syncing." },
				{ status: 400 },
			);
		}
		const result = await syncHubSpotDeals({
			orgId: resolved.orgId,
			ownerId: resolved.user.$id,
			integration,
		});
		return NextResponse.json({ success: true, ...result });
	} catch (error) {
		console.error("[crm/hubspot/sync]", error);
		return NextResponse.json(
			{
				error:
					error instanceof Error ? error.message : "Failed to sync HubSpot deals",
			},
			{ status: 500 },
		);
	}
}
