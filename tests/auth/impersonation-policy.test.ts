import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";
import {
	clampImpersonationTtlMinutes,
	DEFAULT_IMPERSONATION_TTL_MINUTES,
	isPrivilegedImpersonationTarget,
	isSameUserIdentity,
	MAX_IMPERSONATION_TTL_MINUTES,
	MIN_IMPERSONATION_TTL_MINUTES,
	normalizeImpersonationReason,
} from "@/lib/impersonation/policy";
import { shouldBlockImpersonationMutation } from "@/lib/impersonation/session";

describe("impersonation policy", () => {
	it("requires a ticket-style reason", () => {
		expect(normalizeImpersonationReason("").ok).toBe(false);
		expect(normalizeImpersonationReason("short").ok).toBe(false);
		expect(normalizeImpersonationReason("TKT-2026-0042").ok).toBe(true);
	});

	it("clamps TTL to 15–60 minutes", () => {
		expect(clampImpersonationTtlMinutes(Number.NaN)).toBe(
			DEFAULT_IMPERSONATION_TTL_MINUTES,
		);
		expect(clampImpersonationTtlMinutes(5)).toBe(MIN_IMPERSONATION_TTL_MINUTES);
		expect(clampImpersonationTtlMinutes(90)).toBe(
			MAX_IMPERSONATION_TTL_MINUTES,
		);
		expect(clampImpersonationTtlMinutes(30)).toBe(30);
	});

	it("rejects self impersonation by profile or account id", () => {
		expect(
			isSameUserIdentity(
				{ $id: "user-1", accountId: "acct-1" },
				{ $id: "user-1", accountId: "acct-1" },
			),
		).toBe(true);
		expect(
			isSameUserIdentity(
				{ $id: "user-1", accountId: "acct-1" },
				{ $id: "user-2", accountId: "acct-1" },
			),
		).toBe(true);
		expect(
			isSameUserIdentity(
				{ $id: "user-1", accountId: "acct-1" },
				{ $id: "user-2", accountId: "acct-2" },
			),
		).toBe(false);
	});

	it("treats impersonate and platform keys as privileged targets", () => {
		expect(isPrivilegedImpersonationTarget([PERMISSIONS.USERS.VIEW])).toBe(
			false,
		);
		expect(
			isPrivilegedImpersonationTarget([PERMISSIONS.USERS.IMPERSONATE]),
		).toBe(true);
		expect(
			isPrivilegedImpersonationTarget([PERMISSIONS.PLATFORM.ELEVATE]),
		).toBe(true);
	});

	it("does not treat a Super Admin role name as privileged by itself", () => {
		expect(isPrivilegedImpersonationTarget(["Super Admin"])).toBe(false);
	});
});

describe("impersonation read-only mutation guard", () => {
	it("allows GET while impersonating", () => {
		expect(
			shouldBlockImpersonationMutation("GET", "/api/contracts/all", true),
		).toBe(false);
	});

	it("blocks POST while impersonating except impersonation control routes", () => {
		expect(
			shouldBlockImpersonationMutation("POST", "/api/user/update", true),
		).toBe(true);
		expect(
			shouldBlockImpersonationMutation("POST", "/api/impersonation/end", true),
		).toBe(false);
		expect(
			shouldBlockImpersonationMutation("POST", "/api/user/update", false),
		).toBe(false);
	});
});
