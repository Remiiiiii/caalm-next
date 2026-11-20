import type { WebhookEvent } from "livekit-server-sdk";
import { WebhookReceiver } from "livekit-server-sdk";

/**
 * Verifies and parses a LiveKit webhook POST body. Mirrors the house pattern used
 * by the Stripe/GitHub/HubSpot webhook receivers: raw body + signature header in,
 * typed event out, throws on a bad signature.
 */
export async function verifyLiveKitWebhookEvent(
	body: string,
	authHeader: string | null,
): Promise<WebhookEvent> {
	if (!authHeader) throw new Error("Missing Authorization header");
	const receiver = new WebhookReceiver(
		requireEnv("LIVEKIT_API_KEY"),
		requireEnv("LIVEKIT_API_SECRET"),
	);
	return receiver.receive(body, authHeader);
}

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`Missing ${name} env var for LiveKit`);
	return value;
}
