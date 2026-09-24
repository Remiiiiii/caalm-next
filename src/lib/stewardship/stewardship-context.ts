import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

function pledgesTableId(): string {
	return appwriteConfig.pledgesCollectionId || "69d91403001f4e8c2b06";
}

function installmentsTableId(): string {
	return appwriteConfig.pledgeInstallmentsCollectionId || "69d91404001f4e8c2b07";
}

export type NextBestActionContext = {
	orgHasUpcomingPublicEvent: boolean;
	orgHasUpcomingCampaignEvent: boolean;
	openPledgeConstituentIds: Set<string>;
	daysSinceGift: (giftDateIso?: string) => number | null;
};

export async function buildNextBestActionContext(
	orgId: string,
	asOf = new Date(),
): Promise<NextBestActionContext> {
	const { tablesDB } = await createAdminClient();
	const openPledgeConstituentIds = new Set<string>();

	const pledges = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: pledgesTableId(),
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("status", "active"),
			Query.limit(200),
		],
	});

	const pledgeIds = (pledges.rows as unknown as Record<string, unknown>[]).map(
		(row) => String(row.$id),
	);
	const pledgeConstituent = new Map<string, string>();
	for (const row of pledges.rows as unknown as Record<string, unknown>[]) {
		pledgeConstituent.set(String(row.$id), String(row.constituentId || ""));
	}

	if (pledgeIds.length > 0) {
		const installments = await tablesDB.listRows({
			databaseId: dbId(),
			tableId: installmentsTableId(),
			queries: [
				Query.equal("orgId", orgId),
				Query.equal("status", "pending"),
				Query.isNull("giftId"),
				Query.limit(200),
			],
		});
		for (const row of installments.rows as unknown as Record<string, unknown>[]) {
			const pledgeId = String(row.pledgeId || "");
			const constituentId = pledgeConstituent.get(pledgeId);
			if (constituentId) openPledgeConstituentIds.add(constituentId);
		}
	}

	let orgHasUpcomingPublicEvent = false;
	let orgHasUpcomingCampaignEvent = false;
	if (appwriteConfig.calendarEventsCollectionId) {
		const events = await tablesDB.listRows({
			databaseId: dbId(),
			tableId: appwriteConfig.calendarEventsCollectionId,
			queries: [
				Query.equal("orgId", orgId),
				Query.greaterThan("startDate", asOf.toISOString()),
				Query.limit(50),
			],
		});
		const rows = events.rows as unknown as Record<string, unknown>[];
		orgHasUpcomingPublicEvent = (events.total ?? rows.length) > 0;
		orgHasUpcomingCampaignEvent = rows.some((row) =>
			Boolean(row.campaignId),
		);
	}

	const daysSinceGift = (giftDateIso?: string) => {
		if (!giftDateIso) return null;
		const giftTime = new Date(giftDateIso).getTime();
		if (Number.isNaN(giftTime)) return null;
		return Math.floor((asOf.getTime() - giftTime) / (1000 * 60 * 60 * 24));
	};

	return {
		orgHasUpcomingPublicEvent,
		orgHasUpcomingCampaignEvent,
		openPledgeConstituentIds,
		daysSinceGift,
	};
}
