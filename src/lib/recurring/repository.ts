import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { canContact } from "@/lib/constituents/consent";
import { getConstituentById } from "@/lib/constituents/repository";
import { createDraftGift } from "@/lib/gifts/repository";
import type { GiftMethod } from "@/lib/gifts/types";
import { isGiftMethod } from "@/lib/gifts/types";
import type { RecurringFrequency, RecurringGiftSchedule } from "./types";
import { RECURRING_FREQUENCIES } from "./types";

function tableId(): string {
	return (
		appwriteConfig.recurringGiftSchedulesCollectionId || "69d91402001f4e8c2b05"
	);
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

function isFrequency(value: unknown): value is RecurringFrequency {
	return (
		typeof value === "string" &&
		(RECURRING_FREQUENCIES as readonly string[]).includes(value)
	);
}

function mapRow(row: Record<string, unknown>): RecurringGiftSchedule {
	const method = isGiftMethod(row.method) ? row.method : "ach";
	const frequency = isFrequency(row.frequency) ? row.frequency : "monthly";
	return {
		$id: String(row.$id),
		orgId: String(row.orgId || ""),
		constituentId: String(row.constituentId || ""),
		amount: Number(row.amount),
		currency: String(row.currency || "USD"),
		method,
		frequency,
		nextDueDate: String(row.nextDueDate || ""),
		active: row.active !== false,
		campaignId: row.campaignId ? String(row.campaignId) : undefined,
		designationId: row.designationId ? String(row.designationId) : undefined,
		lastSkipReason: row.lastSkipReason
			? String(row.lastSkipReason)
			: undefined,
	};
}

function advanceDueDate(iso: string, frequency: RecurringFrequency): string {
	const d = new Date(iso);
	if (frequency === "annual") {
		d.setUTCFullYear(d.getUTCFullYear() + 1);
	} else {
		d.setUTCMonth(d.getUTCMonth() + 1);
	}
	return d.toISOString();
}

export async function createRecurringSchedule(input: {
	orgId: string;
	constituentId: string;
	amount: number;
	currency?: string;
	method: GiftMethod;
	frequency: RecurringFrequency;
	nextDueDate: string;
	campaignId?: string;
	designationId?: string;
}): Promise<RecurringGiftSchedule> {
	const constituent = await getConstituentById(input.constituentId);
	if (!constituent || constituent.orgId !== input.orgId) {
		throw new Error("Constituent not found");
	}
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: ID.unique(),
		data: {
			orgId: input.orgId,
			constituentId: input.constituentId,
			amount: input.amount,
			currency: (input.currency || "USD").toUpperCase(),
			method: input.method,
			frequency: input.frequency,
			nextDueDate: input.nextDueDate,
			active: true,
			campaignId: input.campaignId || null,
			designationId: input.designationId || null,
			lastSkipReason: null,
		},
	});
	return mapRow(row as unknown as Record<string, unknown>);
}

export async function listDueRecurringSchedules(
	asOfIso: string,
): Promise<RecurringGiftSchedule[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries: [
			Query.equal("active", true),
			Query.lessThanEqual("nextDueDate", asOfIso),
			Query.limit(200),
		],
	});
	return (result.rows as unknown as Record<string, unknown>[]).map(mapRow);
}

export type RecurringProcessResult = {
	schedulesProcessed: number;
	draftsCreated: number;
	skippedDnc: number;
};

/** Spawn draft gifts for due recurring schedules (2.7). */
export async function processDueRecurringSchedules(
	asOf = new Date(),
): Promise<RecurringProcessResult> {
	const asOfIso = asOf.toISOString();
	const due = await listDueRecurringSchedules(asOfIso);
	const { tablesDB } = await createAdminClient();
	let draftsCreated = 0;
	let skippedDnc = 0;

	for (const schedule of due) {
		const constituent = await getConstituentById(schedule.constituentId);
		if (!constituent || !canContact(constituent, "email")) {
			skippedDnc += 1;
			await tablesDB.updateRow({
				databaseId: dbId(),
				tableId: tableId(),
				rowId: schedule.$id,
				data: {
					lastSkipReason: "do_not_contact",
					nextDueDate: advanceDueDate(schedule.nextDueDate, schedule.frequency),
				},
			});
			continue;
		}

		await createDraftGift({
			orgId: schedule.orgId,
			amount: schedule.amount,
			currency: schedule.currency,
			giftDate: schedule.nextDueDate,
			method: schedule.method,
			constituentId: schedule.constituentId,
			campaignId: schedule.campaignId,
			designationId: schedule.designationId,
		});
		draftsCreated += 1;
		await tablesDB.updateRow({
			databaseId: dbId(),
			tableId: tableId(),
			rowId: schedule.$id,
			data: {
				nextDueDate: advanceDueDate(schedule.nextDueDate, schedule.frequency),
				lastSkipReason: null,
			},
		});
	}

	return {
		schedulesProcessed: due.length,
		draftsCreated,
		skippedDnc,
	};
}
