import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { mapGiftRow } from "@/lib/gifts/repository-rows";

const PAGE_SIZE_MAX = 100;

/** Minimal row shape for donor KPI unit tests (posted gifts only). */
export type PostedGiftMetricRow = {
	constituentId: string;
	amount: number;
	giftDate: string;
	voidOfId?: string;
};

export type DonorMetricSlice = {
	uniqueDonorsYtd: number;
	/** Null when prior-year donor count is zero (display em dash). */
	retentionRate: number | null;
	newDonorsYtd: number;
};

export type DevelopmentMetrics = {
	year: number;
	ytdDollars: number;
	/** False when the org has no countable posted gifts on record. */
	hasPostedGifts: boolean;
} & DonorMetricSlice;

export function giftCalendarYear(giftDate: string): number {
	return new Date(giftDate).getFullYear();
}

/** Posted gifts that count toward dollars and donor stats (void reversals excluded). */
export function isCountablePostedGift(row: PostedGiftMetricRow): boolean {
	return !row.voidOfId && row.amount > 0;
}

export function sumYtdPostedDollars(
	rows: PostedGiftMetricRow[],
	year: number,
): number {
	return rows
		.filter(isCountablePostedGift)
		.filter((row) => giftCalendarYear(row.giftDate) === year)
		.reduce((sum, row) => sum + row.amount, 0);
}

/**
 * Retention = donors with a posted gift in `year` and in `year - 1`, divided by
 * unique donors with a posted gift in `year - 1`.
 * New donors = constituents whose first countable posted gift falls in `year`.
 */
export function computeDonorMetrics(
	rows: PostedGiftMetricRow[],
	year: number,
): DonorMetricSlice {
	const countable = rows.filter(isCountablePostedGift);
	const donorsThisYear = new Set<string>();
	const donorsLastYear = new Set<string>();
	const firstGiftYearByDonor = new Map<string, number>();

	for (const row of countable) {
		const y = giftCalendarYear(row.giftDate);
		if (y === year) donorsThisYear.add(row.constituentId);
		if (y === year - 1) donorsLastYear.add(row.constituentId);
		const prev = firstGiftYearByDonor.get(row.constituentId);
		if (prev == null || y < prev) {
			firstGiftYearByDonor.set(row.constituentId, y);
		}
	}

	let retained = 0;
	for (const id of donorsLastYear) {
		if (donorsThisYear.has(id)) retained += 1;
	}

	const lastYearCount = donorsLastYear.size;
	const retentionRate =
		lastYearCount === 0 ? null : retained / lastYearCount;

	let newDonorsYtd = 0;
	for (const firstYear of firstGiftYearByDonor.values()) {
		if (firstYear === year) newDonorsYtd += 1;
	}

	return {
		uniqueDonorsYtd: donorsThisYear.size,
		retentionRate,
		newDonorsYtd,
	};
}

export function formatRetentionPercent(rate: number | null): string {
	if (rate == null) return "—";
	return `${Math.round(rate * 1000) / 10}%`;
}

/** ROI = (posted gifts − cost) / cost; null when cost is zero or missing. */
export function computeCampaignRoi(
	postedTotal: number,
	campaignCost: number | undefined,
): number | null {
	if (campaignCost == null || campaignCost <= 0) return null;
	return (postedTotal - campaignCost) / campaignCost;
}

export function formatCampaignRoi(roi: number | null): string {
	if (roi == null) return "—";
	return `${Math.round(roi * 1000) / 10}%`;
}

function giftsTableId(): string {
	return appwriteConfig.giftsCollectionId || "69d91201001f4e8c2b01";
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

async function listAllPostedGiftsForOrg(orgId: string) {
	const { tablesDB } = await createAdminClient();
	const all: PostedGiftMetricRow[] = [];
	let cursor: string | undefined;

	for (;;) {
		const queries = [
			Query.equal("orgId", orgId),
			Query.equal("status", "posted"),
			Query.limit(PAGE_SIZE_MAX),
		];
		if (cursor) queries.push(Query.cursorAfter(cursor));

		const result = await tablesDB.listRows({
			databaseId: dbId(),
			tableId: giftsTableId(),
			queries,
		});
		const batch = (result.rows as unknown as Record<string, unknown>[]).map(
			mapGiftRow,
		);
		for (const gift of batch) {
			all.push({
				constituentId: gift.constituentId,
				amount: gift.amount,
				giftDate: gift.giftDate,
				voidOfId: gift.voidOfId,
			});
		}
		if (batch.length < PAGE_SIZE_MAX) break;
		cursor = batch[batch.length - 1]?.$id;
	}

	return all;
}

/** Live org-scoped development KPIs (no mock data). */
export async function computeDevelopmentMetrics(
	orgId: string,
	asOf = new Date(),
): Promise<DevelopmentMetrics> {
	const year = asOf.getFullYear();
	const rows = await listAllPostedGiftsForOrg(orgId);
	const countable = rows.filter(isCountablePostedGift);
	const donor = computeDonorMetrics(rows, year);
	return {
		year,
		ytdDollars: sumYtdPostedDollars(rows, year),
		hasPostedGifts: countable.length > 0,
		...donor,
	};
}
