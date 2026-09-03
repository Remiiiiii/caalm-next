import { createHmac, timingSafeEqual } from "node:crypto";

type HubSpotWebhookEvent = {
	objectId?: number | string;
	propertyName?: string;
	propertyValue?: string;
	subscriptionType?: string;
	portalId?: number | string;
};

export function verifyHubSpotSignature(input: {
	method: string;
	uri: string;
	body: string;
	timestamp: string | null;
	signature: string | null;
	clientSecret: string;
}): boolean {
	const { method, uri, body, timestamp, signature, clientSecret } = input;
	if (!clientSecret || !signature) return false;

	if (timestamp) {
		const ageMs = Math.abs(Date.now() - Number(timestamp));
		if (!Number.isFinite(ageMs) || ageMs > 5 * 60 * 1000) return false;
		const source = `${method}${uri}${body}${timestamp}`;
		const expected = createHmac("sha256", clientSecret)
			.update(source)
			.digest("base64");
		return safeEqual(expected, signature);
	}

	const v1 = createHmac("sha256", clientSecret).update(body).digest("hex");
	return safeEqual(v1, signature);
}

function safeEqual(expected: string, actual: string): boolean {
	const a = Buffer.from(expected);
	const b = Buffer.from(actual);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}

export function parseHubSpotWebhookEvents(payload: string): HubSpotWebhookEvent[] {
	const parsed = JSON.parse(payload) as unknown;
	if (Array.isArray(parsed)) return parsed as HubSpotWebhookEvent[];
	if (parsed && typeof parsed === "object" && "objectId" in parsed) {
		return [parsed as HubSpotWebhookEvent];
	}
	return [];
}

export function isDealStageChange(event: HubSpotWebhookEvent): boolean {
	return (
		event.subscriptionType === "deal.propertyChange" &&
		event.propertyName === "dealstage"
	);
}
