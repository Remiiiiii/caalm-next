/**
 * Share-link attribution (UTM → stored share* fields).
 * Pure helpers — safe for client and server.
 */

import { slugifyUtmCampaign } from "@/lib/give/share";

export const SHARE_FIELD_MAX = 120;
export const NONE_SHARE_CAMPAIGN = "(none)";

export type GiveShareAttribution = {
	shareSource?: string;
	shareMedium?: string;
	shareCampaign?: string;
};

export type ShareMetricRow = GiveShareAttribution & {
	amount?: number;
	campaignId?: string;
	campaignName?: string;
};

export type ShareSourceBreakdown = {
	shareSource: string;
	visitCount: number;
	giftCount: number;
	giftTotal: number;
	conversionRate: number;
};

export type ShareCampaignBucket = {
	shareCampaign: string;
	visitCount: number;
	giftCount: number;
	giftTotal: number;
	conversionRate: number;
	linkedCampaignName?: string;
	sources: ShareSourceBreakdown[];
};

export type ShareAttributionTotals = {
	visitCount: number;
	giftCount: number;
	giftTotal: number;
	conversionRate: number;
};

function clipField(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const trimmed = value.trim().slice(0, SHARE_FIELD_MAX);
	return trimmed || undefined;
}

function readParam(
	input: URLSearchParams | Record<string, unknown>,
	key: string,
): unknown {
	if (input instanceof URLSearchParams) return input.get(key);
	return input[key];
}

/** Map utm_* or share* fields from query params or a JSON body. */
export function parseGiveShareAttribution(
	input: URLSearchParams | Record<string, unknown> | null | undefined,
): GiveShareAttribution {
	if (!input) return {};
	return {
		shareSource: clipField(
			readParam(input, "shareSource") ?? readParam(input, "utm_source"),
		),
		shareMedium: clipField(
			readParam(input, "shareMedium") ?? readParam(input, "utm_medium"),
		),
		shareCampaign: clipField(
			readParam(input, "shareCampaign") ?? readParam(input, "utm_campaign"),
		),
	};
}

export function hasShareAttribution(a: GiveShareAttribution): boolean {
	return Boolean(a.shareSource || a.shareMedium || a.shareCampaign);
}

export function giveAttrPersistKey(orgSlug: string): string {
	return `give-attr:${orgSlug}`;
}

export function giveVisitDedupeKey(
	orgSlug: string,
	a: GiveShareAttribution,
): string {
	return `give-visit:${orgSlug}:${a.shareSource ?? ""}:${a.shareMedium ?? ""}:${a.shareCampaign ?? ""}`;
}

export function campaignBucketKey(shareCampaign?: string): string {
	return shareCampaign?.trim() || NONE_SHARE_CAMPAIGN;
}

function conversionRate(gifts: number, visits: number): number {
	if (visits <= 0) return 0;
	return gifts / visits;
}

export function matchCampaignIdFromShareTag(
	campaigns: Array<{ $id: string; name: string }>,
	shareCampaign: string | undefined,
): string | undefined {
	const tag = shareCampaign?.trim();
	if (!tag) return undefined;
	const matches = campaigns.filter(
		(campaign) => slugifyUtmCampaign(campaign.name) === tag,
	);
	return matches.length === 1 ? matches[0]!.$id : undefined;
}

export function aggregateShareAttributionMetrics(input: {
	visits: ShareMetricRow[];
	gifts: ShareMetricRow[];
}): { buckets: ShareCampaignBucket[]; totals: ShareAttributionTotals } {
	const bucketMap = new Map<
		string,
		{
			visitCount: number;
			giftCount: number;
			giftTotal: number;
			linkedCampaignName?: string;
			sources: Map<
				string,
				{ visitCount: number; giftCount: number; giftTotal: number }
			>;
		}
	>();

	const ensure = (tag: string) => {
		let bucket = bucketMap.get(tag);
		if (!bucket) {
			bucket = {
				visitCount: 0,
				giftCount: 0,
				giftTotal: 0,
				sources: new Map(),
			};
			bucketMap.set(tag, bucket);
		}
		return bucket;
	};

	const ensureSource = (
		bucket: ReturnType<typeof ensure>,
		source: string,
	) => {
		let row = bucket.sources.get(source);
		if (!row) {
			row = { visitCount: 0, giftCount: 0, giftTotal: 0 };
			bucket.sources.set(source, row);
		}
		return row;
	};

	for (const visit of input.visits) {
		const tag = campaignBucketKey(visit.shareCampaign);
		const bucket = ensure(tag);
		bucket.visitCount += 1;
		const source = visit.shareSource?.trim() || "(none)";
		ensureSource(bucket, source).visitCount += 1;
	}

	for (const gift of input.gifts) {
		const tag = campaignBucketKey(gift.shareCampaign);
		const bucket = ensure(tag);
		bucket.giftCount += 1;
		bucket.giftTotal += Number(gift.amount) || 0;
		if (gift.campaignName && !bucket.linkedCampaignName) {
			bucket.linkedCampaignName = gift.campaignName;
		}
		const source = gift.shareSource?.trim() || "(none)";
		const sourceRow = ensureSource(bucket, source);
		sourceRow.giftCount += 1;
		sourceRow.giftTotal += Number(gift.amount) || 0;
	}

	const buckets = [...bucketMap.entries()]
		.map(([shareCampaign, bucket]) => ({
			shareCampaign,
			visitCount: bucket.visitCount,
			giftCount: bucket.giftCount,
			giftTotal: bucket.giftTotal,
			conversionRate: conversionRate(bucket.giftCount, bucket.visitCount),
			linkedCampaignName: bucket.linkedCampaignName,
			sources: [...bucket.sources.entries()]
				.map(([shareSource, row]) => ({
					shareSource,
					visitCount: row.visitCount,
					giftCount: row.giftCount,
					giftTotal: row.giftTotal,
					conversionRate: conversionRate(row.giftCount, row.visitCount),
				}))
				.sort((a, b) => b.giftTotal - a.giftTotal || b.visitCount - a.visitCount),
		}))
		.sort((a, b) => b.giftTotal - a.giftTotal || b.visitCount - a.visitCount);

	const totals = buckets.reduce<ShareAttributionTotals>(
		(acc, bucket) => ({
			visitCount: acc.visitCount + bucket.visitCount,
			giftCount: acc.giftCount + bucket.giftCount,
			giftTotal: acc.giftTotal + bucket.giftTotal,
			conversionRate: 0,
		}),
		{ visitCount: 0, giftCount: 0, giftTotal: 0, conversionRate: 0 },
	);
	totals.conversionRate = conversionRate(totals.giftCount, totals.visitCount);

	return { buckets, totals };
}
