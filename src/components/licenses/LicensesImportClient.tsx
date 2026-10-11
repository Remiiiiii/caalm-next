"use client";

import { SpreadsheetImportWizard } from "@/components/import/SpreadsheetImportWizard";
import {
	guessLicenseImportField,
	LICENSE_IMPORT_FIELD_KEYS,
	LICENSE_IMPORT_FIELD_LABELS,
	LICENSE_IMPORT_SAMPLE_CSV,
} from "@/lib/licenses/import/fields";

export function LicensesImportClient() {
	return (
		<SpreadsheetImportWizard
			title="Import licenses"
			description="Department and division are required on every row. Duplicate license numbers in this org are skipped."
			fieldKeys={LICENSE_IMPORT_FIELD_KEYS}
			fieldLabels={LICENSE_IMPORT_FIELD_LABELS}
			guessField={guessLicenseImportField}
			requiredKeys={["licenseName", "department", "division"]}
			sampleCsv={LICENSE_IMPORT_SAMPLE_CSV}
			sampleFilename="caalm-licenses-import-template.csv"
			importUrl="/api/licenses/import"
			commitLabel="Import licenses"
		/>
	);
}
