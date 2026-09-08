import { createHmac, timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/actions/user.actions";

export const STEP_UP_COOKIE = "caalm_step_up";
export const STEP_UP_TTL_MS = 5 * 60 * 1000;
export const STEP_UP_REQUIRED_CODE = "STEP_UP_REQUIRED";

interface StepUpPayload {
	userId: string;
	exp: number;
}

function stepUpSecret(): string {
	const secret =
		process.env.STEP_UP_SECRET ||
		process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY ||
		process.env.NEXT_APPWRITE_API_KEY;
	if (!secret) {
		throw new Error("Step-up signing secret is not configured");
	}
	return secret;
}

function signPayload(payload: StepUpPayload): string {
	const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
	const sig = createHmac("sha256", stepUpSecret())
		.update(body)
		.digest("base64url");
	return `${body}.${sig}`;
}

function parseGrant(token: string | undefined): StepUpPayload | null {
	if (!token) return null;
	const [body, sig] = token.split(".");
	if (!body || !sig) return null;

	const expected = createHmac("sha256", stepUpSecret())
		.update(body)
		.digest("base64url");

	try {
		const sigBuf = Buffer.from(sig);
		const expectedBuf = Buffer.from(expected);
		if (
			sigBuf.length !== expectedBuf.length ||
			!timingSafeEqual(sigBuf, expectedBuf)
		) {
			return null;
		}
	} catch {
		return null;
	}

	try {
		const payload = JSON.parse(
			Buffer.from(body, "base64url").toString("utf8"),
		) as StepUpPayload;
		if (!payload.userId || typeof payload.exp !== "number") return null;
		if (payload.exp <= Date.now()) return null;
		return payload;
	} catch {
		return null;
	}
}

export function readStepUpGrant(
	request: NextRequest,
	userId: string,
): { verified: boolean; expiresAt: string | null } {
	const token = request.cookies.get(STEP_UP_COOKIE)?.value;
	const payload = parseGrant(token);
	if (!payload || payload.userId !== userId) {
		return { verified: false, expiresAt: null };
	}
	return {
		verified: true,
		expiresAt: new Date(payload.exp).toISOString(),
	};
}

export function hasValidStepUp(request: NextRequest, userId: string): boolean {
	return readStepUpGrant(request, userId).verified;
}

export function issueStepUpGrant(
	userId: string,
	response: NextResponse,
): string {
	const exp = Date.now() + STEP_UP_TTL_MS;
	const token = signPayload({ userId, exp });
	const isProd = process.env.NODE_ENV === "production";

	response.cookies.set(STEP_UP_COOKIE, token, {
		httpOnly: true,
		secure: isProd,
		sameSite: "lax",
		path: "/",
		maxAge: Math.floor(STEP_UP_TTL_MS / 1000),
	});

	return new Date(exp).toISOString();
}

export function clearStepUpGrant(response: NextResponse): void {
	response.cookies.set(STEP_UP_COOKIE, "", {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: 0,
	});
}

/** Returns 403 when step-up verification is missing or expired. */
export function requireStepUp(
	request: NextRequest,
	userId: string,
): NextResponse | null {
	if (hasValidStepUp(request, userId)) {
		return null;
	}
	return NextResponse.json(
		{
			code: STEP_UP_REQUIRED_CODE,
			error: "Verification required",
		},
		{ status: 403 },
	);
}

/** After requirePermission: returns 403 when step-up grant is missing. */
export async function requireStepUpForSession(
	request: NextRequest,
): Promise<NextResponse | null> {
	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}
	return requireStepUp(request, user.$id);
}
