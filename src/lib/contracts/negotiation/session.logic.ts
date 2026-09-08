import { createHmac, timingSafeEqual } from "node:crypto";

export const NEGOTIATE_SESSION_COOKIE = "caalm_negotiate_session";

/** Session lifetime after successful OTP (7 days). */
export const NEGOTIATE_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type NegotiateSessionPayload = {
	accessId: string;
	email: string;
	exp: number;
};

function sessionSecret(): string {
	return (
		process.env.NEGOTIATE_SESSION_SECRET ||
		process.env.NEXT_APPWRITE_API_KEY ||
		process.env.CRON_SECRET ||
		"dev-negotiate-session-secret"
	);
}

function sign(body: string): string {
	return createHmac("sha256", sessionSecret()).update(body).digest("base64url");
}

/** Encode accessId + verified email into a signed cookie value. */
export function encodeNegotiateSession(
	payload: Omit<NegotiateSessionPayload, "exp"> & { exp?: number },
): string {
	const exp = payload.exp ?? Date.now() + NEGOTIATE_SESSION_TTL_MS;
	const body = Buffer.from(
		JSON.stringify({
			accessId: payload.accessId,
			email: payload.email.trim().toLowerCase(),
			exp,
		} satisfies NegotiateSessionPayload),
	).toString("base64url");
	return `${body}.${sign(body)}`;
}

/** Verify signature + expiry. Returns null if invalid. */
export function decodeNegotiateSession(
	raw: string | undefined | null,
): NegotiateSessionPayload | null {
	if (!raw?.includes(".")) return null;
	const [body, signature] = raw.split(".");
	if (!body || !signature) return null;
	const expected = sign(body);
	try {
		const a = Buffer.from(signature);
		const b = Buffer.from(expected);
		if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
	} catch {
		return null;
	}
	try {
		const parsed = JSON.parse(
			Buffer.from(body, "base64url").toString("utf8"),
		) as NegotiateSessionPayload;
		if (!parsed.accessId || !parsed.email || !parsed.exp) return null;
		if (Date.now() > Number(parsed.exp)) return null;
		return {
			accessId: String(parsed.accessId),
			email: String(parsed.email).trim().toLowerCase(),
			exp: Number(parsed.exp),
		};
	} catch {
		return null;
	}
}

export function negotiateSessionCookieOptions(maxAgeSec: number) {
	return {
		httpOnly: true as const,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax" as const,
		path: "/",
		maxAge: maxAgeSec,
	};
}
