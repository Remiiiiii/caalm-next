import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getTotalSpaceUsed } from "@/lib/actions/file.actions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { loadPricingFromMarkdown } from "@/lib/pricing";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";
import { getOrganization } from "@/lib/rbac/organizations";
import { isStripeConfigured } from "@/lib/stripe/client";
import { TIER_LIMITS } from "@/lib/stripe/prices";

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
		"default_organization";

	const org = await getOrganization(orgId);
	if (!org) {
		return NextResponse.json(
			{ error: "Organization not found" },
			{ status: 404 },
		);
	}

	const rawTier = String(org.subscriptionTier || "starter")
		.toLowerCase()
		.trim();
	const tier =
		rawTier in TIER_LIMITS ? (rawTier as keyof typeof TIER_LIMITS) : "starter";
	const limits = TIER_LIMITS[tier];
	const settings = org.settings || {
		maxUsers: limits.maxUsers,
		maxDepartments: limits.maxDepartments,
		features: [],
	};

	let storageUsed = 0;
	try {
		const space = await getTotalSpaceUsed();
		storageUsed = typeof space?.used === "number" ? space.used : 0;
	} catch {
		storageUsed = 0;
	}

	const pricing = await loadPricingFromMarkdown();
	const plan = pricing.plans.find((p) => p.key === tier);

	return NextResponse.json({
		orgId: org.$id,
		name: org.name,
		subscriptionTier: tier,
		billingStatus: org.billingStatus || "none",
		billingInterval: org.billingInterval || null,
		currentPeriodEnd: org.currentPeriodEnd || null,
		stripeCustomerId: org.stripeCustomerId || null,
		stripeSubscriptionId: org.stripeSubscriptionId || null,
		hasStripeCustomer: Boolean(org.stripeCustomerId),
		stripeConfigured: isStripeConfigured(),
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
				used: null as number | null,
				limit: settings.maxUsers ?? limits.maxUsers,
			},
			departments: {
				used: null as number | null,
				limit: settings.maxDepartments ?? limits.maxDepartments,
			},
			contracts: {
				used: null as number | null,
				limit: limits.maxContracts,
			},
		},
		plans: pricing.plans,
	});
}
