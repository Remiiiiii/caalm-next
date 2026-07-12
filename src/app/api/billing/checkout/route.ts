import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { requirePermission } from "@/lib/rbac/middleware";
import { getOrganization } from "@/lib/rbac/organizations";
import { createCheckoutSession } from "@/lib/stripe/billing";
import { isStripeConfigured } from "@/lib/stripe/client";

const bodySchema = z.object({
	orgId: z.string().min(1),
	tier: z.enum(["starter", "growth", "enterprise"]),
	interval: z.enum(["monthly", "yearly"]),
});

export async function POST(request: NextRequest) {
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
		return NextResponse.json({ error: "Authentication required" }, { status: 401 });
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
	const org = await getOrganization(orgId);
	if (!org) {
		return NextResponse.json({ error: "Organization not found" }, { status: 404 });
	}

	const appUrl =
		process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

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
	} catch (error: any) {
		console.error("[billing/checkout]", error);
		return NextResponse.json(
			{ error: error?.message || "Failed to create checkout session" },
			{ status: 500 },
		);
	}
}
