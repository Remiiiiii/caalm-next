import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { mapGiftRow } from "@/lib/gifts/repository-rows";
import type { Gift } from "@/lib/gifts/types";
import { DEFAULT_LAPSE_DAYS, type LifecycleSegment } from "./constants";
import { extractRfmFeatures, type RfmGiftRow } from "./rfm";
import { computeLapseRiskScore } from "./scores";
import { classifyLifecycleSegment } from "./segments";

export type ConstituentSegmentRow = {
	$id: string;
	orgId: string;
	constituentId: string;
	segment: LifecycleSegment;
	computedAt: string;
	lapseRiskScore: number;
	featureWeightsJson: string;
};

function tableId(): string {
	return (
		appwriteConfig.constituentSegmentsCollectionId || "69d91501001f4e8c2b09"
	);
}

function giftsTableId(): string {
	return appwriteConfig.giftsCollectionId || "69d91201001f4e8c2b01";
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

function mapRow(row: Record<string, unknown>): ConstituentSegmentRow {
	return {
		$id: String(row.$id),
		orgId: String(row.orgId || ""),
		constituentId: String(row.constituentId || ""),
		segment: String(row.segment || "Lost") as LifecycleSegment,
		computedAt: String(row.computedAt || ""),
		lapseRiskScore: Number(row.lapseRiskScore ?? 0),
		featureWeightsJson: String(row.featureWeightsJson || "[]"),
	};
}

function giftsToRfmRows(gifts: Gift[]): RfmGiftRow[] {
	return gifts.map((g) => ({
		giftDate: g.giftDate,
		amount: g.amount,
		status: g.status,
		voidOfId: g.voidOfId,
	}));
}

async function listPostedGiftsForOrg(orgId: string): Promise<Gift[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: giftsTableId(),
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("status", "posted"),
			Query.limit(500),
		],
	});
	return (result.rows as unknown as Record<string, unknown>[]).map(mapGiftRow);
}

async function findSegmentRow(
	orgId: string,
	constituentId: string,
): Promise<ConstituentSegmentRow | null> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("constituentId", constituentId),
			Query.limit(1),
		],
	});
	const row = result.rows?.[0] as Record<string, unknown> | undefined;
	return row ? mapRow(row) : null;
}

export async function upsertConstituentSegment(input: {
	orgId: string;
	constituentId: string;
	segment: LifecycleSegment;
	computedAt: string;
	lapseRiskScore: number;
	featureWeightsJson: string;
}): Promise<void> {
	const { tablesDB } = await createAdminClient();
	const existing = await findSegmentRow(input.orgId, input.constituentId);
	const data = {
		orgId: input.orgId,
		constituentId: input.constituentId,
		segment: input.segment,
		computedAt: input.computedAt,
		lapseRiskScore: input.lapseRiskScore,
		featureWeightsJson: input.featureWeightsJson,
	};
	if (existing) {
		await tablesDB.updateRow({
			databaseId: dbId(),
			tableId: tableId(),
			rowId: existing.$id,
			data,
		});
		return;
	}
	await tablesDB.createRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: ID.unique(),
		data,
	});
}

export async function recomputeOrgSegments(
	orgId: string,
	asOf = new Date(),
	lapseDays = DEFAULT_LAPSE_DAYS,
): Promise<{ constituentsUpdated: number }> {
	const gifts = await listPostedGiftsForOrg(orgId);
	const byConstituent = new Map<string, Gift[]>();
	for (const gift of gifts) {
		const list = byConstituent.get(gift.constituentId) ?? [];
		list.push(gift);
		byConstituent.set(gift.constituentId, list);
	}

	const computedAt = asOf.toISOString();
	let constituentsUpdated = 0;

	for (const [constituentId, rows] of byConstituent) {
		const features = extractRfmFeatures(giftsToRfmRows(rows), asOf);
		const segment = classifyLifecycleSegment(features, lapseDays);
		const lapse = computeLapseRiskScore(features);
		await upsertConstituentSegment({
			orgId,
			constituentId,
			segment,
			computedAt,
			lapseRiskScore: lapse.score,
			featureWeightsJson: JSON.stringify(lapse.featureWeights),
		});
		constituentsUpdated += 1;
	}

	return { constituentsUpdated };
}

export async function listSegmentsForOrg(
	orgId: string,
): Promise<ConstituentSegmentRow[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries: [Query.equal("orgId", orgId), Query.limit(500)],
	});
	return (result.rows as unknown as Record<string, unknown>[]).map(mapRow);
}

export async function getSegmentForConstituent(
	orgId: string,
	constituentId: string,
): Promise<ConstituentSegmentRow | null> {
	return findSegmentRow(orgId, constituentId);
}

export async function listConstituentIdsForSegment(
	orgId: string,
	segment: string,
): Promise<string[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("segment", segment),
			Query.limit(500),
		],
	});
	return (result.rows as unknown as Record<string, unknown>[]).map((row) =>
		String(row.constituentId || ""),
	);
}

export async function recomputeAllOrgs(
	asOf = new Date(),
): Promise<{ orgsProcessed: number; constituentsUpdated: number }> {
	const gifts = await listAllPostedGifts();
	const orgIds = [...new Set(gifts.map((g) => g.orgId))];
	let constituentsUpdated = 0;
	for (const orgId of orgIds) {
		const result = await recomputeOrgSegments(orgId, asOf);
		constituentsUpdated += result.constituentsUpdated;
	}
	return { orgsProcessed: orgIds.length, constituentsUpdated };
}

async function listAllPostedGifts(): Promise<Gift[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: giftsTableId(),
		queries: [Query.equal("status", "posted"), Query.limit(500)],
	});
	return (result.rows as unknown as Record<string, unknown>[]).map(mapGiftRow);
}
