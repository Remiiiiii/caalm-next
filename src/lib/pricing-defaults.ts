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
		yearly: Math.round(79 * 12 * 0.8 * 100) / 100,
		features: [
			"Up to **3 departments**",
			"Up to **10 staff users**",
			"Up to **100 active contracts**",
			"Up to **100 active licenses**",
			"**50 AI document extractions / month**",
			"**Contract & license intake** with AI field extraction",
			"**Multi-step approvals** and renewal / expiry alerts",
			"**Permission-based roles** (custom roles included)",
			"**Basic dashboards & reports**",
			"**Email support**",
			"**Storage**: 10 GB",
		],
	},
	{
		key: "growth",
		name: "Growth",
		monthly: 449,
		yearly: Math.round(449 * 12 * 0.8 * 100) / 100,
		features: [
			"Up to **6 departments**",
			"Up to **100 staff users**",
			"Up to **2,500 active contracts**",
			"**Unlimited active licenses**",
			"**500 AI document extractions / month**",
			"**Department-scoped views** and fuller operational dashboards",
			"**HubSpot CRM origin** (deal stage → contract draft)",
			"**License allocate & renew** workflows",
			"**Priority email support**",
			"**Storage**: 100 GB",
			"**90-day Growth pilot** available (AI capped at 100 / month during pilot)",
		],
	},
	{
		key: "enterprise",
		name: "Enterprise",
		monthly: 0,
		yearly: 0,
		features: [
			"**Custom user / contract / storage / AI limits**",
			"**Unlimited licenses**",
			"**Dedicated account manager / CSM**",
			"**Migration assistance** and custom integration planning",
			"**Salesforce CRM origin** (sales-led setup)",
			"**Security questionnaire support**",
			"**Priority support**",
			"SSO/SAML, customer API, and formal SLAs via **custom agreement** as they ship",
			"**Sales-assisted only** — no self-serve checkout",
		],
	},
];
