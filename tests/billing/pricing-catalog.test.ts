import { describe, expect, it } from "vitest";
import { loadPricingFromMarkdown } from "@/lib/pricing";

describe("honest pricing catalog", () => {
	it("loads starter/growth with workspace prices and no sold-but-missing bullets", async () => {
		const { plans } = await loadPricingFromMarkdown();
		const starter = plans.find((p) => p.key === "starter");
		const growth = plans.find((p) => p.key === "growth");
		const enterprise = plans.find((p) => p.key === "enterprise");

		expect(starter?.monthly).toBe(79);
		expect(growth?.monthly).toBe(299);
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
	});
});
