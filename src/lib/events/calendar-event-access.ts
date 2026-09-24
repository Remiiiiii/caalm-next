import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

export type CalendarEventOrgRow = {
	$id: string;
	orgId: string;
	title: string;
	campaignId?: string;
};

export async function getCalendarEventInOrg(
	orgId: string,
	eventId: string,
): Promise<CalendarEventOrgRow | null> {
	if (!appwriteConfig.databaseId || !appwriteConfig.calendarEventsCollectionId) {
		return null;
	}
	const { tablesDB } = await createAdminClient();
	try {
		const row = (await tablesDB.getRow({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.calendarEventsCollectionId,
			rowId: eventId,
		})) as Record<string, unknown>;
		if (String(row.orgId || "") !== orgId) return null;
		return {
			$id: String(row.$id),
			orgId: String(row.orgId),
			title: String(row.title || ""),
			campaignId: row.campaignId ? String(row.campaignId) : undefined,
		};
	} catch {
		return null;
	}
}
