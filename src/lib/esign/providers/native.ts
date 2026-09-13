import {
	createEnvelope,
	getEnvelope,
	sendEnvelope,
} from "../envelope-service";
import { handleNativeWebhook } from "../webhook";
import { signingPageUrl } from "../token";
import type {
	CreateEnvelopeInput,
	EsignProvider,
	WebhookResult,
} from "../types";

export const nativeEsignProvider: EsignProvider = {
	async createEnvelope(input: CreateEnvelopeInput) {
		const envelope = await createEnvelope(input);
		return { envelope };
	},

	async sendEnvelope(envelopeId: string) {
		return sendEnvelope(envelopeId);
	},

	async getSigningUrl(recipientToken: string) {
		return signingPageUrl(recipientToken);
	},

	async handleWebhook(payload: unknown): Promise<WebhookResult> {
		return handleNativeWebhook(payload as Parameters<typeof handleNativeWebhook>[0]);
	},
};

export async function getNativeEnvelope(envelopeId: string) {
	return getEnvelope(envelopeId);
}
