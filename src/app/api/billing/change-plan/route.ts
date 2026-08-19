import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { requirePermission } from "@/lib/rbac/middleware";
import { getOrganization } from "@/lib/rbac/organizations";
import { validateUserOrgAccess } from "@/lib/rbac/permissions";
import { changeSubscriptionPlan } from "@/lib/stripe/billing";
import { isStripeConfigured } from "@/lib/stripe/client";

const bodySchema = z.object({
	orgId: z.string().min(1),
	tier: z.enum(["starter", "growth", "enterprise"]),
	interval: z.enum(["monthly", "yearly"]),
});

/**
 * Upgrade/downgrade with Stripe proration. Price IDs never come from the client.
 */
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

	if (!org.stripeSubscriptionId) {
		return NextResponse.json(
			{
				error: "No subscription to change. Use Checkout to start billing.",
				code: "USE_CHECKOUT",
			},
			{ status: 409 },
		);
	}

	try {
		const subscription = await changeSubscriptionPlan({ org, tier, interval });
		return NextResponse.json({
			subscriptionId: subscription.id,
			status: subscription.status,
			tier,
			interval,
		});
	} catch (error: unknown) {
		const message =
			error instanceof Error ? error.message : "Failed to change plan";
		console.error("[billing/change-plan]", error);
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
