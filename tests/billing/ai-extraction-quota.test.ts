import { beforeEach, describe, expect, it } from "vitest";
import {
	assertAndConsumeAiExtraction,
	getAiExtractionUsage,
	resetAiExtractQuotaForTests,
	resolveAiExtractionLimit,
} from "@/lib/billing/aiExtractionQuota";
import { PlanLimitError } from "@/lib/billing/planLimits";

describe("aiExtractionQuota", () => {
	beforeEach(() => {
		resetAiExtractQuotaForTests();
	});

	it("uses pilot cap while trialing", () => {
		expect(
			resolveAiExtractionLimit({ tier: "growth", billingStatus: "trialing" }),
		).toBe(100);
		expect(
			resolveAiExtractionLimit({ tier: "growth", billingStatus: "active" }),
		).toBe(500);
	});

	it("consumes and blocks at the monthly cap", async () => {
		const orgId = "org-ai-test";
		for (let i = 0; i < 50; i += 1) {
			await assertAndConsumeAiExtraction({
				orgId,
				tier: "starter",
				billingStatus: "active",
			});
		}
		expect(await getAiExtractionUsage(orgId)).toBe(50);

		await expect(
			assertAndConsumeAiExtraction({
				orgId,
				tier: "starter",
				billingStatus: "active",
			}),
		).rejects.toBeInstanceOf(PlanLimitError);
	});
});
