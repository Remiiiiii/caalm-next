import { describe, expect, it } from "vitest";
import {
	computeLapseRiskScore,
	computeUpgradeReadinessScore,
} from "@/lib/fundraising/scores";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 3.6 upgrade-readiness score", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[3]?.tasks.find(
		(row) => row.taskCode === "3.6",
	);

	it("is catalogued as upgrade readiness", () => {
		expect(task?.title).toMatch(/upgrade-readiness/i);
	});

	it("does not zero the score when campaign data is missing", () => {
		const result = computeUpgradeReadinessScore({
			features: {
				recencyDays: 30,
				frequency: 3,
				monetary: 400,
				streakMonths: 2,
				giftTrend: 40,
			},
			campaignResponseRate: null,
			capacityBand: null,
		});
		expect(result.score).toBeGreaterThan(0);
		expect(result.topFeatures.length).toBeGreaterThan(0);
	});

	it("returns top weighted features with lapse scores", () => {
		const lapse = computeLapseRiskScore({
			recencyDays: 400,
			frequency: 2,
			monetary: 500,
			streakMonths: 0,
			giftTrend: -50,
		});
		expect(lapse.topFeatures.length).toBeLessThanOrEqual(3);
	});
});
