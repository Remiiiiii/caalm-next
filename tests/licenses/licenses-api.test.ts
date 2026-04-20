/**
 * Integration tests for licenses API (GET /api/licenses)
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireAuth = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockRequirePermission = vi.fn();
const mockGetUserDefaultOrganization = vi.fn();
const mockListLicenses = vi.fn();

vi.mock("@/lib/api/licenses/middleware/auth.middleware", () => ({
	requireAuth: (req: NextRequest) => mockRequireAuth(req),
}));

vi.mock("@/lib/actions/user.actions", () => ({
	getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock("@/lib/rbac/middleware", () => ({
	requirePermission: (req: NextRequest) => mockRequirePermission(req),
}));

vi.mock("@/lib/rbac/permissions", () => ({
	getUserDefaultOrganization: (userId: string) =>
		mockGetUserDefaultOrganization(userId),
}));

vi.mock("@/lib/api/licenses/services/LicenseService", () => ({
	LicenseService: {
		listLicenses: (orgId: string, filters: object, opts: object) =>
			mockListLicenses(orgId, filters, opts),
	},
}));

describe("GET /api/licenses", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 when unauthenticated", async () => {
		const { GET } = await import("@/app/api/licenses/route");
		mockRequireAuth.mockResolvedValue(
			new Response(JSON.stringify({ error: "Authentication required" }), {
				status: 401,
			}),
		);

		const request = new NextRequest("http://localhost:3000/api/licenses");
		const response = await GET(request);

		expect(response.status).toBe(401);
		expect(mockGetCurrentUser).not.toHaveBeenCalled();
	});

	it("returns 403 when user lacks LICENSES.VIEW permission", async () => {
		const { GET } = await import("@/app/api/licenses/route");
		mockRequireAuth.mockResolvedValue(null);
		mockGetCurrentUser.mockResolvedValue({ $id: "user-1" });
		mockRequirePermission.mockResolvedValue(
			new Response(JSON.stringify({ error: "Insufficient permissions" }), {
				status: 403,
			}),
		);

		const request = new NextRequest("http://localhost:3000/api/licenses");
		const response = await GET(request);

		expect(response.status).toBe(403);
		expect(mockGetUserDefaultOrganization).not.toHaveBeenCalled();
		expect(mockListLicenses).not.toHaveBeenCalled();
	});

	it("returns 200 with licenses when authenticated and has permission", async () => {
		const { GET } = await import("@/app/api/licenses/route");
		const mockLicenses = [
			{
				$id: "lic-1",
				licenseName: "Test License",
				status: "active",
				orgId: "org-1",
			},
		];
		mockRequireAuth.mockResolvedValue(null);
		mockGetCurrentUser.mockResolvedValue({ $id: "user-1" });
		mockRequirePermission.mockResolvedValue(null);
		mockGetUserDefaultOrganization.mockResolvedValue({ orgId: "org-1" });
		mockListLicenses.mockResolvedValue({
			licenses: mockLicenses,
			total: 1,
		});

		const request = new NextRequest("http://localhost:3000/api/licenses");
		const response = await GET(request);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.success).toBe(true);
		expect(data.data.licenses).toEqual(mockLicenses);
		expect(mockListLicenses).toHaveBeenCalledWith(
			"org-1",
			expect.any(Object),
			expect.any(Object),
		);
	});
});
