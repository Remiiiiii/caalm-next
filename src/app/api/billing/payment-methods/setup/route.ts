import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { requirePermission } from "@/lib/rbac/middleware";
import { getOrganization } from "@/lib/rbac/organizations";
import { validateUserOrgAccess } from "@/lib/rbac/permissions";
import { createPaymentMethodSetupSession } from "@/lib/stripe/billing";
import { isStripeConfigured } from "@/lib/stripe/client";

const bodySchema = z.object({
	orgId: z.string().min(1),
	replacePaymentMethodId: z.string().min(1).optional(),
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

	const hasOrgAccess = await validateUserOrgAccess(user.$id, parsed.data.orgId);
	if (!hasOrgAccess) {
		return NextResponse.json(
			{ error: "Access denied to this organization" },
			{ status: 403 },
		);
	}

	const org = await getOrganization(parsed.data.orgId);
	if (!org) {
		return NextResponse.json(
			{ error: "Organization not found" },
			{ status: 404 },
		);
	}

	const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
	const billingUrl = `${appUrl}/settings/billing?tab=billing`;

	try {
		const url = await createPaymentMethodSetupSession({
			org,
			email: user.email,
			userName: user.fullName,
			successUrl: `${billingUrl}&setup=success`,
			cancelUrl: billingUrl,
			replacePaymentMethodId: parsed.data.replacePaymentMethodId,
		});
		return NextResponse.json({ url });
	} catch (error: unknown) {
		const message =
			error instanceof Error
				? error.message
				: "Failed to start payment method setup";
		console.error("[billing/payment-methods/setup]", error);
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
