import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "caalm_demo_verified";
const TTL_MS = 30 * 60 * 1000;

function secret(): string {
	const value =
		process.env.DEMO_REQUEST_COOKIE_SECRET ||
		process.env.CRON_SECRET ||
		"";
	if (!value && process.env.NODE_ENV === "production") {
		throw new Error("DEMO_REQUEST_COOKIE_SECRET is not configured");
	}
	return value || "dev-demo-request-cookie";
}

export function demoVerifiedCookieName(): string {
	return COOKIE;
}

export function signDemoVerifiedCookie(email: string): string {
	const exp = Date.now() + TTL_MS;
	const payload = Buffer.from(`${email.toLowerCase()}|${exp}`).toString(
		"base64url",
	);
	const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
	return `${payload}.${sig}`;
}

export function readDemoVerifiedEmail(token: string | undefined): string | null {
	if (!token) return null;
	const [payload, sig] = token.split(".");
	if (!payload || !sig) return null;
	const expected = createHmac("sha256", secret())
		.update(payload)
		.digest("base64url");
	const a = Buffer.from(sig);
	const b = Buffer.from(expected);
	if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
	const decoded = Buffer.from(payload, "base64url").toString("utf8");
	const [email, expRaw] = decoded.split("|");
	const exp = Number(expRaw);
	if (!email || !Number.isFinite(exp) || Date.now() > exp) return null;
	return email;
}
