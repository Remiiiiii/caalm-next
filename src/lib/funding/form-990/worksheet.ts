import type { StyledXlsxInput } from "@/lib/export/styled-xlsx";
import { mappingLookupKey } from "./mapping-sources";
import type {
	Form990ExpenseLine,
	Form990ExpenseMapping,
	Form990PartIxBucket,
	Form990WorksheetRow,
} from "./types";

export type Form990WorksheetResult = {
	buckets: Record<Form990PartIxBucket, number>;
	worksheetRows: Form990WorksheetRow[];
	exceptions: Form990ExpenseLine[];
	taggedLineCount: number;
};

/** Pure 990 Part IX worksheet builder — worksheet export only, not IRS e-file. */
export function buildForm990Worksheet(input: {
	lines: Form990ExpenseLine[];
	mappings: Pick<
		Form990ExpenseMapping,
		"sourceType" | "sourceKey" | "partIxBucket"
	>[];
}): Form990WorksheetResult {
	const mapByKey = new Map<string, Form990PartIxBucket>();
	for (const m of input.mappings) {
		mapByKey.set(mappingLookupKey(m.sourceType, m.sourceKey), m.partIxBucket);
	}

	const buckets: Record<Form990PartIxBucket, number> = {
		program: 0,
		management: 0,
		fundraising: 0,
	};
	const worksheetRows: Form990WorksheetRow[] = [];
	const exceptions: Form990ExpenseLine[] = [];

	for (const line of input.lines) {
		if (!Number.isFinite(line.amount) || line.amount <= 0) continue;
		const bucket = mapByKey.get(
			mappingLookupKey(line.sourceType, line.sourceKey),
		);
		if (!bucket) {
			exceptions.push(line);
			continue;
		}
		buckets[bucket] += line.amount;
		worksheetRows.push({
			partIxBucket: bucket,
			amount: line.amount,
			sourceType: line.sourceType,
			sourceKey: line.sourceKey,
			referenceId: line.referenceId,
			referenceLabel: line.referenceLabel,
			eventDate: line.eventDate,
			contractId: line.contractId,
		});
	}

	return {
		buckets,
		worksheetRows,
		exceptions,
		taggedLineCount: input.lines.filter(
			(l) => Number.isFinite(l.amount) && l.amount > 0,
		).length,
	};
}

export function worksheetToXlsxInput(
	result: Form990WorksheetResult,
): StyledXlsxInput {
	const money = (n: number) => Number(n.toFixed(2));
	return {
		sheetName: "Part IX Worksheet",
		title: "Form 990 Part IX Functional Expense Worksheet",
		subtitle: `Not an IRS e-file · Program ${money(result.buckets.program)} · Management ${money(result.buckets.management)} · Fundraising ${money(result.buckets.fundraising)}`,
		columns: [
			{ header: "Part IX bucket", width: 18 },
			{ header: "Amount", type: "currency", width: 16 },
			{ header: "Source type", width: 18 },
			{ header: "Source key", width: 24 },
			{ header: "Reference ID", width: 26 },
			{ header: "Reference", width: 40 },
			{ header: "Event date", type: "date", width: 16 },
			{ header: "Contract ID", width: 26 },
		],
		rows: result.worksheetRows.map((r) => [
			r.partIxBucket,
			money(r.amount),
			r.sourceType,
			r.sourceKey,
			r.referenceId,
			r.referenceLabel,
			r.eventDate,
			r.contractId,
		]),
	};
}

export function exceptionsToXlsxInput(
	result: Form990WorksheetResult,
): StyledXlsxInput {
	return {
		sheetName: "Exceptions",
		title: "Form 990 Unmapped Categories",
		subtitle: "These lines have no Part IX mapping and must not be hidden",
		columns: [
			{ header: "Source type", width: 18 },
			{ header: "Source key", width: 24 },
			{ header: "Amount", type: "currency", width: 16 },
			{ header: "Reference ID", width: 26 },
			{ header: "Reference", width: 40 },
			{ header: "Event date", type: "date", width: 16 },
			{ header: "Contract ID", width: 26 },
		],
		rows: result.exceptions.map((r) => [
			r.sourceType,
			r.sourceKey,
			Number(r.amount.toFixed(2)),
			r.referenceId,
			r.referenceLabel,
			r.eventDate,
			r.contractId,
		]),
	};
}

export function parseIsoDateRange(
	start: string,
	end: string,
): {
	startMs: number;
	endMs: number;
} | null {
	const startMs = Date.parse(start);
	const endMs = Date.parse(end);
	if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
	if (endMs < startMs) return null;
	return { startMs, endMs: endMs + 86_400_000 - 1 };
}

export function dateInRange(
	iso: string | undefined,
	range: { startMs: number; endMs: number },
): boolean {
	if (!iso) return false;
	const ms = Date.parse(iso);
	if (!Number.isFinite(ms)) return false;
	return ms >= range.startMs && ms <= range.endMs;
}
