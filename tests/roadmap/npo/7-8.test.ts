import { describe, expect, it } from "vitest";
import { computeNextBestActions } from "@/lib/fundraising/next-best-action";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 7.8 thank-you task from posted gift", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[7]?.tasks.find(
		(row) => row.taskCode === "7.8",
	);

	it("is catalogued as thank-you NBA", () => {
		expect(task?.title).toMatch(/Thank-you task/i);
	});

	it("threshold zero includes gifts without a thank note", () => {
		const actions = computeNextBestActions({
			segment: "Loyal",
			lapseRiskScore: 10,
			daysSinceLastGift: 2,
			suggestedAskAmount: 100,
			hasOpenPledgeInstallment: false,
			hasUpcomingPublicEvent: false,
			daysSinceLastPostedGift: 2,
			lastPostedGiftAmount: 50,
			thankYouThreshold: 0,
			hasThankInteractionWithin7Days: false,
			inviteEligibleCampaignEvent: false,
		});
		expect(actions.some((a) => a.kind === "thank")).toBe(true);
	});

	it("skips thank when a thank interaction exists", () => {
		const actions = computeNextBestActions({
			segment: "Loyal",
			lapseRiskScore: 10,
			daysSinceLastGift: 2,
			suggestedAskAmount: 100,
			hasOpenPledgeInstallment: false,
			hasUpcomingPublicEvent: false,
			daysSinceLastPostedGift: 2,
			lastPostedGiftAmount: 50,
			thankYouThreshold: 0,
			hasThankInteractionWithin7Days: true,
			inviteEligibleCampaignEvent: false,
		});
		expect(actions.some((a) => a.kind === "thank")).toBe(false);
	});
});
