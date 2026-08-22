import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";
import { getOrganization } from "@/lib/rbac/organizations";
import { validateUserOrgAccess } from "@/lib/rbac/permissions";
import { listPaymentMethodsForOrg, orgHasUpcomingInvoice } from "@/lib/stripe/billing";
import { isStripeConfigured } from "@/lib/stripe/client";

export async function GET(request: NextRequest) {
	const permissionCheck = await requirePermission(request, {
		permission: PERMISSIONS.SETTINGS.BILLING,
	});
	if (permissionCheck) return permissionCheck;

	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}

	if (!isStripeConfigured()) {
		return NextResponse.json({ paymentMethods: [], stripeConfigured: false });
	}

	const orgId =
		getOrgIdFromRequest(request) ||
		request.nextUrl.searchParams.get("orgId") ||
		undefined;

	if (!orgId) {
		return NextResponse.json({ error: "orgId is required" }, { status: 400 });
	}

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

	try {
		const [paymentMethods, hasUpcomingInvoice] = await Promise.all([
			listPaymentMethodsForOrg(org),
			orgHasUpcomingInvoice(org),
		]);
		return NextResponse.json({
			paymentMethods,
			hasUpcomingInvoice,
			orgName: org.name,
			stripeConfigured: true,
		});
	} catch (error: unknown) {
		const message =
			error instanceof Error ? error.message : "Failed to list payment methods";
		console.error("[billing/payment-methods]", error);
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
