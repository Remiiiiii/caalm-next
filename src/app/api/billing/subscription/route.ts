import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getTotalSpaceUsed } from "@/lib/actions/file.actions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	countActiveContracts,
	countActiveLicenses,
	countBillableUsers,
	sumOrgStorageBytes,
} from "@/lib/billing/planLimits";
import { getAiExtractionMeter } from "@/lib/billing/consumeAiExtractionForRequest";
import { loadPricingFromMarkdown } from "@/lib/pricing";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";
import { getOrganization } from "@/lib/rbac/organizations";
import { isStripeConfigured } from "@/lib/stripe/client";
import {
	PILOT_TRIAL_DAYS,
	TIER_LIMITS,
} from "@/lib/stripe/prices";

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
		storageUsed = await sumOrgStorageBytes(orgId);
		if (!storageUsed) {
			const space = await getTotalSpaceUsed();
			storageUsed = typeof space?.used === "number" ? space.used : 0;
		}
	} catch {
		storageUsed = 0;
	}

	const [usersUsed, contractsUsed, licensesUsed, aiMeter] = await Promise.all([
		countBillableUsers(orgId),
		countActiveContracts(orgId),
		countActiveLicenses(orgId),
		getAiExtractionMeter(orgId, org.billingStatus || "none"),
	]);

	const pricing = await loadPricingFromMarkdown();
	const plan = pricing.plans.find((p) => p.key === tier);
	const billingStatus = org.billingStatus || "none";
	const pilotEligible =
		(billingStatus === "none" || billingStatus === "canceled") &&
		tier !== "enterprise";

	return NextResponse.json({
		orgId: org.$id,
		name: org.name,
		subscriptionTier: tier,
		billingStatus,
		billingInterval: org.billingInterval || null,
		currentPeriodEnd: org.currentPeriodEnd || null,
		stripeCustomerId: org.stripeCustomerId || null,
		stripeSubscriptionId: org.stripeSubscriptionId || null,
		hasStripeCustomer: Boolean(org.stripeCustomerId),
		stripeConfigured: isStripeConfigured(),
		pilot: {
			eligible: pilotEligible,
			trialDays: PILOT_TRIAL_DAYS,
			tier: "growth",
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
				limit: settings.maxUsers ?? limits.maxUsers,
			},
			departments: {
				used: null as number | null,
				limit: settings.maxDepartments ?? limits.maxDepartments,
			},
			contracts: {
				used: contractsUsed,
				limit: limits.maxContracts,
			},
			licenses: {
				used: licensesUsed,
				limit: limits.maxLicenses,
			},
			aiExtractions: {
				used: aiMeter.used,
				limit: aiMeter.limit,
			},
		},
		plans: pricing.plans,
	});
}
