/**
 * Phase 1 read-only impersonation: effective-user authz and mutation 403.
 */

import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";
import { IMPERSONATION_READ_ONLY_ERROR } from "@/lib/impersonation/mutation-guard";

const mockGetEffectiveUser = vi.fn();
const mockAuthorize = vi.fn();

vi.mock("@/lib/impersonation/effective-user", () => ({
	getEffectiveUser: (...args: unknown[]) => mockGetEffectiveUser(...args),
}));

vi.mock("@/lib/rbac/authorize", () => ({
	authorize: (...args: unknown[]) => mockAuthorize(...args),
}));

function request(url: string, method: string): NextRequest {
	return new NextRequest(url, { method });
}

describe("requirePermission during impersonation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetEffectiveUser.mockResolvedValue({
			actor: { $id: "admin-1", fullName: "Ada Admin" },
			effectiveUser: { $id: "user-2", fullName: "Jane Viewer" },
			impersonation: {
				actorUserId: "admin-1",
				targetUserId: "user-2",
				orgId: "org-1",
				reason: "TKT-2026-0042",
				startedAt: new Date().toISOString(),
				expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
				target: { $id: "user-2", fullName: "Jane Viewer", email: "jane@x.com" },
			},
		});
		mockAuthorize.mockResolvedValue({ allowed: true, userId: "user-2" });
	});

	it("authorizes product GETs as the target user, not the actor", async () => {
		const { requirePermission } = await import("@/lib/rbac/middleware");
		const result = await requirePermission(
			request("http://localhost:3000/api/contracts/all", "GET"),
			{ permission: PERMISSIONS.CONTRACTS.VIEW },
		);
		expect(result).toBeNull();
		expect(mockAuthorize).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: "user-2",
				permission: PERMISSIONS.CONTRACTS.VIEW,
			}),
		);
	});

	it("does not treat Super Admin as a bypass", () => {
		const source = readFileSync("src/lib/rbac/middleware.ts", "utf8");
		expect(source).not.toMatch(/Super Admin/);
		expect(source).toContain("getEffectiveUser");
	});

	it("wires permissions/check and proxy to effective-user read-only rules", () => {
		const check = readFileSync(
			"src/app/api/permissions/check/route.ts",
			"utf8",
		);
		expect(check).toContain("getEffectiveUser");
		expect(check).not.toMatch(/Super Admin/);
		const proxy = readFileSync("src/proxy.ts", "utf8");
		expect(proxy).toContain("shouldBlockImpersonationMutation");
		const layout = readFileSync("src/app/(root)/layout.tsx", "utf8");
		expect(layout).toContain("ImpersonationBanner");
		const users = readFileSync(
			"src/app/(root)/dashboard/UserManagement.tsx",
			"utf8",
		);
		expect(users).toContain("View as user");
		expect(users).toContain("PERMISSIONS.USERS.IMPERSONATE");
		expect(users).not.toMatch(/role === ['"]Super Admin['"]/);
	});

	it("returns 403 for mutating APIs while impersonating", async () => {
		const { requirePermission } = await import("@/lib/rbac/middleware");
		const result = await requirePermission(
			request("http://localhost:3000/api/user/update", "PATCH"),
			{ permission: PERMISSIONS.USERS.EDIT },
		);
		expect(result).not.toBeNull();
		expect(result?.status).toBe(403);
		const body = await result?.json();
		expect(body.code).toBe("IMPERSONATION_READ_ONLY");
		expect(body.error).toBe(IMPERSONATION_READ_ONLY_ERROR);
		expect(mockAuthorize).not.toHaveBeenCalled();
	});

	it("still authorizes impersonation start as the actor", async () => {
		const { requirePermission } = await import("@/lib/rbac/middleware");
		const result = await requirePermission(
			request("http://localhost:3000/api/impersonation/start", "POST"),
			{ permission: PERMISSIONS.USERS.IMPERSONATE, useActor: true },
		);
		expect(result).toBeNull();
		expect(mockAuthorize).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: "admin-1",
				permission: PERMISSIONS.USERS.IMPERSONATE,
			}),
		);
	});
});
