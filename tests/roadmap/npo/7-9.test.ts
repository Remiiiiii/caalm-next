import { describe, expect, it } from "vitest";
import { computeNextBestActions } from "@/lib/fundraising/next-best-action";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 7.9 invite from upcoming campaign events", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[7]?.tasks.find(
		(row) => row.taskCode === "7.9",
	);

	it("is catalogued as invite NBA", () => {
		expect(task?.title).toMatch(/Invite action/i);
	});

	it("shows invite only when eligible for a campaign event", () => {
		const withInvite = computeNextBestActions({
			segment: "Champion",
			lapseRiskScore: 5,
			daysSinceLastGift: 30,
			suggestedAskAmount: null,
			hasOpenPledgeInstallment: false,
			hasUpcomingPublicEvent: true,
			daysSinceLastPostedGift: 30,
			lastPostedGiftAmount: 100,
			thankYouThreshold: 0,
			hasThankInteractionWithin7Days: true,
			inviteEligibleCampaignEvent: true,
		});
		expect(withInvite.some((a) => a.kind === "invite")).toBe(true);

		const registered = computeNextBestActions({
			segment: "Champion",
			lapseRiskScore: 5,
			daysSinceLastGift: 30,
			suggestedAskAmount: null,
			hasOpenPledgeInstallment: false,
			hasUpcomingPublicEvent: true,
			daysSinceLastPostedGift: 30,
			lastPostedGiftAmount: 100,
			thankYouThreshold: 0,
			hasThankInteractionWithin7Days: true,
			inviteEligibleCampaignEvent: false,
		});
		expect(registered.some((a) => a.kind === "invite")).toBe(false);
	});
});
