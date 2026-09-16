import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { clampImpersonationTtlMinutes } from "@/lib/impersonation/policy";

export const IMPERSONATION_COOKIE = "caalm_impersonation";
export const IMPERSONATION_PATH_PREFIX = "/api/impersonation";

export type ImpersonationClaim = {
	actorUserId: string;
	targetUserId: string;
	orgId: string;
	reason: string;
	startedAt: number;
	expiresAt: number;
};

function impersonationSecret(): string {
	const secret =
		process.env.IMPERSONATION_SECRET ||
		process.env.STEP_UP_SECRET ||
		process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY ||
		process.env.NEXT_APPWRITE_API_KEY;
	if (!secret) {
		throw new Error("Impersonation signing secret is not configured");
	}
	return secret;
}

export function impersonationTtlMs(): number {
	const raw = Number.parseInt(
		process.env.IMPERSONATION_TTL_MINUTES || "30",
		10,
	);
	return clampImpersonationTtlMinutes(raw) * 60 * 1000;
}

function signPayload(payload: ImpersonationClaim): string {
	const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
	const sig = createHmac("sha256", impersonationSecret())
		.update(body)
		.digest("base64url");
	return `${body}.${sig}`;
}

export function parseImpersonationClaim(
	token: string | undefined,
): ImpersonationClaim | null {
	if (!token) return null;
	const [body, sig] = token.split(".");
	if (!body || !sig) return null;

	const expected = createHmac("sha256", impersonationSecret())
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
		) as ImpersonationClaim;
		if (
			!payload.actorUserId ||
			!payload.targetUserId ||
			!payload.orgId ||
			typeof payload.startedAt !== "number" ||
			typeof payload.expiresAt !== "number"
		) {
			return null;
		}
		return payload;
	} catch {
		return null;
	}
}

export function isImpersonationClaimActive(
	claim: ImpersonationClaim | null,
	now = Date.now(),
): claim is ImpersonationClaim {
	return Boolean(claim && claim.expiresAt > now);
}

export function readImpersonationClaim(
	request: NextRequest,
): ImpersonationClaim | null {
	return parseImpersonationClaim(
		request.cookies.get(IMPERSONATION_COOKIE)?.value,
	);
}

export function readActiveImpersonationClaim(
	request: NextRequest,
	now = Date.now(),
): ImpersonationClaim | null {
	const claim = readImpersonationClaim(request);
	return isImpersonationClaimActive(claim, now) ? claim : null;
}

export function issueImpersonationCookie(
	response: NextResponse,
	claim: ImpersonationClaim,
): void {
	const isProd = process.env.NODE_ENV === "production";
	const maxAge = Math.max(1, Math.floor((claim.expiresAt - Date.now()) / 1000));
	response.cookies.set(IMPERSONATION_COOKIE, signPayload(claim), {
		httpOnly: true,
		secure: isProd,
		sameSite: "lax",
		path: "/",
		maxAge,
	});
}

export function clearImpersonationCookie(response: NextResponse): void {
	response.cookies.set(IMPERSONATION_COOKIE, "", {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: 0,
	});
}

export function isImpersonationControlPath(pathname: string): boolean {
	return (
		pathname === IMPERSONATION_PATH_PREFIX ||
		pathname.startsWith(`${IMPERSONATION_PATH_PREFIX}/`)
	);
}

/** True when a mutating API call should be blocked during Phase 1 impersonation. */
export function shouldBlockImpersonationMutation(
	method: string,
	pathname: string,
	hasActiveClaim: boolean,
): boolean {
	if (!hasActiveClaim) return false;
	const verb = method.toUpperCase();
	if (verb === "GET" || verb === "HEAD" || verb === "OPTIONS") return false;
	if (isImpersonationControlPath(pathname)) return false;
	return pathname.startsWith("/api/");
}
