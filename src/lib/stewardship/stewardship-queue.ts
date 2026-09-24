import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { getConstituentById } from "@/lib/constituents/repository";
import { constituentDisplayName } from "@/lib/constituents/display";
import {
	pickPrimaryNextBestAction,
	type NextBestAction,
} from "@/lib/fundraising/next-best-action";
import {
	listSegmentsForOrg,
	type ConstituentSegmentRow,
	markStewardshipContactedAt,
} from "@/lib/fundraising/segments-repository";
import { mapGiftRow } from "@/lib/gifts/repository-rows";
import type { Gift } from "@/lib/gifts/types";
import { createNote } from "@/lib/constituents/notes";
import { buildNextBestActionContext } from "./stewardship-context";

export type StewardshipQueueRow = {
	segmentRowId: string;
	constituentId: string;
	displayName: string;
	segment: string;
	lapseRiskScore: number;
	computedAt: string;
	lastGiftAmount: number | null;
	lastGiftDate: string | null;
	nextBestAction: NextBestAction | null;
};

const STEWARDSHIP_SEGMENTS = new Set(["At-risk", "Lapsed"]);

function giftsTableId(): string {
	return appwriteConfig.giftsCollectionId || "69d91201001f4e8c2b01";
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

function isActiveInQueue(row: ConstituentSegmentRow): boolean {
	if (!STEWARDSHIP_SEGMENTS.has(row.segment)) return false;
	if (!row.stewardshipContactedAt) return true;
	return row.stewardshipContactedAt < row.computedAt;
}

async function loadLastGiftsByConstituent(
	orgId: string,
): Promise<Map<string, Gift>> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: giftsTableId(),
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("status", "posted"),
			Query.orderDesc("giftDate"),
			Query.limit(500),
		],
	});
	const map = new Map<string, Gift>();
	for (const row of result.rows as unknown as Record<string, unknown>[]) {
		const gift = mapGiftRow(row);
		if (gift.voidOfId || gift.amount <= 0) continue;
		if (!map.has(gift.constituentId)) {
			map.set(gift.constituentId, gift);
		}
	}
	return map;
}

export async function listStewardshipQueue(
	orgId: string,
): Promise<StewardshipQueueRow[]> {
	const segments = (await listSegmentsForOrg(orgId)).filter(isActiveInQueue);
	const lastGifts = await loadLastGiftsByConstituent(orgId);
	const nbaContext = await buildNextBestActionContext(orgId);

	const rows: StewardshipQueueRow[] = [];
	for (const segment of segments) {
		const constituent = await getConstituentById(segment.constituentId);
		if (!constituent || constituent.orgId !== orgId || constituent.mergedIntoId) {
			continue;
		}
		const lastGift = lastGifts.get(segment.constituentId);
		const nextBestAction = pickPrimaryNextBestAction({
			segment: segment.segment,
			lapseRiskScore: segment.lapseRiskScore,
			daysSinceLastGift: nbaContext.daysSinceGift(lastGift?.giftDate),
			suggestedAskAmount:
				segment.askOverrideAmount ?? segment.suggestedAskAmount ?? null,
			hasOpenPledgeInstallment: nbaContext.openPledgeConstituentIds.has(
				segment.constituentId,
			),
			hasUpcomingPublicEvent: nbaContext.orgHasUpcomingPublicEvent,
			daysSinceLastPostedGift: nbaContext.daysSinceGift(lastGift?.giftDate),
		});

		rows.push({
			segmentRowId: segment.$id,
			constituentId: segment.constituentId,
			displayName: constituentDisplayName(constituent),
			segment: segment.segment,
			lapseRiskScore: segment.lapseRiskScore,
			computedAt: segment.computedAt,
			lastGiftAmount: lastGift?.amount ?? null,
			lastGiftDate: lastGift?.giftDate ?? null,
			nextBestAction,
		});
	}

	rows.sort((a, b) => {
		if (b.lapseRiskScore !== a.lapseRiskScore) {
			return b.lapseRiskScore - a.lapseRiskScore;
		}
		const amountA = a.lastGiftAmount ?? 0;
		const amountB = b.lastGiftAmount ?? 0;
		return amountB - amountA;
	});

	return rows;
}

export async function markStewardshipContacted(input: {
	orgId: string;
	constituentId: string;
	authorUserId: string;
	authorName?: string;
	noteBody?: string;
}): Promise<void> {
	const segment = (await listSegmentsForOrg(input.orgId)).find(
		(row) => row.constituentId === input.constituentId,
	);
	if (!segment) {
		throw new StewardshipQueueError("Segment row not found", 404);
	}

	const body =
		input.noteBody?.trim() ||
		"Stewardship outreach — marked contacted from the at-risk queue.";

	await createNote({
		orgId: input.orgId,
		constituentId: input.constituentId,
		kind: "meeting",
		body,
		authorUserId: input.authorUserId,
		authorName: input.authorName,
	});

	await markStewardshipContactedAt({
		orgId: input.orgId,
		constituentId: input.constituentId,
		contactedAt: new Date().toISOString(),
	});
}

export class StewardshipQueueError extends Error {
	constructor(
		message: string,
		public status: number,
	) {
		super(message);
	}
}
