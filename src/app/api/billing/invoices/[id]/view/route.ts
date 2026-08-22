import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";
import { getOrganization } from "@/lib/rbac/organizations";
import { validateUserOrgAccess } from "@/lib/rbac/permissions";
import { getInvoicePdfDownloadForOrg } from "@/lib/stripe/billing";
import { isStripeConfigured } from "@/lib/stripe/client";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
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
		return NextResponse.json(
			{ error: "Stripe is not configured" },
			{ status: 503 },
		);
	}

	const { id: invoiceId } = await context.params;
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
		const { pdfUrl, filename } = await getInvoicePdfDownloadForOrg(
			org,
			invoiceId,
		);
		const pdfResponse = await fetch(pdfUrl);
		if (!pdfResponse.ok || !pdfResponse.body) {
			return NextResponse.json(
				{ error: "Failed to fetch invoice PDF" },
				{ status: 502 },
			);
		}

		return new NextResponse(pdfResponse.body, {
			status: 200,
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": `inline; filename="${filename}"`,
				"Cache-Control": "private, no-store",
			},
		});
	} catch (error: unknown) {
		const message =
			error instanceof Error ? error.message : "Failed to view invoice";
		const status = message === "Invoice not found" ? 404 : 500;
		console.error("[billing/invoices/view]", error);
		return NextResponse.json({ error: message }, { status });
	}
}
