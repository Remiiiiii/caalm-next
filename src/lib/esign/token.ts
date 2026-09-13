import { createHmac, timingSafeEqual } from "node:crypto";

export type ParsedSigningToken = {
	envelopeId: string;
	recipientId: string;
};

function signingSecret(): string {
	return (
		process.env.ESIGN_TOKEN_SECRET ||
		process.env.NEXT_APPWRITE_API_KEY ||
		"caalm-execute-dev-token-secret"
	);
}

function hmacPart(envelopeId: string, recipientId: string, secret: string): string {
	return createHmac("sha256", secret)
		.update(`${envelopeId}.${recipientId}`)
		.digest("base64url");
}

/** Build a public signing token: envelopeId.recipientId.mac */
export function createSigningToken(
	envelopeId: string,
	recipientId: string,
	secret = signingSecret(),
): string {
	return `${envelopeId}.${recipientId}.${hmacPart(envelopeId, recipientId, secret)}`;
}

export function parseSigningToken(
	token: string,
	secret = signingSecret(),
): ParsedSigningToken | null {
	const parts = token.split(".");
	if (parts.length !== 3) return null;
	const [envelopeId, recipientId, mac] = parts;
	if (!envelopeId || !recipientId || !mac) return null;

	const expected = hmacPart(envelopeId, recipientId, secret);
	const a = Buffer.from(expected);
	const b = Buffer.from(mac);
	if (a.length !== b.length) return null;
	if (!timingSafeEqual(a, b)) return null;
	return { envelopeId, recipientId };
}

export function signingPagePath(token: string): string {
	return `/sign/${encodeURIComponent(token)}`;
}

export function signingPageUrl(token: string, baseUrl?: string): string {
	const origin =
		baseUrl ||
		process.env.NEXT_PUBLIC_APP_URL ||
		process.env.NEXT_PUBLIC_SITE_URL ||
		"";
	const path = signingPagePath(token);
	return origin ? `${origin.replace(/\/$/, "")}${path}` : path;
}
