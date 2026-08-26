import fs from "node:fs/promises";
import path from "node:path";
import { DEFAULT_PRICING_PLANS } from "@/lib/pricing-defaults";

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

	pricingCache = { plans: DEFAULT_PRICING_PLANS };
	pricingCacheTime = now;

	return { plans: DEFAULT_PRICING_PLANS };
}
