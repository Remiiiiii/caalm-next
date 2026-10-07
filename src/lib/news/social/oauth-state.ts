import { createHmac, timingSafeEqual } from "node:crypto";

export type NewsOAuthState = {
	orgId: string;
	userId: string;
	provider: "linkedin" | "x";
	exp: number;
};

function secret(): string {
	return (
		process.env.NEWS_OAUTH_ENCRYPTION_KEY ||
		process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY ||
		process.env.STEP_UP_SECRET ||
		process.env.CRON_SECRET ||
		""
	);
}

export function signNewsOAuthState(payload: NewsOAuthState): string {
	const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
	const sig = createHmac("sha256", secret()).update(body).digest("base64url");
	return `${body}.${sig}`;
}

export function parseNewsOAuthState(token: string | undefined): NewsOAuthState | null {
	if (!token) return null;
	const [body, sig] = token.split(".");
	if (!body || !sig) return null;
	const expected = createHmac("sha256", secret())
		.update(body)
		.digest("base64url");
	const sigBuf = Buffer.from(sig);
	const expectedBuf = Buffer.from(expected);
	if (
		sigBuf.length !== expectedBuf.length ||
		!timingSafeEqual(sigBuf, expectedBuf)
	) {
		return null;
	}
	try {
		const payload = JSON.parse(
			Buffer.from(body, "base64url").toString("utf8"),
		) as NewsOAuthState;
		if (!payload.orgId || !payload.userId || payload.exp < Date.now()) {
			return null;
		}
		return payload;
	} catch {
		return null;
	}
}
