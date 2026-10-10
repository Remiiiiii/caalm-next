import { pickMappedValue } from "@/lib/import/mapping";
import type { VolunteerShiftImportFieldKey } from "./fields";

export type MappedVolunteerShiftImportRow = {
	rowNumber: number;
	title: string;
	startDate: string;
	endDate?: string;
	startTime?: string;
	endTime?: string;
	shiftCapacity: number;
	description?: string;
};

export type VolunteerShiftImportRowError = {
	rowNumber: number;
	message: string;
};

export function applyVolunteerShiftColumnMapping(
	rows: Record<string, string>[],
	mapping: Record<string, VolunteerShiftImportFieldKey | "">,
): {
	valid: MappedVolunteerShiftImportRow[];
	errors: VolunteerShiftImportRowError[];
} {
	const valid: MappedVolunteerShiftImportRow[] = [];
	const errors: VolunteerShiftImportRowError[] = [];
	rows.forEach((row, index) => {
		const rowNumber = index + 2;
		const pick = (field: VolunteerShiftImportFieldKey) =>
			pickMappedValue(row, mapping, field);
		const title = pick("title");
		const startDate = pick("startDate");
		const capacityRaw = pick("shiftCapacity") || "1";
		const shiftCapacity = Number(capacityRaw);
		if (!title || !startDate) {
			errors.push({
				rowNumber,
				message: "Each row needs a title and a start date.",
			});
			return;
		}
		if (!Number.isFinite(shiftCapacity) || shiftCapacity < 1) {
			errors.push({
				rowNumber,
				message: "Shift capacity must be at least 1.",
			});
			return;
		}
		valid.push({
			rowNumber,
			title,
			startDate,
			endDate: pick("endDate") || undefined,
			startTime: pick("startTime") || undefined,
			endTime: pick("endTime") || undefined,
			shiftCapacity,
			description: pick("description") || undefined,
		});
	});
	return { valid, errors };
}
