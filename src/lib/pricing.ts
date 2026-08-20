import fs from "node:fs/promises";
import path from "node:path";

export type PricingPlan = {
	key: "starter" | "growth" | "enterprise";
	name: string;
	monthly: number;
	yearly: number;
	features: string[];
};

export type PricingData = {
	plans: PricingPlan[];
};

function parseCurrencyToNumber(value: string): number {
	const numeric = value.replace(/[^0-9.]/g, "");
	const parsed = parseFloat(numeric);
	return Number.isFinite(parsed) ? parsed : 0;
}

function sectionFor({
	md,
	heading,
}: {
	md: string;
	heading: string;
}): string | null {
	const re = new RegExp(
		`###\\s+${heading}\\s*[\\r\\n]([\\s\\S]*?)(?=\\n###\\s+|$)`,
		"i",
	);
	const m = md.match(re);
	return m ? m[1] : null;
}

function extractPrices(section: string): { monthly: number; yearly: number } {
	if (/Custom\s*\(contact sales\)/i.test(section)) {
		return { monthly: 0, yearly: 0 };
	}
	const monthly = section.match(/\*\*Monthly\*\*:\s*\$([0-9.,]+)/i)?.[1] ?? "0";
	const yearly =
		section.match(/\*\*Yearly[^*]*\*\*:\s*\$([0-9.,]+)/i)?.[1] ?? "0";
	return {
		monthly: parseCurrencyToNumber(monthly),
		yearly: parseCurrencyToNumber(yearly),
	};
}

function extractFeatures(section: string): string[] {
	const start = section.search(/-\s*\*\*Includes[^*]*\*\*\s*:/i);
	if (start === -1) return [];
	const slice = section.slice(start);
	const features: string[] = [];
	const re = /\n\s*-\s+([^\n][^\n]*)/g;
	let m: RegExpExecArray | null = re.exec(slice);
	while (m !== null) {
		const text = m[1].trim();
		if (/^---/.test(text) || /^###\s+/.test(text)) break;
		features.push(text);
		m = re.exec(slice);
	}
	return features;
}

// Cache the pricing data to avoid reading from file on every request
let pricingCache: PricingData | null = null;
let pricingCacheTime: number = 0;
const PRICING_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function loadPricingFromMarkdown(): Promise<PricingData> {
	// Return cached data if it's still valid
	const now = Date.now();
	if (pricingCache && now - pricingCacheTime < PRICING_CACHE_TTL) {
		return pricingCache;
	}

	// Try multiple locations to be resilient on different deploy targets (e.g., Vercel)
	const candidatePaths = [
		path.join(process.cwd(), "public", "PRICING.md"),
		path.join(process.cwd(), "public", "docs", "PRICING.md"),
		path.join(process.cwd(), "docs", "PRICING.md"),
	];

	let md: string | null = null;
	let lastError: Error | null = null;

	for (const p of candidatePaths) {
		try {
			md = await fs.readFile(p, "utf8");
			console.log(`Successfully loaded pricing from: ${p}`);
			break;
		} catch (err) {
			lastError = err as Error;
			// continue trying next path
		}
	}

	if (!md && lastError) {
		console.warn(
			`Could not find PRICING.md in any of the candidate paths:`,
			candidatePaths,
		);
		console.warn(`Last error:`, lastError.message);
	}

	if (md) {
		const planDefs = [
			{ key: "starter" as const, name: "Starter" },
			{ key: "growth" as const, name: "Growth" },
			{ key: "enterprise" as const, name: "Enterprise" },
		];

		const plans: PricingPlan[] = planDefs.map(({ key, name }) => {
			const sec = sectionFor({ md: md as string, heading: name }) || "";
			const { monthly, yearly } = extractPrices(sec);
			const features = extractFeatures(sec);
			return { key, name, monthly, yearly, features };
		});

		// Cache the result
		pricingCache = { plans };
		pricingCacheTime = now;

		return { plans };
	}

	// Fallback defaults if markdown is not found at build time
	const starterMonthly = 79;
	const proMonthly = 299;

	// Keep in sync with public/PRICING.md (source of truth when markdown loads)
	const defaults: PricingPlan[] = [
		{
			key: "starter",
			name: "Starter",
			monthly: starterMonthly,
			yearly: Math.round(starterMonthly * 12 * 0.8 * 100) / 100,
			features: [
				"Up to **3 departments**",
				"Up to **10 staff users**",
				"Up to **100 active contracts**",
				"Up to **100 active licenses**",
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
			monthly: proMonthly,
			yearly: Math.round(proMonthly * 12 * 0.8 * 100) / 100,
			features: [
				"Up to **6 departments**",
				"Up to **100 staff users**",
				"Up to **2,500 active contracts**",
				"Up to **2,500 active licenses**",
				"**Department-scoped views** and fuller operational dashboards",
				"**License allocate & renew** workflows",
				"**Priority email support**",
				"**Storage**: 100 GB",
			],
		},
		{
			key: "enterprise",
			name: "Enterprise",
			monthly: 0,
			yearly: 0,
			features: [
				"**Custom user / contract / license / storage limits**",
				"**Dedicated account manager / CSM**",
				"**Migration assistance** and custom integration planning",
				"**Security questionnaire support**",
				"**Priority support**",
				"SSO/SAML, customer API, and formal SLAs via **custom agreement** as they ship",
			],
		},
	];

	// Cache the fallback defaults too
	pricingCache = { plans: defaults };
	pricingCacheTime = now;

	return { plans: defaults };
}
