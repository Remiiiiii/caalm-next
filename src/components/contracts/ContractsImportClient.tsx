"use client";

import { SpreadsheetImportWizard } from "@/components/import/SpreadsheetImportWizard";
import {
	CONTRACT_IMPORT_FIELD_KEYS,
	CONTRACT_IMPORT_FIELD_LABELS,
	CONTRACT_IMPORT_SAMPLE_CSV,
	guessContractImportField,
} from "@/lib/contracts/import/fields";

export function ContractsImportClient() {
	return (
		<SpreadsheetImportWizard
			title="Import contract metadata"
			description="Rows update existing contracts matched by number (or name). This does not upload PDFs or create new contracts."
			fieldKeys={CONTRACT_IMPORT_FIELD_KEYS}
			fieldLabels={CONTRACT_IMPORT_FIELD_LABELS}
			guessField={guessContractImportField}
			sampleCsv={CONTRACT_IMPORT_SAMPLE_CSV}
			sampleFilename="caalm-contracts-import-template.csv"
			importUrl="/api/contracts/import"
			commitLabel="Update contracts"
			banner={
				<div className="rounded-lg border border-orange/20 bg-orange/10 px-4 py-3 text-sm text-slate-700">
					Metadata only. CAALM will not create a contract without an uploaded
					file. Unmatched numbers are reported as errors.
				</div>
			}
		/>
	);
}
