import { createHmac, timingSafeEqual } from "node:crypto";

export type ParsedRegistrationToken = {
	registrationId: string;
	orgId: string;
	expiresAt: number;
};

export type VerifyRegistrationTokenResult =
	| { ok: true; parsed: ParsedRegistrationToken }
	| {
			ok: false;
			reason: "invalid" | "expired" | "already_used";
	  };

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 30;

function registrationTokenSecret(): string {
	return (
		process.env.EVENT_REGISTRATION_TOKEN_SECRET ||
		process.env.ESIGN_TOKEN_SECRET ||
		process.env.NEXT_APPWRITE_API_KEY ||
		"caalm-event-registration-dev-token-secret"
	);
}

function hmacPart(
	registrationId: string,
	orgId: string,
	expiresAt: number,
	secret: string,
): string {
	return createHmac("sha256", secret)
		.update(`${registrationId}.${orgId}.${expiresAt}`)
		.digest("base64url");
}

/** Signed token for QR check-in: registrationId.orgId.expiresAt.mac */
export function createRegistrationToken(
	registrationId: string,
	orgId: string,
	options?: { expiresAt?: number; secret?: string },
): string {
	const secret = options?.secret ?? registrationTokenSecret();
	const expiresAt =
		options?.expiresAt ?? Math.floor(Date.now() / 1000) + DEFAULT_TTL_SECONDS;
	const mac = hmacPart(registrationId, orgId, expiresAt, secret);
	return `${registrationId}.${orgId}.${expiresAt}.${mac}`;
}

export function parseRegistrationToken(
	token: string,
	secret = registrationTokenSecret(),
): ParsedRegistrationToken | null {
	const parts = token.split(".");
	if (parts.length !== 4) return null;
	const [registrationId, orgId, expRaw, mac] = parts;
	if (!registrationId || !orgId || !expRaw || !mac) return null;
	const expiresAt = Number(expRaw);
	if (!Number.isFinite(expiresAt)) return null;

	const expected = hmacPart(registrationId, orgId, expiresAt, secret);
	const a = Buffer.from(expected);
	const b = Buffer.from(mac);
	if (a.length !== b.length) return null;
	if (!timingSafeEqual(a, b)) return null;

	return { registrationId, orgId, expiresAt };
}

export function verifyRegistrationToken(
	token: string,
	options?: {
		secret?: string;
		tokenUsedAt?: string | null;
		nowSeconds?: number;
	},
): VerifyRegistrationTokenResult {
	const parsed = parseRegistrationToken(token, options?.secret);
	if (!parsed) {
		return { ok: false, reason: "invalid" };
	}

	const now = options?.nowSeconds ?? Math.floor(Date.now() / 1000);
	if (parsed.expiresAt < now) {
		return { ok: false, reason: "expired" };
	}

	if (options?.tokenUsedAt) {
		return { ok: false, reason: "already_used" };
	}

	return { ok: true, parsed };
}

/** QR payload is only the signed token — no email or amounts. */
export function registrationQrPayload(token: string): string {
	return token;
}
