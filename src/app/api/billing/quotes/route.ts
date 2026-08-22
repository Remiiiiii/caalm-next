import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { permissionSatisfied } from "@/lib/rbac/permission-implications";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";
import { getOrganization } from "@/lib/rbac/organizations";
import {
	getUserPermissions,
	validateUserOrgAccess,
} from "@/lib/rbac/permissions";
import { createAndFinalizeQuote } from "@/lib/stripe/billing";
import { isStripeConfigured } from "@/lib/stripe/client";

const bodySchema = z.object({
	orgId: z.string().min(1),
	tier: z.enum(["starter", "growth", "enterprise"]).default("enterprise"),
	interval: z.enum(["monthly", "yearly"]),
	daysUntilDue: z.number().int().min(1).max(90).optional(),
});

/**
 * Create and finalize a Stripe Quote (sales-led Enterprise path).
 * Org billing admins can quote their own org. Platform staff can quote any org.
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
		permission: [
			PERMISSIONS.SETTINGS.BILLING,
			PERMISSIONS.PLATFORM.SYSTEM_SETTINGS,
		],
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

	const { orgId, tier, interval, daysUntilDue } = parsed.data;

	const requestOrgId = getOrgIdFromRequest(request);
	const held = await getUserPermissions(user.$id, requestOrgId);
	const isPlatform = permissionSatisfied(
		held,
		PERMISSIONS.PLATFORM.SYSTEM_SETTINGS,
	);
	if (!isPlatform) {
		const hasOrgAccess = await validateUserOrgAccess(user.$id, orgId);
		if (!hasOrgAccess) {
			return NextResponse.json(
				{ error: "Access denied to this organization" },
				{ status: 403 },
			);
		}
	}

	const org = await getOrganization(orgId);
	if (!org) {
		return NextResponse.json(
			{ error: "Organization not found" },
			{ status: 404 },
		);
	}

	try {
		const quote = await createAndFinalizeQuote({
			org,
			tier,
			interval,
			email: user.email,
			userName: user.fullName,
			daysUntilDue,
		});
		return NextResponse.json(quote);
	} catch (error: unknown) {
		const message =
			error instanceof Error ? error.message : "Failed to create quote";
		console.error("[billing/quotes]", error);
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
