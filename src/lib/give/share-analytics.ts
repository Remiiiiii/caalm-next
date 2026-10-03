import { getCampaignById } from "@/lib/campaigns/repository";
import {
	aggregateShareAttributionMetrics,
	type ShareAttributionTotals,
	type ShareCampaignBucket,
	type ShareMetricRow,
} from "@/lib/give/attribution";
import { listGiveShareEventsSince } from "@/lib/give/share-events";
import { listPostedGiftsSince } from "@/lib/gifts/repository";

const DEFAULT_DAYS = 90;

export type GiveShareAnalytics = {
	days: number;
	totals: ShareAttributionTotals;
	buckets: ShareCampaignBucket[];
};

export async function getGiveShareAnalytics(
	orgId: string,
	days = DEFAULT_DAYS,
): Promise<GiveShareAnalytics> {
	const since = new Date();
	since.setUTCDate(since.getUTCDate() - days);
	const sinceIso = since.toISOString();

	const [visits, gifts] = await Promise.all([
		listGiveShareEventsSince(orgId, sinceIso),
		listPostedGiftsSince(orgId, sinceIso),
	]);

	const attributedGifts = gifts.filter(
		(gift) =>
			!gift.voidOfId &&
			gift.amount > 0 &&
			Boolean(gift.shareSource || gift.shareMedium || gift.shareCampaign),
	);

	const campaignNames = new Map<string, string>();
	for (const gift of attributedGifts) {
		if (!gift.campaignId || campaignNames.has(gift.campaignId)) continue;
		const campaign = await getCampaignById(gift.campaignId, orgId);
		if (campaign) campaignNames.set(gift.campaignId, campaign.name);
	}

	const visitRows: ShareMetricRow[] = visits.map((event) => ({
		shareSource: event.shareSource,
		shareMedium: event.shareMedium,
		shareCampaign: event.shareCampaign,
	}));
	const giftRows: ShareMetricRow[] = attributedGifts.map((gift) => ({
		shareSource: gift.shareSource,
		shareMedium: gift.shareMedium,
		shareCampaign: gift.shareCampaign,
		amount: gift.amount,
		campaignId: gift.campaignId,
		campaignName: gift.campaignId
			? campaignNames.get(gift.campaignId)
			: undefined,
	}));

	const { buckets, totals } = aggregateShareAttributionMetrics({
		visits: visitRows,
		gifts: giftRows,
	});

	return { days, totals, buckets };
}
