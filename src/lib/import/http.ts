export const IMPORT_MAX_ROWS = 500;

export type SpreadsheetRows = Record<string, string>[];

export function readImportPayload<K extends string>(
	body: unknown,
): {
	ok: true;
	rows: SpreadsheetRows;
	mapping: Record<string, K | "">;
} | { ok: false; error: string; status: number } {
	if (!body || typeof body !== "object") {
		return { ok: false, error: "JSON body is required", status: 400 };
	}
	const rec = body as {
		rows?: unknown;
		mapping?: unknown;
	};
	const rows = Array.isArray(rec.rows) ? rec.rows : [];
	if (!rows.every((row) => row && typeof row === "object" && !Array.isArray(row))) {
		return { ok: false, error: "rows must be an array of objects", status: 400 };
	}
	const mapping =
		rec.mapping && typeof rec.mapping === "object" && !Array.isArray(rec.mapping)
			? (rec.mapping as Record<string, K | "">)
			: {};
	const stringRows = rows.map((row) => {
		const out: Record<string, string> = {};
		for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
			out[key] = value == null ? "" : String(value);
		}
		return out;
	});
	if (stringRows.length === 0) {
		return { ok: false, error: "No spreadsheet rows provided", status: 400 };
	}
	if (stringRows.length > IMPORT_MAX_ROWS) {
		return {
			ok: false,
			error: `Import limited to ${IMPORT_MAX_ROWS} rows per batch`,
			status: 400,
		};
	}
	return { ok: true, rows: stringRows, mapping };
}

export function parseBoolCell(raw: string): boolean {
	const value = raw.trim().toLowerCase();
	return value === "1" || value === "true" || value === "yes" || value === "y";
}
