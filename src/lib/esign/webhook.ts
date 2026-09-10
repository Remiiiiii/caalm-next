import { createHmac, timingSafeEqual } from "node:crypto";
import { recordRecipientEvent } from "./envelope-service";
import type { EsignWebhookEventName, WebhookResult } from "./types";

export type NativeWebhookPayload = {
	eventId: string;
	event: EsignWebhookEventName;
	envelopeId: string;
	recipientId?: string;
	signatureDataUrl?: string;
	fieldValues?: Record<string, string>;
};

function webhookSecret(): string {
	return process.env.ESIGN_WEBHOOK_SECRET || process.env.ESIGN_TOKEN_SECRET || "";
}

export function verifyEsignWebhookSignature(
	payload: string,
	signatureHeader: string | null,
	secret = webhookSecret(),
): boolean {
	if (!signatureHeader || !secret) return false;
	const expected = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
	const a = Buffer.from(expected);
	const b = Buffer.from(signatureHeader);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}

function recipientStatusForEvent(event: EsignWebhookEventName) {
	switch (event) {
		case "envelope.viewed":
			return "viewed" as const;
		case "envelope.signed":
		case "envelope.completed":
			return "signed" as const;
		case "envelope.declined":
			return "declined" as const;
		default:
			return "sent" as const;
	}
}

export async function handleNativeWebhook(
	payload: NativeWebhookPayload,
): Promise<WebhookResult> {
	if (!payload.envelopeId || !payload.eventId || !payload.event) {
		throw new Error("Invalid webhook payload");
	}

	if (!payload.recipientId) {
		const { getEnvelope } = await import("./envelope-service");
		const envelope = await getEnvelope(payload.envelopeId);
		if (!envelope) throw new Error("Envelope not found");
		return {
			duplicate: envelope.processedEventIds.includes(payload.eventId),
			event: payload.event,
			envelopeId: envelope.$id,
			status: envelope.status,
		};
	}

	const envelope = await recordRecipientEvent({
		envelopeId: payload.envelopeId,
		recipientId: payload.recipientId,
		nextStatus: recipientStatusForEvent(payload.event),
		signatureDataUrl: payload.signatureDataUrl,
		fieldValues: payload.fieldValues,
		eventId: payload.eventId,
	});

	return {
		duplicate: false,
		event: payload.event,
		envelopeId: envelope.$id,
		status: envelope.status,
	};
}
