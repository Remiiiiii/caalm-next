import type { RiskImpactEvent } from "@/lib/dashboard/risk-impact.types";
import { KIND_LABELS } from "@/lib/dashboard/risk-impact-events";
import { buildStyledXlsx } from "@/lib/export/styled-xlsx";

export { XLSX_MIME } from "@/lib/export/styled-xlsx";

/** Risk averted event register as a styled Excel workbook. */
export function riskAvertedRegisterXlsx(input: {
	events: RiskImpactEvent[];
	periodLabel: string;
	generatedAt: Date;
}): Uint8Array<ArrayBuffer> {
	const { events, periodLabel, generatedAt } = input;
	const n = events.length;
	const last = 4 + n;
	const counted = events.filter((e) => e.countedTowardTotal);
	const sum = counted.reduce((acc, e) => acc + (e.dollars || 0), 0);
	const countText = `${counted.length} of ${n} events`;
	return buildStyledXlsx({
		sheetName: "Risk Averted",
		title: `Risk Averted Register — ${periodLabel}`,
		subtitle: `CAALM · Events counted once; duplicates shown for reference and excluded from totals · Generated ${generatedAt.toISOString().slice(0, 10)}`,
		columns: [
			{ header: "Date", type: "date", width: 14 },
			{ header: "Kind", width: 12 },
			{ header: "Record", width: 62 },
			{ header: "Source", width: 20 },
			{ header: "Dollars", type: "currency", width: 16 },
			{ header: "Status", type: "status", width: 26 },
		],
		rows: events.map((e) => [
			e.date,
			KIND_LABELS[e.kind],
			e.recordName,
			e.source,
			e.countedTowardTotal ? e.dollars || 0 : 0,
			e.countedTowardTotal ? "Counted" : "Duplicate · not counted",
		]),
		isPositiveStatus: (v) => v === "Counted",
		totalLabel: "Total counted",
		// No data rows means no valid range to sum, so fall back to plain values.
		totals:
			n > 0
				? [
						null,
						null,
						null,
						null,
						{ f: `SUMIF(F5:F${last},"Counted",E5:E${last})`, v: sum },
						{
							f: `COUNTIF(F5:F${last},"Counted")&" of "&COUNTA(F5:F${last})&" events"`,
							v: countText,
						},
					]
				: [null, null, null, null, 0, countText],
	});
}
