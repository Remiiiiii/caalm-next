"use client";

import { SpreadsheetImportWizard } from "@/components/import/SpreadsheetImportWizard";
import {
	GIFT_IMPORT_FIELD_KEYS,
	GIFT_IMPORT_FIELD_LABELS,
	GIFT_IMPORT_SAMPLE_CSV,
	guessGiftImportField,
} from "@/lib/gifts/import/fields";

export function GiftsImportClient() {
	return (
		<SpreadsheetImportWizard
			title="Import gifts"
			description="Match rows to existing constituents by email or ID. Optional campaign name and fund code must already exist in this organization."
			fieldKeys={GIFT_IMPORT_FIELD_KEYS}
			fieldLabels={GIFT_IMPORT_FIELD_LABELS}
			guessField={guessGiftImportField}
			requiredKeys={["amount", "giftDate", "method"]}
			sampleCsv={GIFT_IMPORT_SAMPLE_CSV}
			sampleFilename="caalm-gifts-import-template.csv"
			importUrl="/api/gifts/import"
			commitLabel="Import gifts"
		/>
	);
}
