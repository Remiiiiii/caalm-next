import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

export type VolunteerShiftEvent = {
	$id: string;
	title: string;
	startDate: string;
	endDate?: string;
	startTime?: string;
	endTime?: string;
	description?: string;
	shiftCapacity: number;
	shiftTemplateId?: string;
	orgId?: string;
};

function calendarTableId(): string {
	return appwriteConfig.calendarEventsCollectionId || "test-calendar-events";
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

function mapVolunteerShift(row: Record<string, unknown>): VolunteerShiftEvent {
	return {
		$id: String(row.$id),
		title: String(row.title || ""),
		startDate: String(row.startDate || ""),
		endDate: row.endDate ? String(row.endDate) : undefined,
		startTime: row.startTime ? String(row.startTime) : undefined,
		endTime: row.endTime ? String(row.endTime) : undefined,
		description: row.description ? String(row.description) : undefined,
		shiftCapacity: Number(row.shiftCapacity ?? 0),
		shiftTemplateId: row.shiftTemplateId
			? String(row.shiftTemplateId)
			: undefined,
		orgId: row.orgId ? String(row.orgId) : undefined,
	};
}

export async function listVolunteerShiftsForOrg(
	orgId: string,
): Promise<VolunteerShiftEvent[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: calendarTableId(),
		queries: [
			Query.equal("orgId", orgId),
			Query.equal("type", "volunteer_shift"),
			Query.isNull("deleted_at"),
			Query.orderAsc("startDate"),
			Query.limit(200),
		],
	});
	return (result.rows as unknown as Record<string, unknown>[]).map(
		mapVolunteerShift,
	);
}

export async function getVolunteerShiftById(
	orgId: string,
	eventId: string,
): Promise<VolunteerShiftEvent | null> {
	const { tablesDB } = await createAdminClient();
	try {
		const row = await tablesDB.getRow({
			databaseId: dbId(),
			tableId: calendarTableId(),
			rowId: eventId,
		});
		const data = row as unknown as Record<string, unknown>;
		if (String(data.type || "") !== "volunteer_shift") return null;
		if (data.orgId && String(data.orgId) !== orgId) return null;
		return mapVolunteerShift(data);
	} catch {
		return null;
	}
}
