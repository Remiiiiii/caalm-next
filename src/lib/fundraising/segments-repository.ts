import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { mapGiftRow } from "@/lib/gifts/repository-rows";
import type { Gift } from "@/lib/gifts/types";
import { computeSuggestedAsk } from "./ask";
import { computeCampaignResponseRate } from "./campaign-response";
import { DEFAULT_LAPSE_DAYS, type LifecycleSegment } from "./constants";
import { extractRfmFeatures, type RfmGiftRow } from "./rfm";
import { computeLapseRiskScore, computeUpgradeReadinessScore } from "./scores";
import { classifyLifecycleSegment } from "./segments";
import { mapCapacityByConstituent } from "./wealth-repository";

export type ConstituentSegmentRow = {
	$id: string;
	orgId: string;
	constituentId: string;
	segment: LifecycleSegment;
	computedAt: string;
	lapseRiskScore: number;
	featureWeightsJson: string;
	upgradeReadinessScore?: number;
	upgradeFeatureWeightsJson?: string;
	suggestedAskAmount?: number | null;
	askOverrideAmount?: number | null;
	askOverrideReason?: string | null;
	stewardshipContactedAt?: string | null;
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

function constituentsTableId(): string {
	return appwriteConfig.constituentsCollectionId || "69c8d4f100a8c4d1e2f0";
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
		upgradeReadinessScore:
			row.upgradeReadinessScore != null
				? Number(row.upgradeReadinessScore)
				: undefined,
		upgradeFeatureWeightsJson: row.upgradeFeatureWeightsJson
			? String(row.upgradeFeatureWeightsJson)
			: undefined,
		suggestedAskAmount:
			row.suggestedAskAmount != null
				? Number(row.suggestedAskAmount)
				: undefined,
		askOverrideAmount:
			row.askOverrideAmount != null
				? Number(row.askOverrideAmount)
				: undefined,
		askOverrideReason: row.askOverrideReason
			? String(row.askOverrideReason)
			: undefined,
		stewardshipContactedAt: row.stewardshipContactedAt
			? String(row.stewardshipContactedAt)
			: undefined,
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

function giftsForCampaignResponse(gifts: Gift[]) {
	return gifts.map((g) => ({
		giftDate: g.giftDate,
		amount: g.amount,
		status: g.status,
		voidOfId: g.voidOfId,
		campaignId: g.campaignId,
	}));
}

async function loadDoNotContactIds(orgId: string): Promise<Set<string>> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: constituentsTableId(),
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("doNotContact", true),
			Query.limit(500),
		],
	});
	const ids = new Set<string>();
	for (const row of result.rows as unknown as Record<string, unknown>[]) {
		ids.add(String(row.$id));
	}
	return ids;
}

async function deleteSegmentRow(orgId: string, constituentId: string) {
	const existing = await findSegmentRow(orgId, constituentId);
	if (!existing) return;
	const { tablesDB } = await createAdminClient();
	await tablesDB.deleteRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: existing.$id,
	});
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
	upgradeReadinessScore: number;
	upgradeFeatureWeightsJson: string;
	suggestedAskAmount: number | null;
	askOverrideAmount?: number | null;
	askOverrideReason?: string | null;
	stewardshipContactedAt?: string | null;
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
		upgradeReadinessScore: input.upgradeReadinessScore,
		upgradeFeatureWeightsJson: input.upgradeFeatureWeightsJson,
		suggestedAskAmount: input.suggestedAskAmount,
		askOverrideAmount: input.askOverrideAmount ?? null,
		askOverrideReason: input.askOverrideReason ?? null,
		stewardshipContactedAt:
			input.stewardshipContactedAt ?? existing?.stewardshipContactedAt ?? null,
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
): Promise<{ constituentsUpdated: number; skippedDnc: number }> {
	const gifts = await listPostedGiftsForOrg(orgId);
	const capacityByConstituent = await mapCapacityByConstituent(orgId);
	const dncIds = await loadDoNotContactIds(orgId);
	const byConstituent = new Map<string, Gift[]>();
	for (const gift of gifts) {
		const list = byConstituent.get(gift.constituentId) ?? [];
		list.push(gift);
		byConstituent.set(gift.constituentId, list);
	}

	const computedAt = asOf.toISOString();
	let constituentsUpdated = 0;
	let skippedDnc = 0;

	for (const [constituentId, rows] of byConstituent) {
		if (dncIds.has(constituentId)) {
			await deleteSegmentRow(orgId, constituentId);
			skippedDnc += 1;
			continue;
		}
		const features = extractRfmFeatures(giftsToRfmRows(rows), asOf);
		const segment = classifyLifecycleSegment(features, lapseDays);
		const lapse = computeLapseRiskScore(features);
		const capacityBand = capacityByConstituent.get(constituentId) ?? null;
		const campaignRate = computeCampaignResponseRate(
			giftsForCampaignResponse(rows),
		);
		const upgrade = computeUpgradeReadinessScore({
			features,
			campaignResponseRate: campaignRate,
			capacityBand,
		});
		const ask = computeSuggestedAsk({
			gifts: giftsToRfmRows(rows),
			upgradeReadinessScore: upgrade.score,
			capacityBand,
		});
		const existing = await findSegmentRow(orgId, constituentId);
		await upsertConstituentSegment({
			orgId,
			constituentId,
			segment,
			computedAt,
			lapseRiskScore: lapse.score,
			featureWeightsJson: JSON.stringify(lapse.featureWeights),
			upgradeReadinessScore: upgrade.score,
			upgradeFeatureWeightsJson: JSON.stringify(upgrade.featureWeights),
			suggestedAskAmount: ask.suggestedAsk,
			askOverrideAmount: existing?.askOverrideAmount ?? null,
			askOverrideReason: existing?.askOverrideReason ?? null,
			stewardshipContactedAt: existing?.stewardshipContactedAt ?? null,
		});
		constituentsUpdated += 1;
	}

	return { constituentsUpdated, skippedDnc };
}

export async function updateAskOverride(input: {
	orgId: string;
	constituentId: string;
	askOverrideAmount: number;
	askOverrideReason: string;
}): Promise<ConstituentSegmentRow | null> {
	const existing = await findSegmentRow(input.orgId, input.constituentId);
	if (!existing) return null;
	const { tablesDB } = await createAdminClient();
	const updated = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: existing.$id,
		data: {
			askOverrideAmount: input.askOverrideAmount,
			askOverrideReason: input.askOverrideReason.trim(),
		},
	});
	return mapRow(updated as unknown as Record<string, unknown>);
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

export async function markStewardshipContactedAt(input: {
	orgId: string;
	constituentId: string;
	contactedAt: string;
}): Promise<void> {
	const existing = await findSegmentRow(input.orgId, input.constituentId);
	if (!existing) return;
	const { tablesDB } = await createAdminClient();
	await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: existing.$id,
		data: { stewardshipContactedAt: input.contactedAt },
	});
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
