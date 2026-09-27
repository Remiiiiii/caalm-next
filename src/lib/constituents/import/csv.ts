/** Minimal RFC-style CSV parse for import previews (no server file storage). */
export function parseCsvText(text: string): {
	headers: string[];
	rows: Record<string, string>[];
} {
	const lines = text
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n")
		.split("\n")
		.filter((line) => line.trim().length > 0);
	if (lines.length === 0) {
		return { headers: [], rows: [] };
	}
	const headers = parseCsvLine(lines[0] ?? "");
	const rows: Record<string, string>[] = [];
	for (let i = 1; i < lines.length; i += 1) {
		const cells = parseCsvLine(lines[i] ?? "");
		const row: Record<string, string> = {};
		for (let c = 0; c < headers.length; c += 1) {
			const key = headers[c] ?? `column_${c}`;
			row[key] = cells[c] ?? "";
		}
		rows.push(row);
	}
	return { headers, rows };
}

function parseCsvLine(line: string): string[] {
	const out: string[] = [];
	let current = "";
	let inQuotes = false;
	for (let i = 0; i < line.length; i += 1) {
		const ch = line[i];
		if (ch === '"') {
			if (inQuotes && line[i + 1] === '"') {
				current += '"';
				i += 1;
			} else {
				inQuotes = !inQuotes;
			}
			continue;
		}
		if (ch === "," && !inQuotes) {
			out.push(current.trim());
			current = "";
			continue;
		}
		current += ch;
	}
	out.push(current.trim());
	return out;
}
