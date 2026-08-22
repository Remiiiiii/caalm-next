import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { requirePermission } from "@/lib/rbac/middleware";
import { getOrganization } from "@/lib/rbac/organizations";
import { validateUserOrgAccess } from "@/lib/rbac/permissions";
import {
	detachOrgPaymentMethod,
	setDefaultOrgPaymentMethod,
	updateOrgPaymentMethod,
} from "@/lib/stripe/billing";
import { isStripeConfigured } from "@/lib/stripe/client";

const patchSchema = z.object({
	orgId: z.string().min(1),
	name: z.string().trim().min(1).max(120).optional(),
	expMonth: z.number().int().min(1).max(12).optional(),
	expYear: z.number().int().min(new Date().getFullYear()).max(2100).optional(),
	setDefault: z.literal(true).optional(),
});

async function resolveOrg(request: NextRequest, orgId: string) {
	const user = await getCurrentUser();
	if (!user) {
		return {
			error: NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			),
		};
	}

	const hasOrgAccess = await validateUserOrgAccess(user.$id, orgId);
	if (!hasOrgAccess) {
		return {
			error: NextResponse.json(
				{ error: "Access denied to this organization" },
				{ status: 403 },
			),
		};
	}

	const org = await getOrganization(orgId);
	if (!org) {
		return {
			error: NextResponse.json(
				{ error: "Organization not found" },
				{ status: 404 },
			),
		};
	}

	return { org };
}

export async function PATCH(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
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

	const { id } = await context.params;

	let json: unknown;
	try {
		json = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const parsed = patchSchema.safeParse(json);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid request", details: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	if (
		parsed.data.name === undefined &&
		parsed.data.expMonth === undefined &&
		parsed.data.expYear === undefined &&
		parsed.data.setDefault === undefined
	) {
		return NextResponse.json(
			{ error: "At least one field is required to update" },
			{ status: 400 },
		);
	}

	const resolved = await resolveOrg(request, parsed.data.orgId);
	if ("error" in resolved && resolved.error) return resolved.error;

	try {
		if (parsed.data.setDefault) {
			const paymentMethods = await setDefaultOrgPaymentMethod(
				resolved.org,
				id,
			);
			return NextResponse.json({ paymentMethods });
		}

		const paymentMethod = await updateOrgPaymentMethod(
			resolved.org,
			id,
			parsed.data,
		);
		return NextResponse.json({ paymentMethod });
	} catch (error: unknown) {
		const message =
			error instanceof Error ? error.message : "Failed to update payment method";
		console.error("[billing/payment-methods/PATCH]", error);
		return NextResponse.json({ error: message }, { status: 400 });
	}
}

export async function DELETE(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
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

	const { id } = await context.params;
	const orgId =
		request.nextUrl.searchParams.get("orgId") ||
		request.headers.get("x-org-id") ||
		"";

	if (!orgId) {
		return NextResponse.json({ error: "orgId is required" }, { status: 400 });
	}

	const resolved = await resolveOrg(request, orgId);
	if ("error" in resolved && resolved.error) return resolved.error;

	try {
		await detachOrgPaymentMethod(resolved.org, id);
		return NextResponse.json({ success: true });
	} catch (error: unknown) {
		const message =
			error instanceof Error ? error.message : "Failed to remove payment method";
		console.error("[billing/payment-methods/DELETE]", error);
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
