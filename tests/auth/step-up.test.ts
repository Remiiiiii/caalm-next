import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	hasValidStepUp,
	issueStepUpGrant,
	readStepUpGrant,
	requireStepUp,
	STEP_UP_COOKIE,
	STEP_UP_REQUIRED_CODE,
	STEP_UP_TTL_MS,
} from "@/lib/auth/step-up";

const TEST_SECRET = "test-step-up-secret-key";

function requestWithStepUpCookie(token: string): NextRequest {
	return new NextRequest("http://localhost/", {
		headers: { cookie: `${STEP_UP_COOKIE}=${token}` },
	});
}

function extractGrantToken(response: NextResponse): string {
	const setCookie = response.headers.getSetCookie().join("; ");
	const match = setCookie.match(new RegExp(`${STEP_UP_COOKIE}=([^;]+)`));
	if (!match?.[1]) {
		throw new Error("Step-up cookie was not set on response");
	}
	return match[1];
}

describe("step-up grant cookie", () => {
	beforeEach(() => {
		vi.stubEnv("STEP_UP_SECRET", TEST_SECRET);
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.useRealTimers();
	});

	it("issues a grant that validates for the same user", () => {
		const response = NextResponse.json({});
		const expiresAt = issueStepUpGrant("user-abc", response);
		const token = extractGrantToken(response);

		const request = requestWithStepUpCookie(token);
		expect(hasValidStepUp(request, "user-abc")).toBe(true);
		expect(readStepUpGrant(request, "user-abc")).toEqual({
			verified: true,
			expiresAt,
		});
		expect(requireStepUp(request, "user-abc")).toBeNull();
	});

	it("rejects a grant when the user id does not match", () => {
		const response = NextResponse.json({});
		issueStepUpGrant("user-abc", response);
		const token = extractGrantToken(response);

		const request = requestWithStepUpCookie(token);
		expect(hasValidStepUp(request, "user-other")).toBe(false);
		const denied = requireStepUp(request, "user-other");
		expect(denied?.status).toBe(403);
	});

	it("expires grants after the TTL", async () => {
		vi.useFakeTimers();
		const now = Date.now();
		vi.setSystemTime(now);

		const response = NextResponse.json({});
		issueStepUpGrant("user-abc", response);
		const token = extractGrantToken(response);

		vi.setSystemTime(now + STEP_UP_TTL_MS + 1);
		const request = requestWithStepUpCookie(token);
		expect(hasValidStepUp(request, "user-abc")).toBe(false);

		const denied = requireStepUp(request, "user-abc");
		expect(denied?.status).toBe(403);
		expect(await denied?.json()).toEqual({
			code: STEP_UP_REQUIRED_CODE,
			error: "Verification required",
		});
	});
});
