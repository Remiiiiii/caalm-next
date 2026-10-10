"use client";

import { SpreadsheetImportWizard } from "@/components/import/SpreadsheetImportWizard";
import {
	CAMPAIGN_IMPORT_FIELD_KEYS,
	CAMPAIGN_IMPORT_FIELD_LABELS,
	CAMPAIGN_IMPORT_SAMPLE_CSV,
	guessCampaignImportField,
} from "@/lib/campaigns/import/fields";

export function CampaignsImportClient() {
	return (
		<SpreadsheetImportWizard
			title="Import campaigns"
			description="Duplicate campaign names in this organization are skipped."
			fieldKeys={CAMPAIGN_IMPORT_FIELD_KEYS}
			fieldLabels={CAMPAIGN_IMPORT_FIELD_LABELS}
			guessField={guessCampaignImportField}
			requiredKeys={["name"]}
			sampleCsv={CAMPAIGN_IMPORT_SAMPLE_CSV}
			sampleFilename="caalm-campaigns-import-template.csv"
			importUrl="/api/campaigns/import"
			commitLabel="Import campaigns"
		/>
	);
}
