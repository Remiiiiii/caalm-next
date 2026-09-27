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
		mapByKey.set(
			mappingLookupKey(m.sourceType, m.sourceKey),
			m.partIxBucket,
		);
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

function csvEscape(value: string): string {
	if (/[",\n]/.test(value)) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

export function worksheetToCsv(result: Form990WorksheetResult): string {
	const header =
		"part_ix_bucket,amount,source_type,source_key,reference_id,reference_label,event_date,contract_id";
	const rows = result.worksheetRows.map((r) =>
		[
			r.partIxBucket,
			r.amount.toFixed(2),
			r.sourceType,
			r.sourceKey,
			r.referenceId,
			csvEscape(r.referenceLabel),
			r.eventDate,
			r.contractId ?? "",
		].join(","),
	);
	const summary = [
		"# Form 990 Part IX functional expense worksheet (not an IRS e-file)",
		`# program,${result.buckets.program.toFixed(2)}`,
		`# management,${result.buckets.management.toFixed(2)}`,
		`# fundraising,${result.buckets.fundraising.toFixed(2)}`,
		header,
		...rows,
	];
	return `${summary.join("\n")}\n`;
}

export function exceptionsToCsv(result: Form990WorksheetResult): string {
	const header =
		"source_type,source_key,amount,reference_id,reference_label,event_date,contract_id";
	const rows = result.exceptions.map((r) =>
		[
			r.sourceType,
			r.sourceKey,
			r.amount.toFixed(2),
			r.referenceId,
			csvEscape(r.referenceLabel),
			r.eventDate,
			r.contractId ?? "",
		].join(","),
	);
	return `${["# Unmapped categories (must not be hidden)", header, ...rows].join("\n")}\n`;
}

export function parseIsoDateRange(start: string, end: string): {
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
