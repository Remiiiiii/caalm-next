import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { resolveBillingAccess } from "@/lib/billing/entitlements";
import { requirePermission } from "@/lib/rbac/middleware";
import { getOrganization } from "@/lib/rbac/organizations";
import { validateUserOrgAccess } from "@/lib/rbac/permissions";
import { createCheckoutSession } from "@/lib/stripe/billing";
import { isStripeConfigured } from "@/lib/stripe/client";

const bodySchema = z.object({
	orgId: z.string().min(1),
	tier: z.enum(["starter", "growth", "enterprise"]),
	interval: z.enum(["monthly", "yearly"]),
});

export async function POST(request: NextRequest) {
	const { isDemoMode } = await import("@/lib/config/demo-mode");
	if (isDemoMode()) {
		return NextResponse.json(
			{ error: "Billing is disabled in demo mode" },
			{ status: 403 },
		);
	}

	const permissionCheck = await requirePermission(request, {
		permission: PERMISSIONS.SETTINGS.BILLING,
	});
	if (permissionCheck) return permissionCheck;

	if (!isStripeConfigured()) {
		return NextResponse.json(
			{ error: "Stripe is not configured" },
			{ status: 503 },
		);
	}

	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}

	let json: unknown;
	try {
		json = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const parsed = bodySchema.safeParse(json);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid request", details: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	const { orgId, tier, interval } = parsed.data;

	const hasOrgAccess = await validateUserOrgAccess(user.$id, orgId);
	if (!hasOrgAccess) {
		return NextResponse.json(
			{ error: "Access denied to this organization" },
			{ status: 403 },
		);
	}

	const org = await getOrganization(orgId);
	if (!org) {
		return NextResponse.json(
			{ error: "Organization not found" },
			{ status: 404 },
		);
	}

	// Active paid subscription: use change-plan (proration), not a second Checkout
	if (
		org.stripeSubscriptionId &&
		(org.billingStatus === "active" ||
			org.billingStatus === "trialing" ||
			org.billingStatus === "past_due")
	) {
		return NextResponse.json(
			{
				error:
					"Organization already has a subscription. Use /api/billing/change-plan or the Customer Portal.",
				code: "USE_CHANGE_PLAN",
			},
			{ status: 409 },
		);
	}

	const access = resolveBillingAccess(org);
	if (!access.canCheckout) {
		return NextResponse.json(
			{ error: access.warning || "Checkout not allowed" },
			{ status: 403 },
		);
	}

	const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

	try {
		const url = await createCheckoutSession({
			org,
			tier,
			interval,
			email: user.email,
			userName: user.fullName,
			successUrl: `${appUrl}/settings/billing?tab=billing&checkout=success`,
			cancelUrl: `${appUrl}/settings/billing?tab=billing&checkout=canceled`,
		});
		return NextResponse.json({ url });
	} catch (error: unknown) {
		const message =
			error instanceof Error ? error.message : "Failed to create checkout session";
		console.error("[billing/checkout]", error);
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
