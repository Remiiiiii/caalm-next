import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { mapGiftRow } from "@/lib/gifts/repository-rows";
import type { Gift } from "@/lib/gifts/types";
import { listFundsForOrg } from "@/lib/funds/repository";
import {
	listRestrictionReleasesInRange,
	type RestrictionRelease,
} from "@/lib/funding/restriction-release.repository";
import { restrictionClassFromNetAsset } from "./restriction-class";
import type { JournalExportResult, JournalExportRow } from "./types";

function giftsTableId(): string {
	return appwriteConfig.giftsCollectionId || "69d91201001f4e8c2b01";
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

async function listPostedGiftsInRange(input: {
	orgId: string;
	startDate: string;
	endDate: string;
}): Promise<Gift[]> {
	const { tablesDB } = await createAdminClient();
	const pageSize = 100;
	const items: Gift[] = [];
	let offset = 0;
	for (;;) {
		const result = await tablesDB.listRows({
			databaseId: dbId(),
			tableId: giftsTableId(),
			queries: [
				Query.equal("orgId", input.orgId),
				Query.equal("status", "posted"),
				Query.greaterThanEqual("giftDate", input.startDate),
				Query.lessThanEqual("giftDate", input.endDate),
				Query.orderAsc("giftDate"),
				Query.limit(pageSize),
				Query.offset(offset),
			],
		});
		const page = (result.rows as unknown as Record<string, unknown>[]).map(
			mapGiftRow,
		);
		items.push(...page.filter((g) => !g.voidOfId));
		if (page.length < pageSize) break;
		offset += pageSize;
		if (offset > 10_000) break;
	}
	return items;
}

function giftRow(gift: Gift, restrictionClass: JournalExportRow["restrictionClass"]): JournalExportRow {
	return {
		rowKind: "gift",
		sourceId: gift.$id,
		transactionDate: gift.giftDate,
		fundCode: gift.fundCode,
		amount: gift.amount,
		restrictionClass,
		memo: "Posted gift",
	};
}

function reclassRows(
	release: RestrictionRelease,
	fundCodeById: Map<string, string>,
	restrictionByFundCode: Map<string, JournalExportRow["restrictionClass"]>,
): JournalExportRow[] {
	const fromCode = fundCodeById.get(release.fundFrom) ?? release.fundFrom;
	const toCode = fundCodeById.get(release.fundTo) ?? release.fundTo;
	const date = release.releasedAt.slice(0, 10);
	const memo = release.note?.trim() || "Restriction release";
	return [
		{
			rowKind: "reclass",
			sourceId: release.$id,
			transactionDate: date,
			fundCode: fromCode,
			amount: -release.amount,
			restrictionClass:
				restrictionByFundCode.get(fromCode) ?? "restricted",
			reclassLeg: "from",
			memo,
		},
		{
			rowKind: "reclass",
			sourceId: release.$id,
			transactionDate: date,
			fundCode: toCode,
			amount: release.amount,
			restrictionClass:
				restrictionByFundCode.get(toCode) ?? "unrestricted",
			reclassLeg: "to",
			memo,
		},
	];
}

export async function buildJournalExport(input: {
	orgId: string;
	startDate: string;
	endDate: string;
}): Promise<JournalExportResult> {
	const [gifts, releases, funds] = await Promise.all([
		listPostedGiftsInRange(input),
		listRestrictionReleasesInRange({
			orgId: input.orgId,
			startDate: input.startDate,
			endDate: input.endDate,
		}),
		listFundsForOrg(input.orgId),
	]);

	const fundCodeById = new Map(funds.map((f) => [f.$id, f.code]));
	const restrictionByFundCode = new Map(
		funds.map((f) => [
			f.code,
			restrictionClassFromNetAsset(f.netAssetClass),
		]),
	);

	const giftRows = gifts.map((gift) => {
		const restrictionClass =
			restrictionByFundCode.get(gift.fundCode) ??
			(gift.fundCode === "UNRESTRICTED" ? "unrestricted" : "restricted");
		return giftRow(gift, restrictionClass);
	});

	const reclassRowsFlat = releases.flatMap((release) =>
		reclassRows(release, fundCodeById, restrictionByFundCode),
	);

	const rows = [...giftRows, ...reclassRowsFlat].sort((a, b) => {
		const dateCmp = a.transactionDate.localeCompare(b.transactionDate);
		if (dateCmp !== 0) return dateCmp;
		if (a.rowKind !== b.rowKind) return a.rowKind === "gift" ? -1 : 1;
		return a.sourceId.localeCompare(b.sourceId);
	});

	const giftCashTotal = Math.round(
		giftRows.reduce((sum, row) => sum + row.amount, 0) * 100,
	) / 100;

	return {
		rows,
		giftRowCount: giftRows.length,
		reclassReleaseCount: releases.length,
		giftCashTotal,
		startDate: input.startDate,
		endDate: input.endDate,
	};
}
