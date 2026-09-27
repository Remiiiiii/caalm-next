import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { listSegmentsForOrg } from "@/lib/fundraising/segments-repository";
import { listStewardshipQueue } from "./stewardship-queue";

export type StewardshipMetrics = {
	contactedThisWeek: number;
	stillAtRisk: number;
	receiptsSent: number;
};

function startOfWeekUtc(iso: string): string {
	const d = new Date(iso);
	const day = d.getUTCDay();
	const diff = day === 0 ? 6 : day - 1;
	d.setUTCDate(d.getUTCDate() - diff);
	d.setUTCHours(0, 0, 0, 0);
	return d.toISOString();
}

function giftsTableId(): string {
	return appwriteConfig.giftsCollectionId || "69d91201001f4e8c2b01";
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

/** Live org-scoped counts for the stewardship queue header (no mock data). */
export async function computeStewardshipMetrics(
	orgId: string,
	asOf = new Date(),
): Promise<StewardshipMetrics> {
	const weekStart = startOfWeekUtc(asOf.toISOString());
	const segments = await listSegmentsForOrg(orgId);
	const contactedThisWeek = segments.filter(
		(row) =>
			row.stewardshipContactedAt &&
			row.stewardshipContactedAt >= weekStart,
	).length;

	const queue = await listStewardshipQueue(orgId);

	const { tablesDB } = await createAdminClient();
	const gifts = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: giftsTableId(),
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("status", "posted"),
			Query.isNotNull("receiptSentAt"),
			Query.limit(500),
		],
	});

	return {
		contactedThisWeek,
		stillAtRisk: queue.length,
		receiptsSent: gifts.total ?? gifts.rows.length,
	};
}
