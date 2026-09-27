import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";

const mockRequirePermission = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockValidateUserOrgAccess = vi.fn();
const mockGetOrgPlanLimits = vi.fn();
const mockCountBillableUsers = vi.fn();
const mockListPendingInvitations = vi.fn();

vi.mock("@/lib/rbac/middleware", () => ({
	requirePermission: (req: NextRequest, opts: unknown) =>
		mockRequirePermission(req, opts),
	getOrgIdFromRequest: (req: NextRequest) =>
		req.nextUrl.searchParams.get("orgId") || undefined,
}));

vi.mock("@/lib/actions/user.actions", () => ({
	getCurrentUser: () => mockGetCurrentUser(),
	listPendingInvitations: (args: unknown) => mockListPendingInvitations(args),
	createInvitation: vi.fn(),
}));

vi.mock("@/lib/rbac/permissions", () => ({
	validateUserOrgAccess: (...args: unknown[]) =>
		mockValidateUserOrgAccess(...args),
}));

vi.mock("@/lib/billing/planLimits", () => ({
	getOrgPlanLimits: (...args: unknown[]) => mockGetOrgPlanLimits(...args),
	countBillableUsers: (...args: unknown[]) => mockCountBillableUsers(...args),
}));

describe("GET /api/users/plan-usage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 403 without users.view", async () => {
		mockRequirePermission.mockResolvedValue(
			NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }),
		);
		const { GET } = await import("@/app/api/users/plan-usage/route");
		const request = new NextRequest(
			"http://localhost:3000/api/users/plan-usage?orgId=org-1",
		);
		const response = await GET(request);
		expect(response.status).toBe(403);
		expect(mockRequirePermission).toHaveBeenCalledWith(
			request,
			expect.objectContaining({ permission: PERMISSIONS.USERS.VIEW }),
		);
		expect(mockGetOrgPlanLimits).not.toHaveBeenCalled();
	});

	it("returns used, limit, and tier when authorized", async () => {
		mockRequirePermission.mockResolvedValue(null);
		mockGetCurrentUser.mockResolvedValue({ $id: "u1" });
		mockValidateUserOrgAccess.mockResolvedValue(true);
		mockGetOrgPlanLimits.mockResolvedValue({
			tier: "growth",
			limits: { maxUsers: 20 },
		});
		mockCountBillableUsers.mockResolvedValue(8);

		const { GET } = await import("@/app/api/users/plan-usage/route");
		const request = new NextRequest(
			"http://localhost:3000/api/users/plan-usage?orgId=org-1",
		);
		const response = await GET(request);
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			tier: "growth",
			users: { used: 8, limit: 20 },
		});
	});
});

describe("GET /api/invitations", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 403 without users.view", async () => {
		mockRequirePermission.mockResolvedValue(
			NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }),
		);
		const { GET } = await import("@/app/api/invitations/route");
		const request = new NextRequest(
			"http://localhost:3000/api/invitations?orgId=org-1",
		);
		const response = await GET(request);
		expect(response.status).toBe(403);
		expect(mockRequirePermission).toHaveBeenCalledWith(
			request,
			expect.objectContaining({ permission: PERMISSIONS.USERS.VIEW }),
		);
		expect(mockListPendingInvitations).not.toHaveBeenCalled();
	});

	it("returns pending invite rows when authorized", async () => {
		mockRequirePermission.mockResolvedValue(null);
		mockGetCurrentUser.mockResolvedValue({ $id: "u1" });
		mockValidateUserOrgAccess.mockResolvedValue(true);
		mockListPendingInvitations.mockResolvedValue([
			{
				$id: "inv-1",
				name: "Pat Lee",
				email: "pat@caalm.test",
				role: "Viewer",
				expiresAt: "2026-09-20T00:00:00.000Z",
				status: "pending",
			},
		]);

		const { GET } = await import("@/app/api/invitations/route");
		const request = new NextRequest(
			"http://localhost:3000/api/invitations?orgId=org-1",
		);
		const response = await GET(request);
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			data: [
				{
					$id: "inv-1",
					name: "Pat Lee",
					email: "pat@caalm.test",
					role: "Viewer",
					expiresAt: "2026-09-20T00:00:00.000Z",
					status: "pending",
				},
			],
		});
	});
});
