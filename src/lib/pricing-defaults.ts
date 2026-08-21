type DefaultPricingPlan = {
	key: "starter" | "growth" | "enterprise";
	name: string;
	monthly: number;
	yearly: number;
	features: string[];
};

/** Client-safe plan catalog so the upgrade modal can render without waiting on the API. */
export const DEFAULT_PRICING_PLANS: DefaultPricingPlan[] = [
	{
		key: "starter",
		name: "Starter",
		monthly: 79,
		yearly: 758.4,
		features: [
			"Up to **3 departments**",
			"Up to **10 staff users**",
			"Up to **100 active contracts** tracked",
			"**Analytics** for Admin + 2 departments",
			"**Reports** (basic) via `Reports & Analytics Page`",
			"**Email support**",
			"**Analytical data retention**: 90 days",
			"**Storage**: 10GB",
		],
	},
	{
		key: "growth",
		name: "Growth",
		monthly: 299,
		yearly: 2870.4,
		features: [
			"Up to **6 departments**",
			"Up to **100 staff users**",
			"Up to **2,500 active contracts**",
			"**Full analytics suite** across all departments",
			"**Report scheduling**",
			"**Webhooks/API access** for integrations",
			"**Priority support**",
			"**Storage**: 100GB",
		],
	},
	{
		key: "enterprise",
		name: "Enterprise",
		monthly: 999,
		yearly: 9590.4,
		features: [
			"**Dedicated account manager**",
			"**Unlimited departments**",
			"**Up to 1,000 staff users** (higher limits upon request)",
			"**25,000 active contracts** (higher upon request)",
			"**SSO/SAML & SCIM** (enterprise identity)",
			"**Advanced audit logs & exports**",
			"**Custom roles & permissions**, detailed access",
			"**Uptime SLA** 99.9% and **Dedicated CSM**",
			"**Storage**: 1 TB (expandable)",
			"**Custom integrations** and migration assistance",
		],
	},
];
