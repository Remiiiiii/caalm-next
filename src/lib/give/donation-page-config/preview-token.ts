import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_PREVIEW_TTL_SECONDS = 60 * 30;

function previewSecret(): string {
	return (
		process.env.DONATION_PAGE_PREVIEW_SECRET ||
		process.env.ESIGN_TOKEN_SECRET ||
		process.env.NEXT_APPWRITE_API_KEY ||
		"caalm-donation-preview-dev-secret"
	);
}

function hmacPart(orgId: string, expiresAt: number, secret: string): string {
	return createHmac("sha256", secret)
		.update(`donation-preview.${orgId}.${expiresAt}`)
		.digest("base64url");
}

export function createDonationPagePreviewToken(
	orgId: string,
	options?: { expiresAt?: number; secret?: string },
): string {
	const secret = options?.secret ?? previewSecret();
	const expiresAt =
		options?.expiresAt ?? Math.floor(Date.now() / 1000) + DEFAULT_PREVIEW_TTL_SECONDS;
	const mac = hmacPart(orgId, expiresAt, secret);
	return `${orgId}.${expiresAt}.${mac}`;
}

export function verifyDonationPagePreviewToken(
	token: string,
	options?: { secret?: string; nowSeconds?: number },
):
	| { ok: true; orgId: string }
	| { ok: false; reason: "invalid" | "expired" } {
	const parts = token.split(".");
	if (parts.length !== 3) return { ok: false, reason: "invalid" };
	const [orgId, expRaw, mac] = parts;
	if (!orgId || !expRaw || !mac) return { ok: false, reason: "invalid" };
	const expiresAt = Number(expRaw);
	if (!Number.isFinite(expiresAt)) return { ok: false, reason: "invalid" };

	const secret = options?.secret ?? previewSecret();
	const expected = hmacPart(orgId, expiresAt, secret);
	const a = Buffer.from(expected);
	const b = Buffer.from(mac);
	if (a.length !== b.length || !timingSafeEqual(a, b)) {
		return { ok: false, reason: "invalid" };
	}
	const now = options?.nowSeconds ?? Math.floor(Date.now() / 1000);
	if (expiresAt < now) return { ok: false, reason: "expired" };
	return { ok: true, orgId };
}
