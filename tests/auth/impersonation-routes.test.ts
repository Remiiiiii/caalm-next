/**
 * Impersonation start/end/status: permission gate, org scope, no role-name bypass.
 */

import { readFileSync } from "node:fs";
import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";
import { IMPERSONATION_COOKIE } from "@/lib/impersonation/session";

const mockRequirePermission = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockGetUserById = vi.fn();
const mockGetUserDefaultOrganization = vi.fn();
const mockGetUserPermissions = vi.fn();
const mockValidateUserOrgAccess = vi.fn();
const mockLogAuditEvent = vi.fn();

vi.mock("@/lib/rbac/middleware", () => ({
	requirePermission: (req: NextRequest, opts: unknown) =>
		mockRequirePermission(req, opts),
	getOrgIdFromRequest: () => "org-1",
}));

vi.mock("@/lib/auth/step-up", () => ({
	requireStepUpForSession: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/actions/user.actions", () => ({
	getCurrentUser: () => mockGetCurrentUser(),
	getUserById: (id: string) => mockGetUserById(id),
}));

vi.mock("@/lib/rbac/permissions", () => ({
	getUserDefaultOrganization: (userId: string) =>
		mockGetUserDefaultOrganization(userId),
	getUserPermissions: (userId: string, orgId?: string) =>
		mockGetUserPermissions(userId, orgId),
	validateUserOrgAccess: (userId: string, orgId: string) =>
		mockValidateUserOrgAccess(userId, orgId),
}));

vi.mock("@/lib/services/audit-logger", () => ({
	logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
}));

function jsonRequest(
	url: string,
	method: string,
	body?: unknown,
	cookie?: string,
): NextRequest {
	return new NextRequest(url, {
		method,
		headers: {
			"Content-Type": "application/json",
			...(cookie ? { cookie } : {}),
		},
		body: body ? JSON.stringify(body) : undefined,
	});
}

describe("impersonation APIs", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubEnv("IMPERSONATION_SECRET", "test-impersonation-secret");
		vi.stubEnv("IMPERSONATION_TTL_MINUTES", "30");
		mockRequirePermission.mockResolvedValue(null);
		mockGetCurrentUser.mockResolvedValue({
			$id: "admin-1",
			accountId: "acct-admin",
			fullName: "Ada Admin",
			email: "ada@example.com",
		});
		mockGetUserDefaultOrganization.mockResolvedValue({
			orgId: "org-1",
			orgRole: "member",
		});
		mockValidateUserOrgAccess.mockResolvedValue(true);
		mockGetUserPermissions.mockResolvedValue([PERMISSIONS.CONTRACTS.VIEW]);
		mockGetUserById.mockResolvedValue({
			$id: "user-2",
			accountId: "acct-2",
			fullName: "Jane Viewer",
			email: "jane@example.com",
		});
		mockLogAuditEvent.mockResolvedValue(undefined);
	});

	it("does not use a Super Admin role-name bypass in the start route", () => {
		const source = readFileSync(
			"src/app/api/impersonation/start/route.ts",
			"utf8",
		);
		expect(source).not.toMatch(/Super Admin/);
		expect(source).toContain("PERMISSIONS.USERS.IMPERSONATE");
		expect(source).toContain("requirePermission");
		expect(source).toContain("requireStepUpForSession");
	});

	it("returns 403 when the actor lacks users.impersonate", async () => {
		mockRequirePermission.mockResolvedValue(
			NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }),
		);
		const { POST } = await import("@/app/api/impersonation/start/route");
		const response = await POST(
			jsonRequest("http://localhost:3000/api/impersonation/start", "POST", {
				targetUserId: "user-2",
				reason: "TKT-2026-0042",
			}),
		);
		expect(response.status).toBe(403);
		expect(mockGetUserById).not.toHaveBeenCalled();
		expect(mockLogAuditEvent).toHaveBeenCalled();
	});

	it("starts a session for an org peer and sets the httpOnly cookie", async () => {
		const { POST } = await import("@/app/api/impersonation/start/route");
		const response = await POST(
			jsonRequest("http://localhost:3000/api/impersonation/start", "POST", {
				targetUserId: "user-2",
				reason: "TKT-2026-0042 support review",
			}),
		);
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.active).toBe(true);
		expect(body.target.$id).toBe("user-2");
		expect(body.readOnly).toBe(true);
		const setCookie = response.headers.get("set-cookie") || "";
		expect(setCookie).toContain(IMPERSONATION_COOKIE);
		expect(setCookie.toLowerCase()).toContain("httponly");
		expect(mockRequirePermission).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				permission: PERMISSIONS.USERS.IMPERSONATE,
			}),
		);
	});

	it("rejects impersonating a user who has users.impersonate", async () => {
		mockGetUserPermissions.mockResolvedValue([
			PERMISSIONS.USERS.IMPERSONATE,
			PERMISSIONS.USERS.VIEW,
		]);
		const { POST } = await import("@/app/api/impersonation/start/route");
		const response = await POST(
			jsonRequest("http://localhost:3000/api/impersonation/start", "POST", {
				targetUserId: "user-2",
				reason: "TKT-2026-0042",
			}),
		);
		expect(response.status).toBe(403);
		expect(response.headers.get("set-cookie")).toBeNull();
	});

	it("rejects self impersonation", async () => {
		mockGetUserById.mockResolvedValue({
			$id: "admin-1",
			accountId: "acct-admin",
			fullName: "Ada Admin",
			email: "ada@example.com",
		});
		const { POST } = await import("@/app/api/impersonation/start/route");
		const response = await POST(
			jsonRequest("http://localhost:3000/api/impersonation/start", "POST", {
				targetUserId: "admin-1",
				reason: "TKT-2026-0042",
			}),
		);
		expect(response.status).toBe(400);
	});

	it("rejects cross-org targets", async () => {
		mockValidateUserOrgAccess.mockImplementation(
			async (userId: string) => userId === "admin-1",
		);
		const { POST } = await import("@/app/api/impersonation/start/route");
		const response = await POST(
			jsonRequest("http://localhost:3000/api/impersonation/start", "POST", {
				targetUserId: "user-2",
				reason: "TKT-2026-0042",
			}),
		);
		expect(response.status).toBe(403);
	});

	it("ends the session when the actor matches", async () => {
		const { POST: start } = await import("@/app/api/impersonation/start/route");
		const started = await start(
			jsonRequest("http://localhost:3000/api/impersonation/start", "POST", {
				targetUserId: "user-2",
				reason: "TKT-2026-0042 support review",
			}),
		);
		const cookie = (started.headers.get("set-cookie") || "")
			.split(";")[0]
			.trim();
		const { POST: end } = await import("@/app/api/impersonation/end/route");
		const ended = await end(
			jsonRequest(
				"http://localhost:3000/api/impersonation/end",
				"POST",
				{},
				cookie,
			),
		);
		expect(ended.status).toBe(200);
		const body = await ended.json();
		expect(body.active).toBe(false);
	});
});
