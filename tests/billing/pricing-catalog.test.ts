import { describe, expect, it } from "vitest";
import { loadPricingFromMarkdown } from "@/lib/pricing";
import {
	PILOT_AI_EXTRACTIONS_PER_MONTH,
	PILOT_TRIAL_DAYS,
	TIER_LIMITS,
} from "@/lib/stripe/prices";

describe("honest pricing catalog", () => {
	it("loads starter/growth with workspace prices and no sold-but-missing bullets", async () => {
		const { plans } = await loadPricingFromMarkdown();
		const starter = plans.find((p) => p.key === "starter");
		const growth = plans.find((p) => p.key === "growth");
		const enterprise = plans.find((p) => p.key === "enterprise");

		expect(starter?.monthly).toBe(79);
		expect(growth?.monthly).toBe(449);
		expect(enterprise?.monthly).toBe(0);

		const banned = [/SSO\/SAML/i, /Webhooks\/API/i, /Report scheduling/i, /99\.9%/];
		for (const plan of [starter, growth]) {
			const blob = (plan?.features || []).join("\n");
			for (const re of banned) {
				expect(blob).not.toMatch(re);
			}
		}

		expect(starter?.features.join(" ")).toMatch(/custom roles included/i);
		expect(growth?.features.join(" ")).toMatch(/License allocate/i);
		expect(growth?.features.join(" ")).toMatch(/HubSpot CRM origin/i);
		expect(enterprise?.features.join(" ")).toMatch(/Salesforce CRM origin/i);
		expect(growth?.features.join(" ")).toMatch(/Unlimited active licenses/i);
		expect(growth?.features.join(" ")).toMatch(/500 AI document extractions/i);
		expect(enterprise?.features.join(" ")).toMatch(/Sales-assisted only/i);
	});

	it("defines AI caps and 90-day Growth pilot constants", () => {
		expect(TIER_LIMITS.starter.maxAiExtractionsPerMonth).toBe(50);
		expect(TIER_LIMITS.growth.maxAiExtractionsPerMonth).toBe(500);
		expect(TIER_LIMITS.enterprise.maxAiExtractionsPerMonth).toBe(
			Number.POSITIVE_INFINITY,
		);
		expect(TIER_LIMITS.growth.maxLicenses).toBe(Number.POSITIVE_INFINITY);
		expect(PILOT_TRIAL_DAYS).toBe(90);
		expect(PILOT_AI_EXTRACTIONS_PER_MONTH).toBe(100);
	});
});
