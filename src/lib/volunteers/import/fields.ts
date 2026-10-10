import { guessMappedField } from "@/lib/import/mapping";

export const VOLUNTEER_SHIFT_IMPORT_FIELD_KEYS = [
	"title",
	"startDate",
	"endDate",
	"startTime",
	"endTime",
	"shiftCapacity",
	"description",
] as const;

export type VolunteerShiftImportFieldKey =
	(typeof VOLUNTEER_SHIFT_IMPORT_FIELD_KEYS)[number];

export const VOLUNTEER_SHIFT_IMPORT_FIELD_LABELS: Record<
	VolunteerShiftImportFieldKey,
	string
> = {
	title: "Title",
	startDate: "Start date",
	endDate: "End date",
	startTime: "Start time",
	endTime: "End time",
	shiftCapacity: "Capacity",
	description: "Description",
};

const ALIASES: Record<string, VolunteerShiftImportFieldKey> = {
	title: "title",
	name: "title",
	start: "startDate",
	start_date: "startDate",
	end: "endDate",
	end_date: "endDate",
	start_time: "startTime",
	end_time: "endTime",
	capacity: "shiftCapacity",
	shift_capacity: "shiftCapacity",
	description: "description",
};

export function guessVolunteerShiftImportField(
	header: string,
): VolunteerShiftImportFieldKey | "" {
	return guessMappedField(header, VOLUNTEER_SHIFT_IMPORT_FIELD_KEYS, ALIASES);
}

export const VOLUNTEER_SHIFT_IMPORT_SAMPLE_CSV = `title,start_date,end_date,start_time,end_time,shift_capacity,description
Front desk,2026-05-01,2026-05-01,09:00,12:00,8,Greeting visitors
`;
