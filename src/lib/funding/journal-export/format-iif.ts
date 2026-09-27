import type { JournalExportResult } from "./types";

/** Minimal IIF (Intuit Interchange Format) journal rows for manual QuickBooks import. */
export function journalExportToIif(result: JournalExportResult): string {
	const lines: string[] = [
		"!TRNS\tTRNSID\tTRNSTYPE\tDATE\tACCNT\tAMOUNT\tMEMO",
		"!SPL\tSPLID\tTRNSID\tTRNSTYPE\tDATE\tACCNT\tAMOUNT\tMEMO",
		"!ENDTRNS",
	];

	let trnsCounter = 0;
	for (const row of result.rows) {
		trnsCounter += 1;
		const trnsId = `${row.rowKind}-${row.sourceId}-${trnsCounter}`;
		const account = `${row.fundCode}:${row.restrictionClass}`;
		const memo = row.memo.replace(/\t/g, " ");
		lines.push(
			[
				"TRNS",
				trnsId,
				"GENERAL JOURNAL",
				row.transactionDate,
				account,
				row.amount.toFixed(2),
				memo,
			].join("\t"),
		);
		lines.push(
			[
				"SPL",
				`${trnsId}-spl`,
				trnsId,
				"GENERAL JOURNAL",
				row.transactionDate,
				account,
				row.amount.toFixed(2),
				memo,
			].join("\t"),
		);
		lines.push("ENDTRNS");
	}

	return `${lines.join("\n")}\n`;
}
