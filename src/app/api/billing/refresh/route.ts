import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";
import { getOrganization } from "@/lib/rbac/organizations";
import { validateUserOrgAccess } from "@/lib/rbac/permissions";
import { isStripeConfigured } from "@/lib/stripe/client";
import { syncLatestStripeStateForOrg } from "@/lib/stripe/billing";

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
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
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

	const synced = await syncLatestStripeStateForOrg(org);
	return NextResponse.json({ synced });
}
