/**
 * API tests for billing routes: webhook signature rejection and permission 403s
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequirePermission = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockConstructWebhookEvent = vi.fn();
const mockHandleStripeWebhookEvent = vi.fn();

vi.mock("@/lib/rbac/middleware", () => ({
	requirePermission: (req: NextRequest, opts: unknown) =>
		mockRequirePermission(req, opts),
	getOrgIdFromRequest: () => null,
}));

vi.mock("@/lib/actions/user.actions", () => ({
	getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock("@/lib/rbac/permissions", () => ({
	validateUserOrgAccess: vi.fn(async () => true),
	getUserPermissions: vi.fn(async () => []),
}));

vi.mock("@/lib/stripe/webhook-idempotency", () => ({
	claimStripeEvent: vi.fn(async () => true),
}));

vi.mock("@/lib/stripe/webhooks", () => ({
	constructWebhookEvent: (payload: string, signature: string) =>
		mockConstructWebhookEvent(payload, signature),
	handleStripeWebhookEvent: (event: unknown) =>
		mockHandleStripeWebhookEvent(event),
}));

vi.mock("@/lib/stripe/client", () => ({
	isStripeConfigured: () => true,
	getStripe: () => ({}),
}));

vi.mock("@/lib/stripe/billing", () => ({
	createCheckoutSession: vi.fn(),
	createPortalSession: vi.fn(),
	createAndFinalizeQuote: vi.fn(),
	listInvoicesForOrg: vi.fn(),
	changeSubscriptionPlan: vi.fn(),
	startOrgPilot: vi.fn(),
	syncLatestStripeStateForOrg: vi.fn(),
}));

vi.mock("@/lib/rbac/organizations", () => ({
	getOrganization: vi.fn(),
}));

describe("POST /api/billing/webhooks", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 400 when stripe-signature header is missing", async () => {
		const { POST } = await import("@/app/api/billing/webhooks/route");
		const request = new NextRequest(
			"http://localhost:3000/api/billing/webhooks",
			{
				method: "POST",
				body: "{}",
			},
		);
		const response = await POST(request);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error).toMatch(/signature/i);
		expect(mockConstructWebhookEvent).not.toHaveBeenCalled();
	});

	it("returns 400 when signature verification fails", async () => {
		mockConstructWebhookEvent.mockImplementation(() => {
			throw new Error("No signatures found matching the expected signature");
		});

		const { POST } = await import("@/app/api/billing/webhooks/route");
		const request = new NextRequest(
			"http://localhost:3000/api/billing/webhooks",
			{
				method: "POST",
				headers: { "stripe-signature": "t=1,v1=bad" },
				body: JSON.stringify({ id: "evt_test" }),
			},
		);
		const response = await POST(request);
		expect(response.status).toBe(400);
		expect(mockHandleStripeWebhookEvent).not.toHaveBeenCalled();
	});

	it("returns 200 when signature is valid", async () => {
		mockConstructWebhookEvent.mockReturnValue({
			id: "evt_test",
			type: "ping",
			data: { object: {} },
		});
		mockHandleStripeWebhookEvent.mockResolvedValue({ processed: true });

		const { POST } = await import("@/app/api/billing/webhooks/route");
		const request = new NextRequest(
			"http://localhost:3000/api/billing/webhooks",
			{
				method: "POST",
				headers: { "stripe-signature": "t=1,v1=valid" },
				body: JSON.stringify({ id: "evt_test" }),
			},
		);
		const response = await POST(request);
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.received).toBe(true);
		expect(mockHandleStripeWebhookEvent).toHaveBeenCalled();
	});
});

describe("POST /api/billing/change-plan", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 403 when user lacks settings.billing permission", async () => {
		mockRequirePermission.mockResolvedValue(
			new Response(JSON.stringify({ error: "Insufficient permissions" }), {
				status: 403,
			}),
		);

		const { POST } = await import("@/app/api/billing/change-plan/route");
		const request = new NextRequest(
			"http://localhost:3000/api/billing/change-plan",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					orgId: "org-1",
					tier: "growth",
					interval: "monthly",
				}),
			},
		);
		const response = await POST(request);
		expect(response.status).toBe(403);
	});
});

describe("POST /api/billing/pilot", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 403 when user lacks platform.system_settings", async () => {
		mockRequirePermission.mockResolvedValue(
			new Response(JSON.stringify({ error: "Insufficient permissions" }), {
				status: 403,
			}),
		);

		const { POST } = await import("@/app/api/billing/pilot/route");
		const request = new NextRequest("http://localhost:3000/api/billing/pilot", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				orgId: "org-1",
				tier: "growth",
				months: 3,
			}),
		});
		const response = await POST(request);
		expect(response.status).toBe(403);
	});
});

describe("POST /api/billing/checkout", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 403 when user lacks settings.billing permission", async () => {
		mockRequirePermission.mockResolvedValue(
			new Response(JSON.stringify({ error: "Insufficient permissions" }), {
				status: 403,
			}),
		);

		const { POST } = await import("@/app/api/billing/checkout/route");
		const request = new NextRequest(
			"http://localhost:3000/api/billing/checkout",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					orgId: "org-1",
					tier: "starter",
					interval: "monthly",
				}),
			},
		);
		const response = await POST(request);
		expect(response.status).toBe(403);
		expect(mockGetCurrentUser).not.toHaveBeenCalled();
	});

	it("returns 400 when tier is enterprise (sales-only)", async () => {
		mockRequirePermission.mockResolvedValue(null);
		mockGetCurrentUser.mockResolvedValue({
			$id: "u1",
			email: "admin@example.com",
			fullName: "Admin",
		});

		const { POST } = await import("@/app/api/billing/checkout/route");
		const request = new NextRequest(
			"http://localhost:3000/api/billing/checkout",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					orgId: "org-1",
					tier: "enterprise",
					interval: "monthly",
				}),
			},
		);
		const response = await POST(request);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe("ENTERPRISE_SALES_ONLY");
	});
});

describe("POST /api/billing/quotes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 403 when user lacks billing or platform permission", async () => {
		mockRequirePermission.mockResolvedValue(
			new Response(JSON.stringify({ error: "Insufficient permissions" }), {
				status: 403,
			}),
		);

		const { POST } = await import("@/app/api/billing/quotes/route");
		const request = new NextRequest(
			"http://localhost:3000/api/billing/quotes",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					orgId: "org-1",
					tier: "enterprise",
					interval: "yearly",
				}),
			},
		);
		const response = await POST(request);
		expect(response.status).toBe(403);
	});
});

describe("GET /api/billing/subscription", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 403 when user lacks settings.billing permission", async () => {
		mockRequirePermission.mockResolvedValue(
			new Response(JSON.stringify({ error: "Insufficient permissions" }), {
				status: 403,
			}),
		);

		const { GET } = await import("@/app/api/billing/subscription/route");
		const request = new NextRequest(
			"http://localhost:3000/api/billing/subscription?orgId=org-1",
		);
		const response = await GET(request);
		expect(response.status).toBe(403);
	});
});

describe("POST /api/billing/refresh", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 403 when user lacks settings.billing permission", async () => {
		mockRequirePermission.mockResolvedValue(
			new Response(JSON.stringify({ error: "Insufficient permissions" }), {
				status: 403,
			}),
		);

		const { POST } = await import("@/app/api/billing/refresh/route");
		const request = new NextRequest(
			"http://localhost:3000/api/billing/refresh?orgId=org-1",
			{ method: "POST" },
		);
		const response = await POST(request);
		expect(response.status).toBe(403);
	});
});
