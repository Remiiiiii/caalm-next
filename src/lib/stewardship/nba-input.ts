import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { listNotesForConstituent } from "@/lib/constituents/notes";
import type { NextBestActionInput } from "@/lib/fundraising/next-best-action";
import type { LifecycleSegment } from "@/lib/fundraising/constants";
import { mapGiftRow } from "@/lib/gifts/repository-rows";
import type { Gift } from "@/lib/gifts/types";
import {
	THANK_INTERACTION_LOOKBACK_DAYS,
	thankYouThreshold,
} from "./constants";
import { buildNextBestActionContext } from "./stewardship-context";

const INVITE_SEGMENTS: LifecycleSegment[] = ["Champion", "Loyal"];

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

function giftsTableId(): string {
	return appwriteConfig.giftsCollectionId || "69d91201001f4e8c2b01";
}

function registrationsTableId(): string {
	return appwriteConfig.eventRegistrationsCollectionId || "69f2a002001f4e8c2b34";
}

export async function loadLatestPostedGift(
	orgId: string,
	constituentId: string,
): Promise<Gift | null> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: giftsTableId(),
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("constituentId", constituentId),
			Query.equal("status", "posted"),
			Query.orderDesc("giftDate"),
			Query.limit(20),
		],
	});
	for (const row of result.rows as unknown as Record<string, unknown>[]) {
		const gift = mapGiftRow(row);
		if (!gift.voidOfId && gift.amount > 0) return gift;
	}
	return null;
}

function isThankInteraction(body: string): boolean {
	return /\bthank/i.test(body);
}

export async function hasThankInteractionWithinLookback(
	orgId: string,
	constituentId: string,
	asOf = new Date(),
): Promise<boolean> {
	const notes = await listNotesForConstituent(constituentId, orgId);
	const cutoff = asOf.getTime() - THANK_INTERACTION_LOOKBACK_DAYS * 86400000;
	return notes.some((note) => {
		const created = new Date(note.$createdAt).getTime();
		return created >= cutoff && isThankInteraction(note.body);
	});
}

async function constituentRegisteredForUpcomingCampaignEvent(
	orgId: string,
	constituentId: string,
	asOf = new Date(),
): Promise<boolean> {
	if (!appwriteConfig.calendarEventsCollectionId) return false;
	const { tablesDB } = await createAdminClient();
	const events = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: appwriteConfig.calendarEventsCollectionId,
		queries: [
			Query.equal("orgId", orgId),
			Query.greaterThan("startDate", asOf.toISOString()),
			Query.limit(50),
		],
	});
	const eventIds = (events.rows as unknown as Record<string, unknown>[])
		.filter((row) => row.campaignId)
		.map((row) => String(row.$id));
	if (eventIds.length === 0) return false;

	for (const eventId of eventIds) {
		const regs = await tablesDB.listRows({
			databaseId: dbId(),
			tableId: registrationsTableId(),
			queries: [
				Query.equal("orgId", orgId),
				Query.equal("eventId", eventId),
				Query.equal("constituentId", constituentId),
				Query.limit(1),
			],
		});
		if ((regs.total ?? regs.rows.length) > 0) return true;
	}
	return false;
}

export async function buildNextBestActionInput(input: {
	orgId: string;
	constituentId: string;
	segment: LifecycleSegment;
	lapseRiskScore: number;
	suggestedAskAmount: number | null;
	asOf?: Date;
}): Promise<NextBestActionInput> {
	const asOf = input.asOf ?? new Date();
	const nbaContext = await buildNextBestActionContext(input.orgId, asOf);
	const lastGift = await loadLatestPostedGift(input.orgId, input.constituentId);
	const hasThank = await hasThankInteractionWithinLookback(
		input.orgId,
		input.constituentId,
		asOf,
	);

	let inviteEligibleCampaignEvent = false;
	if (INVITE_SEGMENTS.includes(input.segment)) {
		const hasCampaignEvent = nbaContext.orgHasUpcomingCampaignEvent;
		if (hasCampaignEvent) {
			const registered = await constituentRegisteredForUpcomingCampaignEvent(
				input.orgId,
				input.constituentId,
				asOf,
			);
			inviteEligibleCampaignEvent = !registered;
		}
	}

	return {
		segment: input.segment,
		lapseRiskScore: input.lapseRiskScore,
		daysSinceLastGift: nbaContext.daysSinceGift(lastGift?.giftDate),
		suggestedAskAmount: input.suggestedAskAmount,
		hasOpenPledgeInstallment: nbaContext.openPledgeConstituentIds.has(
			input.constituentId,
		),
		hasUpcomingPublicEvent: nbaContext.orgHasUpcomingPublicEvent,
		daysSinceLastPostedGift: nbaContext.daysSinceGift(lastGift?.giftDate),
		lastPostedGiftAmount: lastGift?.amount ?? null,
		thankYouThreshold: thankYouThreshold(),
		hasThankInteractionWithin7Days: hasThank,
		inviteEligibleCampaignEvent,
	};
}
