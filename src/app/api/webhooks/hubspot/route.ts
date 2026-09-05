import { type NextRequest, NextResponse } from "next/server";
import { getCrmIntegrationByPortalId } from "@/lib/crm/integrations.repository";
import {
	isDealStageChange,
	parseHubSpotWebhookEvents,
	verifyHubSpotSignature,
} from "@/lib/crm/hubspot-webhook";
import { ingestHubSpotDeal } from "@/lib/crm/sync-hubspot";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
	const secret =
		process.env.HUBSPOT_WEBHOOK_SECRET || process.env.HUBSPOT_CLIENT_SECRET || "";
	const signature =
		request.headers.get("x-hubspot-signature-v3") ||
		request.headers.get("x-hubspot-signature");
	const timestamp = request.headers.get("x-hubspot-request-timestamp");
	const body = await request.text();

	if (
		!verifyHubSpotSignature({
			method: "POST",
			uri: request.nextUrl.pathname,
			body,
			timestamp,
			signature,
			clientSecret: secret,
		})
	) {
		return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
	}

	try {
		const events = parseHubSpotWebhookEvents(body);
		const results: Array<Record<string, unknown>> = [];

		for (const event of events) {
			if (!isDealStageChange(event) || !event.objectId || !event.portalId) {
				results.push({ skipped: true, reason: "not_stage_change" });
				continue;
			}
			const integration = await getCrmIntegrationByPortalId(
				String(event.portalId),
				"hubspot",
			);
			if (!integration || integration.status !== "connected") {
				results.push({ skipped: true, reason: "not_connected" });
				continue;
			}
			const ingested = await ingestHubSpotDeal({
				orgId: integration.orgId,
				ownerId: integration.connected_by || "system",
				integration,
				dealId: String(event.objectId),
				stageId: event.propertyValue,
			});
			results.push(ingested);
		}

		return NextResponse.json({ received: true, results });
	} catch (error) {
		console.error("[webhooks/hubspot]", error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Webhook error" },
			{ status: 400 },
		);
	}
}
