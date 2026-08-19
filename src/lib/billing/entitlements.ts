/**
 * Billing entitlements — single source of truth for plan limits and access.
 *
 * Why this exists: clients can lie about tier or maxDepartments. Every write
 * that burns a seat (users, departments, etc.) must call these helpers on the
 * server so Stripe/webhook state wins, not the browser.
 */

import type { Organization } from "@/lib/rbac/organizations";
import {
	type PricingTier,
	TIER_LIMITS,
} from "@/lib/stripe/prices";

/** Days an org can keep writing after a failed payment before hard lock. */
export const PAST_DUE_GRACE_DAYS = 7;

/** Allowed pilot lengths (months). Sales picks one when starting a pilot. */
export const PILOT_MONTH_OPTIONS = [3, 4, 5, 6] as const;
export type PilotMonths = (typeof PILOT_MONTH_OPTIONS)[number];

export type BillingAccessState =
	| "ok"
	| "pilot"
	| "grace"
	| "locked_past_due"
	| "locked_pilot_expired"
	| "locked_no_subscription"
	| "locked_canceled";

export type EffectiveLimits = {
	tier: PricingTier;
	maxUsers: number;
	maxDepartments: number | null; // null = unlimited
	maxContracts: number | null;
	storageBytes: number;
};

export function normalizePricingTier(
	raw: string | undefined | null,
): PricingTier {
	const tier = String(raw || "starter")
		.toLowerCase()
		.trim();
	if (tier === "starter" || tier === "growth" || tier === "enterprise") {
		return tier;
	}
	return "starter";
}

export function getTierLimits(tier: PricingTier): EffectiveLimits {
	const limits = TIER_LIMITS[tier];
	return {
		tier,
		maxUsers: limits.maxUsers,
		maxDepartments: Number.isFinite(limits.maxDepartments)
			? limits.maxDepartments
			: null,
		maxContracts: Number.isFinite(limits.maxContracts)
			? limits.maxContracts
			: null,
		storageBytes: limits.storageBytes,
	};
}

/** Settings that must always mirror the paid/pilot tier — never client-supplied. */
export function settingsFromTier(tier: PricingTier): {
	maxUsers: number;
	maxDepartments: number;
} {
	const limits = TIER_LIMITS[tier];
	return {
		maxUsers: limits.maxUsers,
		// Store a large sentinel for unlimited so Appwrite int fields stay finite
		maxDepartments: Number.isFinite(limits.maxDepartments)
			? limits.maxDepartments
			: 100_000,
	};
}

function parseIso(value: string | undefined | null): Date | null {
	if (!value) return null;
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? null : d;
}

function daysBetween(from: Date, to: Date): number {
	return (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
}

/**
 * Resolve whether an org may mutate billed resources (invite users, add depts).
 * Billing pages themselves stay readable so finance can fix the problem.
 */
export function resolveBillingAccess(
	org: Organization,
	now: Date = new Date(),
): {
	state: BillingAccessState;
	canWrite: boolean;
	canCheckout: boolean;
	warning: string | null;
	pilotEndsAt: string | null;
	graceEndsAt: string | null;
} {
	const status = org.billingStatus || "none";
	const periodEnd = parseIso(org.currentPeriodEnd ?? null);
	const pastDueSince = parseIso(
		typeof org.settings?.pastDueSince === "string"
			? org.settings.pastDueSince
			: null,
	);

	if (status === "pilot") {
		const endsAt = periodEnd;
		if (endsAt && endsAt.getTime() < now.getTime()) {
			return {
				state: "locked_pilot_expired",
				canWrite: false,
				canCheckout: true,
				warning:
					"Pilot ended. Choose a plan to keep using CAALM.",
				pilotEndsAt: endsAt.toISOString(),
				graceEndsAt: null,
			};
		}
		return {
			state: "pilot",
			canWrite: true,
			canCheckout: true,
			warning: endsAt
				? `Pilot ends ${endsAt.toLocaleDateString()}.`
				: null,
			pilotEndsAt: endsAt?.toISOString() ?? null,
			graceEndsAt: null,
		};
	}

	if (status === "active" || status === "trialing") {
		return {
			state: "ok",
			canWrite: true,
			canCheckout: true,
			warning: null,
			pilotEndsAt: null,
			graceEndsAt: null,
		};
	}

	if (status === "past_due") {
		const since = pastDueSince || periodEnd || now;
		const graceEnd = new Date(
			since.getTime() + PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000,
		);
		if (now.getTime() <= graceEnd.getTime()) {
			return {
				state: "grace",
				canWrite: true,
				canCheckout: true,
				warning: `Payment failed. Update payment by ${graceEnd.toLocaleDateString()} or access will lock.`,
				pilotEndsAt: null,
				graceEndsAt: graceEnd.toISOString(),
			};
		}
		return {
			state: "locked_past_due",
			canWrite: false,
			canCheckout: true,
			warning:
				"Payment past due. Update billing to restore write access.",
			pilotEndsAt: null,
			graceEndsAt: graceEnd.toISOString(),
		};
	}

	if (status === "canceled") {
		return {
			state: "locked_canceled",
			canWrite: false,
			canCheckout: true,
			warning: "Subscription canceled. Choose a plan to continue.",
			pilotEndsAt: null,
			graceEndsAt: null,
		};
	}

	// none / unknown
	return {
		state: "locked_no_subscription",
		canWrite: false,
		canCheckout: true,
		warning: "No active subscription or pilot. Contact CAALM to start a pilot, or choose a plan.",
		pilotEndsAt: null,
		graceEndsAt: null,
	};
}

export function getEffectiveLimits(org: Organization): EffectiveLimits {
	return getTierLimits(normalizePricingTier(org.subscriptionTier));
}

export class BillingLimitError extends Error {
	code: "BILLING_LOCKED" | "TIER_LIMIT";
	status: number;

	constructor(
		message: string,
		code: "BILLING_LOCKED" | "TIER_LIMIT",
		status = 403,
	) {
		super(message);
		this.name = "BillingLimitError";
		this.code = code;
		this.status = status;
	}
}

/** Throw if org may not create/invite/mutate billed resources. */
export function assertBillingWriteAccess(org: Organization): void {
	const access = resolveBillingAccess(org);
	if (!access.canWrite) {
		throw new BillingLimitError(
			access.warning || "Billing access locked",
			"BILLING_LOCKED",
			402,
		);
	}
}

export function assertWithinLimit(params: {
	resource: "users" | "departments" | "contracts";
	used: number;
	limits: EffectiveLimits;
}): void {
	const { resource, used, limits } = params;
	const cap =
		resource === "users"
			? limits.maxUsers
			: resource === "departments"
				? limits.maxDepartments
				: limits.maxContracts;

	if (cap === null) return; // unlimited
	if (used >= cap) {
		throw new BillingLimitError(
			`${resource} limit reached for ${limits.tier} plan (${cap}). Upgrade to add more.`,
			"TIER_LIMIT",
			403,
		);
	}
}

export function addPilotMonths(from: Date, months: PilotMonths): Date {
	const end = new Date(from);
	end.setMonth(end.getMonth() + months);
	return end;
}

/** Exported for tests — how long past_due has been open. */
export function pastDueAgeDays(
	org: Organization,
	now: Date = new Date(),
): number | null {
	const since = parseIso(
		typeof org.settings?.pastDueSince === "string"
			? org.settings.pastDueSince
			: null,
	);
	const fallback = parseIso(org.currentPeriodEnd ?? null);
	const start = since || fallback;
	if (!start) return null;
	return daysBetween(since || start, now);
}
