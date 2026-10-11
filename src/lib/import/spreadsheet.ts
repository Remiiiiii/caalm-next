import { parseCsvText } from "@/lib/constituents/import/csv";
import { IMPORT_MAX_ROWS } from "./http";

export { parseCsvText };

export type SpreadsheetParseResult = {
	headers: string[];
	rows: Record<string, string>[];
};

function capRows(parsed: SpreadsheetParseResult): SpreadsheetParseResult {
	if (parsed.headers.length === 0) {
		throw new Error("The spreadsheet is empty.");
	}
	if (parsed.rows.length > IMPORT_MAX_ROWS) {
		throw new Error(
			`This file has ${parsed.rows.length} data rows. Import is limited to ${IMPORT_MAX_ROWS} rows per batch.`,
		);
	}
	return parsed;
}

function cellsToSpreadsheet(matrix: unknown[][]): SpreadsheetParseResult {
	if (!matrix.length) {
		return { headers: [], rows: [] };
	}
	const headerRow = matrix[0] ?? [];
	const headers = headerRow.map((cell, index) => {
		const label = cell == null ? "" : String(cell).trim();
		return label || `column_${index}`;
	});
	const rows: Record<string, string>[] = [];
	for (let i = 1; i < matrix.length; i += 1) {
		const line = matrix[i] ?? [];
		const isEmpty = line.every(
			(cell) => cell == null || String(cell).trim() === "",
		);
		if (isEmpty) continue;
		const row: Record<string, string> = {};
		for (let c = 0; c < headers.length; c += 1) {
			const key = headers[c] ?? `column_${c}`;
			const cell = line[c];
			row[key] = cell == null ? "" : String(cell).trim();
		}
		rows.push(row);
	}
	return { headers, rows };
}

export async function parseXlsxArrayBuffer(
	buffer: ArrayBuffer,
): Promise<SpreadsheetParseResult> {
	const XLSX = await import("xlsx");
	const workbook = XLSX.read(buffer, { type: "array" });
	const sheetName = workbook.SheetNames[0];
	if (!sheetName) {
		throw new Error("The Excel workbook has no sheets.");
	}
	const sheet = workbook.Sheets[sheetName];
	if (!sheet) {
		throw new Error("The first Excel sheet is empty.");
	}
	const matrix = XLSX.utils.sheet_to_json(sheet, {
		header: 1,
		defval: "",
		raw: false,
	}) as unknown[][];
	return capRows(cellsToSpreadsheet(matrix));
}

export async function parseSpreadsheetFile(
	file: File,
): Promise<SpreadsheetParseResult> {
	const name = file.name.toLowerCase();
	const isCsv =
		name.endsWith(".csv") ||
		name.endsWith(".txt") ||
		file.type.includes("csv");
	if (isCsv) {
		const text = await file.text();
		return capRows(parseCsvText(text));
	}
	if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
		const buffer = await file.arrayBuffer();
		return parseXlsxArrayBuffer(buffer);
	}
	throw new Error("Use a CSV or Excel (.xlsx) file.");
}
