"use client";

import { SpreadsheetImportWizard } from "@/components/import/SpreadsheetImportWizard";
import {
	guessUserImportField,
	USER_IMPORT_FIELD_KEYS,
	USER_IMPORT_FIELD_LABELS,
	USER_IMPORT_SAMPLE_CSV,
} from "@/lib/users/import/fields";

export function UsersImportClient() {
	return (
		<SpreadsheetImportWizard
			title="Import user invites"
			description="Existing members and pending invites are skipped. Import stops if the organization hits its billing seat limit."
			fieldKeys={USER_IMPORT_FIELD_KEYS}
			fieldLabels={USER_IMPORT_FIELD_LABELS}
			guessField={guessUserImportField}
			requiredKeys={["name", "email", "role"]}
			sampleCsv={USER_IMPORT_SAMPLE_CSV}
			sampleFilename="caalm-users-import-template.csv"
			importUrl="/api/users/import"
			commitLabel="Send invites"
		/>
	);
}
