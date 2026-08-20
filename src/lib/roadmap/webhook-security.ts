import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify GitHub-style HMAC (sha256=...) or a bare hex digest for CI callbacks.
 */
export function verifyRoadmapWebhookSignature(
	payload: string,
	signatureHeader: string | null,
	secret: string,
): boolean {
	if (!signatureHeader || !secret) return false;
	const digest = createHmac("sha256", secret).update(payload).digest("hex");
	const expected = signatureHeader.startsWith("sha256=")
		? `sha256=${digest}`
		: digest;
	const a = Buffer.from(expected);
	const b = Buffer.from(signatureHeader);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}

export function getRoadmapWebhookSecret(): string {
	return (
		process.env.ROADMAP_WEBHOOK_SECRET ||
		process.env.GITHUB_WEBHOOK_SECRET ||
		""
	);
}
