import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getTotalSpaceUsed } from "@/lib/actions/file.actions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	getEffectiveLimits,
	resolveBillingAccess,
} from "@/lib/billing/entitlements";
import {
	countActiveDepartments,
	countContracts,
	countOrgMembers,
} from "@/lib/billing/usage";
import { loadPricingFromMarkdown } from "@/lib/pricing";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";
import { getOrganization } from "@/lib/rbac/organizations";
import { validateUserOrgAccess } from "@/lib/rbac/permissions";
import { isStripeConfigured } from "@/lib/stripe/client";

/**
 * Stable JSON shape for the billing UI — plug-and-play tomorrow.
 */
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

	const limits = getEffectiveLimits(org);
	const access = resolveBillingAccess(org);

	let storageUsed = 0;
	try {
		const space = await getTotalSpaceUsed();
		storageUsed = typeof space?.used === "number" ? space.used : 0;
	} catch {
		storageUsed = 0;
	}

	const [usersUsed, departmentsUsed, contractsUsed] = await Promise.all([
		countOrgMembers(orgId).catch(() => null),
		countActiveDepartments(orgId).catch(() => null),
		countContracts(orgId).catch(() => null),
	]);

	const pricing = await loadPricingFromMarkdown();
	const plan = pricing.plans.find((p) => p.key === limits.tier);

	return NextResponse.json({
		orgId: org.$id,
		name: org.name,
		subscriptionTier: limits.tier,
		billingStatus: org.billingStatus || "none",
		billingInterval: org.billingInterval || null,
		currentPeriodEnd: org.currentPeriodEnd || null,
		stripeCustomerId: org.stripeCustomerId || null,
		stripeSubscriptionId: org.stripeSubscriptionId || null,
		hasStripeCustomer: Boolean(org.stripeCustomerId),
		stripeConfigured: isStripeConfigured(),
		access: {
			state: access.state,
			canWrite: access.canWrite,
			canCheckout: access.canCheckout,
			warning: access.warning,
			pilotEndsAt: access.pilotEndsAt,
			graceEndsAt: access.graceEndsAt,
		},
		entitlements: {
			tier: limits.tier,
			maxUsers: limits.maxUsers,
			maxDepartments: limits.maxDepartments,
			maxContracts: limits.maxContracts,
			storageBytes: limits.storageBytes,
		},
		plan: plan
			? {
					key: plan.key,
					name: plan.name,
					monthly: plan.monthly,
					yearly: plan.yearly,
					features: plan.features,
				}
			: null,
		usage: {
			storage: {
				used: storageUsed,
				limit: limits.storageBytes,
			},
			users: {
				used: usersUsed,
				limit: limits.maxUsers,
			},
			departments: {
				used: departmentsUsed,
				limit: limits.maxDepartments,
			},
			contracts: {
				used: contractsUsed,
				limit: limits.maxContracts,
			},
		},
		plans: pricing.plans,
	});
}
