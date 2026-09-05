import { describe, expect, it } from "vitest";
import {
	isDealStageChange,
	parseHubSpotWebhookEvents,
	verifyHubSpotSignature,
} from "./hubspot-webhook";
import { createHmac } from "node:crypto";

describe("HubSpot webhook helpers", () => {
	it("parses stage-change events", () => {
		const events = parseHubSpotWebhookEvents(
			JSON.stringify([
				{
					objectId: 99,
					propertyName: "dealstage",
					propertyValue: "closedwon",
					subscriptionType: "deal.propertyChange",
					portalId: 111,
				},
			]),
		);
		expect(events).toHaveLength(1);
		expect(isDealStageChange(events[0])).toBe(true);
	});

	it("verifies v3 HMAC signatures", () => {
		const secret = "test-secret";
		const body = "[]";
		const timestamp = String(Date.now());
		const source = `POST/api/webhooks/hubspot${body}${timestamp}`;
		const signature = createHmac("sha256", secret).update(source).digest("base64");
		expect(
			verifyHubSpotSignature({
				method: "POST",
				uri: "/api/webhooks/hubspot",
				body,
				timestamp,
				signature,
				clientSecret: secret,
			}),
		).toBe(true);
	});
});
