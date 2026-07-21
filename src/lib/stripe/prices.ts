export type PricingTier = "starter" | "growth" | "enterprise";
export type BillingInterval = "monthly" | "yearly";

const PRICE_ENV_KEYS: Record<PricingTier, Record<BillingInterval, string>> = {
	starter: {
		monthly: "STRIPE_PRICE_STARTER_MONTHLY",
		yearly: "STRIPE_PRICE_STARTER_YEARLY",
	},
	growth: {
		monthly: "STRIPE_PRICE_GROWTH_MONTHLY",
		yearly: "STRIPE_PRICE_GROWTH_YEARLY",
	},
	enterprise: {
		monthly: "STRIPE_PRICE_ENTERPRISE_MONTHLY",
		yearly: "STRIPE_PRICE_ENTERPRISE_YEARLY",
	},
};

export function getPriceId(
	tier: PricingTier,
	interval: BillingInterval,
): string {
	const envKey = PRICE_ENV_KEYS[tier][interval];
	const priceId = process.env[envKey];
	if (!priceId) {
		throw new Error(`${envKey} is not configured`);
	}
	return priceId;
}

export function getTierFromPriceId(
	priceId: string,
): { tier: PricingTier; interval: BillingInterval } | null {
	for (const tier of Object.keys(PRICE_ENV_KEYS) as PricingTier[]) {
		for (const interval of ["monthly", "yearly"] as BillingInterval[]) {
			const envKey = PRICE_ENV_KEYS[tier][interval];
			if (process.env[envKey] === priceId) {
				return { tier, interval };
			}
		}
	}
	return null;
}

/** Storage limits in bytes by tier (from PRICING.md) */
export const TIER_LIMITS: Record<
	PricingTier,
	{
		maxUsers: number;
		maxDepartments: number;
		maxContracts: number;
		storageBytes: number;
	}
> = {
	starter: {
		maxUsers: 10,
		maxDepartments: 3,
		maxContracts: 100,
		storageBytes: 10 * 1024 * 1024 * 1024,
	},
	growth: {
		maxUsers: 100,
		maxDepartments: 6,
		maxContracts: 2500,
		storageBytes: 100 * 1024 * 1024 * 1024,
	},
	enterprise: {
		maxUsers: 1000,
		maxDepartments: Number.POSITIVE_INFINITY,
		maxContracts: 25000,
		storageBytes: 1024 * 1024 * 1024 * 1024,
	},
};
