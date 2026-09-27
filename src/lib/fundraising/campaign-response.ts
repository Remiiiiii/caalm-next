/** Gift row with optional campaign attribution for response scoring. */
export type CampaignGiftRow = {
	giftDate: string;
	amount: number;
	status: string;
	voidOfId?: string;
	campaignId?: string;
};

function isCountableGift(gift: CampaignGiftRow): boolean {
	if (gift.status === "voided") return false;
	if (gift.voidOfId) return false;
	return gift.amount > 0;
}

/**
 * Share of countable gifts tied to a campaign (0–1), or null when there are no gifts.
 */
export function computeCampaignResponseRate(
	gifts: CampaignGiftRow[],
): number | null {
	const countable = gifts.filter(isCountableGift);
	if (countable.length === 0) return null;
	const withCampaign = countable.filter((g) => g.campaignId?.trim()).length;
	return withCampaign / countable.length;
}
