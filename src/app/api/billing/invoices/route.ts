import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";
import { getOrganization } from "@/lib/rbac/organizations";
import { listInvoicesForOrg } from "@/lib/stripe/billing";
import { isStripeConfigured } from "@/lib/stripe/client";

export async function GET(request: NextRequest) {
	const permissionCheck = await requirePermission(request, {
		permission: PERMISSIONS.SETTINGS.BILLING,
	});
	if (permissionCheck) return permissionCheck;

	if (!isStripeConfigured()) {
		return NextResponse.json({ invoices: [], stripeConfigured: false });
	}

	const orgId =
		getOrgIdFromRequest(request) ||
		request.nextUrl.searchParams.get("orgId") ||
		"default_organization";

	const org = await getOrganization(orgId);
	if (!org) {
		return NextResponse.json({ error: "Organization not found" }, { status: 404 });
	}

	try {
		const invoices = await listInvoicesForOrg(org);
		return NextResponse.json({ invoices, stripeConfigured: true });
	} catch (error: any) {
		console.error("[billing/invoices]", error);
		return NextResponse.json(
			{ error: error?.message || "Failed to list invoices" },
			{ status: 500 },
		);
	}
}
