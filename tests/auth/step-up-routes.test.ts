/**
 * Step-up enforcement on representative protected routes.
 */

import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	issueStepUpGrant,
	STEP_UP_COOKIE,
	STEP_UP_REQUIRED_CODE,
} from "@/lib/auth/step-up";

const mockRequirePermission = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockDeleteUserAccount = vi.fn();
const mockDetachOrgPaymentMethod = vi.fn();
const mockGetOrganization = vi.fn();
const mockValidateUserOrgAccess = vi.fn();

vi.mock("@/lib/rbac/middleware", () => ({
	requirePermission: (req: NextRequest, opts: unknown) =>
		mockRequirePermission(req, opts),
	getOrgIdFromRequest: () => "org-1",
}));

vi.mock("@/lib/actions/user.actions", () => ({
	getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock("@/lib/users/delete-user.service", () => ({
	deleteUserAccount: (...args: unknown[]) => mockDeleteUserAccount(...args),
}));

vi.mock("@/lib/rbac/permissions", () => ({
	validateUserOrgAccess: (...args: unknown[]) =>
		mockValidateUserOrgAccess(...args),
}));

vi.mock("@/lib/rbac/organizations", () => ({
	getOrganization: (...args: unknown[]) => mockGetOrganization(...args),
}));

vi.mock("@/lib/stripe/client", () => ({
	isStripeConfigured: () => true,
}));

vi.mock("@/lib/stripe/billing", () => ({
	detachOrgPaymentMethod: (...args: unknown[]) =>
		mockDetachOrgPaymentMethod(...args),
	setDefaultOrgPaymentMethod: vi.fn(),
	updateOrgPaymentMethod: vi.fn(),
}));

function stepUpHeaders(userId: string): HeadersInit {
	const response = NextResponse.json({});
	issueStepUpGrant(userId, response);
	const setCookie = response.headers.getSetCookie().join("; ");
	const match = setCookie.match(new RegExp(`${STEP_UP_COOKIE}=([^;]+)`));
	return { cookie: `${STEP_UP_COOKIE}=${match?.[1] ?? ""}` };
}

describe("step-up protected routes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubEnv("STEP_UP_SECRET", "route-test-step-up-secret");
		mockRequirePermission.mockResolvedValue(null);
		mockGetCurrentUser.mockResolvedValue({
			$id: "user-1",
			accountId: "acct-1",
			email: "admin@example.com",
		});
		mockValidateUserOrgAccess.mockResolvedValue(true);
		mockGetOrganization.mockResolvedValue({ $id: "org-1", name: "Acme" });
		mockDeleteUserAccount.mockResolvedValue(undefined);
		mockDetachOrgPaymentMethod.mockResolvedValue(undefined);
	});

	it("DELETE /api/user/delete returns STEP_UP_REQUIRED without grant", async () => {
		const { DELETE } = await import("@/app/api/user/delete/route");
		const request = new NextRequest(
			"http://localhost:3000/api/user/delete?userId=target-user",
			{ method: "DELETE" },
		);
		const response = await DELETE(request);
		expect(response.status).toBe(403);
		const body = await response.json();
		expect(body.code).toBe(STEP_UP_REQUIRED_CODE);
		expect(mockDeleteUserAccount).not.toHaveBeenCalled();
	});

	it("DELETE /api/user/delete succeeds with a valid grant", async () => {
		const { DELETE } = await import("@/app/api/user/delete/route");
		const request = new NextRequest(
			"http://localhost:3000/api/user/delete?userId=target-user",
			{
				method: "DELETE",
				headers: stepUpHeaders("user-1"),
			},
		);
		const response = await DELETE(request);
		expect(response.status).toBe(200);
		expect(mockDeleteUserAccount).toHaveBeenCalledWith("target-user", "org-1");
	});

	it("DELETE /api/billing/payment-methods/[id] returns STEP_UP_REQUIRED without grant", async () => {
		const { DELETE } = await import(
			"@/app/api/billing/payment-methods/[id]/route"
		);
		const request = new NextRequest(
			"http://localhost:3000/api/billing/payment-methods/pm_1?orgId=org-1",
			{ method: "DELETE", headers: { "x-org-id": "org-1" } },
		);
		const response = await DELETE(request, {
			params: Promise.resolve({ id: "pm_1" }),
		});
		expect(response.status).toBe(403);
		const body = await response.json();
		expect(body.code).toBe(STEP_UP_REQUIRED_CODE);
		expect(mockDetachOrgPaymentMethod).not.toHaveBeenCalled();
	});

	it("DELETE /api/billing/payment-methods/[id] succeeds with a valid grant", async () => {
		const { DELETE } = await import(
			"@/app/api/billing/payment-methods/[id]/route"
		);
		const request = new NextRequest(
			"http://localhost:3000/api/billing/payment-methods/pm_1?orgId=org-1",
			{
				method: "DELETE",
				headers: { "x-org-id": "org-1", ...stepUpHeaders("user-1") },
			},
		);
		const response = await DELETE(request, {
			params: Promise.resolve({ id: "pm_1" }),
		});
		expect(response.status).toBe(200);
		expect(mockDetachOrgPaymentMethod).toHaveBeenCalled();
	});
});
