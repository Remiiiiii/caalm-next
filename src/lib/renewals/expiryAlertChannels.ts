export type AlertChannel = "email" | "sms" | "in_app";

const KNOWN_CHANNELS = new Set<AlertChannel>(["email", "sms", "in_app"]);

/** Default when contract has no enterprise alertChannels saved. */
export const DEFAULT_ALERT_CHANNELS: AlertChannel[] = ["email", "in_app"];

function splitRawChannelToken(token: string): string[] {
	return token
		.split(/[,|]/)
		.map((part) => part.trim().toLowerCase().replace(/-/g, "_"))
		.filter(Boolean);
}

/**
 * Normalize alertChannels from enterprise metadata (string[] or comma string).
 * Unknown tokens are ignored. Empty / missing → default channels.
 */
export function parseAlertChannels(raw: unknown): Set<AlertChannel> {
	const tokens: string[] = [];

	if (Array.isArray(raw)) {
		for (const item of raw) {
			if (typeof item === "string") {
				tokens.push(...splitRawChannelToken(item));
			}
		}
	} else if (typeof raw === "string" && raw.trim()) {
		tokens.push(...splitRawChannelToken(raw));
	}

	const channels = new Set<AlertChannel>();
	for (const token of tokens) {
		if (KNOWN_CHANNELS.has(token as AlertChannel)) {
			channels.add(token as AlertChannel);
		}
	}

	if (channels.size === 0) {
		for (const channel of DEFAULT_ALERT_CHANNELS) {
			channels.add(channel);
		}
	}

	return channels;
}

/** Normalize recipient id lists from enterprise metadata. */
export function parseAlertRecipientIds(raw: unknown): string[] {
	if (Array.isArray(raw)) {
		return raw
			.map((id) => (typeof id === "string" ? id.trim() : ""))
			.filter(Boolean);
	}
	if (typeof raw === "string" && raw.trim()) {
		return raw
			.split(/[,\n]/)
			.map((id) => id.trim())
			.filter(Boolean);
	}
	return [];
}

/** Short SMS body (Twilio truncates at 160). */
export function buildExpirySmsMessage(params: {
	entityLabel: string;
	name: string;
	daysUntil: number;
	expirySlice: string;
	autoRenew: boolean;
}): string {
	const action = params.autoRenew ? "renews" : "expires";
	const base = `CAALM: ${params.entityLabel} "${params.name}" ${action} in ${params.daysUntil}d (${params.expirySlice}).`;
	return base.length > 160 ? `${base.slice(0, 157)}...` : base;
}
