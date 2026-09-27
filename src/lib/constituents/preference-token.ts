import { createHmac, timingSafeEqual } from "node:crypto";

export type ParsedPreferenceToken = {
	orgId: string;
	constituentId: string;
	expiresAt: number;
};

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 365;

function preferenceTokenSecret(): string {
	return (
		process.env.PREFERENCE_TOKEN_SECRET ||
		process.env.ESIGN_TOKEN_SECRET ||
		process.env.NEXT_APPWRITE_API_KEY ||
		"caalm-preference-dev-token-secret"
	);
}

function hmacPart(
	orgId: string,
	constituentId: string,
	expiresAt: number,
	secret: string,
): string {
	return createHmac("sha256", secret)
		.update(`${orgId}.${constituentId}.${expiresAt}`)
		.digest("base64url");
}

export function createPreferenceToken(
	orgId: string,
	constituentId: string,
	options?: { expiresAt?: number; secret?: string },
): string {
	const secret = options?.secret ?? preferenceTokenSecret();
	const expiresAt =
		options?.expiresAt ?? Math.floor(Date.now() / 1000) + DEFAULT_TTL_SECONDS;
	const mac = hmacPart(orgId, constituentId, expiresAt, secret);
	return `${orgId}.${constituentId}.${expiresAt}.${mac}`;
}

export function parsePreferenceToken(
	token: string,
	secret = preferenceTokenSecret(),
): ParsedPreferenceToken | null {
	const parts = token.split(".");
	if (parts.length !== 4) return null;
	const [orgId, constituentId, expRaw, mac] = parts;
	if (!orgId || !constituentId || !expRaw || !mac) return null;
	const expiresAt = Number(expRaw);
	if (!Number.isFinite(expiresAt)) return null;

	const expected = hmacPart(orgId, constituentId, expiresAt, secret);
	const a = Buffer.from(expected);
	const b = Buffer.from(mac);
	if (a.length !== b.length) return null;
	if (!timingSafeEqual(a, b)) return null;

	return { orgId, constituentId, expiresAt };
}

export function verifyPreferenceToken(
	token: string,
	options?: { secret?: string; nowSeconds?: number },
):
	| { ok: true; parsed: ParsedPreferenceToken }
	| { ok: false; reason: "invalid" | "expired" } {
	const parsed = parsePreferenceToken(token, options?.secret);
	if (!parsed) return { ok: false, reason: "invalid" };
	const now = options?.nowSeconds ?? Math.floor(Date.now() / 1000);
	if (parsed.expiresAt < now) return { ok: false, reason: "expired" };
	return { ok: true, parsed };
}

export function preferenceCenterPath(token: string): string {
	return `/preferences/${encodeURIComponent(token)}`;
}

export function preferenceCenterUrl(token: string, baseUrl?: string): string {
	const origin =
		baseUrl ||
		process.env.NEXT_PUBLIC_APP_URL ||
		process.env.NEXT_PUBLIC_SITE_URL ||
		"";
	const path = preferenceCenterPath(token);
	return origin ? `${origin.replace(/\/$/, "")}${path}` : path;
}
