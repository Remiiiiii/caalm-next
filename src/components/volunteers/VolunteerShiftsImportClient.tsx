"use client";

import { SpreadsheetImportWizard } from "@/components/import/SpreadsheetImportWizard";
import {
	guessVolunteerShiftImportField,
	VOLUNTEER_SHIFT_IMPORT_FIELD_KEYS,
	VOLUNTEER_SHIFT_IMPORT_FIELD_LABELS,
	VOLUNTEER_SHIFT_IMPORT_SAMPLE_CSV,
} from "@/lib/volunteers/import/fields";

export function VolunteerShiftsImportClient() {
	return (
		<SpreadsheetImportWizard
			title="Import volunteer shifts"
			description="Each row becomes a calendar event with type volunteer_shift."
			fieldKeys={VOLUNTEER_SHIFT_IMPORT_FIELD_KEYS}
			fieldLabels={VOLUNTEER_SHIFT_IMPORT_FIELD_LABELS}
			guessField={guessVolunteerShiftImportField}
			requiredKeys={["title", "startDate"]}
			sampleCsv={VOLUNTEER_SHIFT_IMPORT_SAMPLE_CSV}
			sampleFilename="caalm-volunteer-shifts-import-template.csv"
			importUrl="/api/volunteers/shifts/import"
			commitLabel="Import shifts"
		/>
	);
}
