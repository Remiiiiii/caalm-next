import type { JournalExportResult } from "./types";

function escapeCsv(value: string): string {
	if (/[",\n\r]/.test(value)) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

export function journalExportToCsv(result: JournalExportResult): string {
	const header = [
		"row_kind",
		"transaction_date",
		"fund_code",
		"amount",
		"restriction_class",
		"source_id",
		"reclass_leg",
		"memo",
	].join(",");
	const lines = result.rows.map((row) =>
		[
			row.rowKind,
			row.transactionDate,
			row.fundCode,
			row.amount.toFixed(2),
			row.restrictionClass,
			row.sourceId,
			row.reclassLeg ?? "",
			row.memo,
		]
			.map((cell) => escapeCsv(String(cell)))
			.join(","),
	);
	return [header, ...lines].join("\n");
}
