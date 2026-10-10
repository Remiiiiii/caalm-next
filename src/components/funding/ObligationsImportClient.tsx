"use client";

import { SpreadsheetImportWizard } from "@/components/import/SpreadsheetImportWizard";
import {
	guessObligationImportField,
	OBLIGATION_IMPORT_FIELD_KEYS,
	OBLIGATION_IMPORT_FIELD_LABELS,
	OBLIGATION_IMPORT_SAMPLE_CSV,
} from "@/lib/funding/import/fields";

export function ObligationsImportClient() {
	return (
		<SpreadsheetImportWizard
			title="Import obligations"
			description="Each row must match an existing contract in this organization by number or ID."
			fieldKeys={OBLIGATION_IMPORT_FIELD_KEYS}
			fieldLabels={OBLIGATION_IMPORT_FIELD_LABELS}
			guessField={guessObligationImportField}
			requiredKeys={["title"]}
			sampleCsv={OBLIGATION_IMPORT_SAMPLE_CSV}
			sampleFilename="caalm-obligations-import-template.csv"
			importUrl="/api/funding/obligations/import"
			commitLabel="Import obligations"
		/>
	);
}
