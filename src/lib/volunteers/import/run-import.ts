import { createCalendarEvent } from "@/lib/actions/calendar.actions";
import type { MappedVolunteerShiftImportRow } from "./parse";

export type VolunteerShiftImportPlanRow = {
	rowNumber: number;
	action: "create";
	title: string;
	startDate: string;
	endDate?: string;
	startTime?: string;
	endTime?: string;
	shiftCapacity: number;
	description?: string;
};

export function dryRunVolunteerShiftImport(
	rows: MappedVolunteerShiftImportRow[],
): {
	rows: VolunteerShiftImportPlanRow[];
	counts: { create: number };
} {
	return {
		rows: rows.map((row) => ({
			rowNumber: row.rowNumber,
			action: "create" as const,
			title: row.title,
			startDate: row.startDate,
			endDate: row.endDate,
			startTime: row.startTime,
			endTime: row.endTime,
			shiftCapacity: row.shiftCapacity,
			description: row.description,
		})),
		counts: { create: rows.length },
	};
}

export async function commitVolunteerShiftImport(
	createdByUserId: string,
	createdByAccountId: string,
	rows: MappedVolunteerShiftImportRow[],
): Promise<{ createdCount: number; skippedCount: number; failedCount: number }> {
	let createdCount = 0;
	let failedCount = 0;
	for (const row of rows) {
		try {
			await createCalendarEvent({
				title: row.title,
				startDate: row.startDate,
				endDate: row.endDate,
				startTime: row.startTime,
				endTime: row.endTime,
				description: row.description,
				type: "volunteer_shift",
				createdBy: createdByAccountId,
				createdByUserId,
				createdByAccountId,
				shiftCapacity: row.shiftCapacity,
			});
			createdCount += 1;
		} catch (error) {
			failedCount += 1;
			console.error("[volunteer shifts import commit]", error);
		}
	}
	return { createdCount, skippedCount: 0, failedCount };
}
