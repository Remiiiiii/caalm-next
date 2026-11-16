export function toCsv(
	headers: string[],
	rows: Array<Record<string, string | number | null | undefined>>,
): string {
	const escape = (value: string | number | null | undefined) => {
		const text = value == null ? "" : String(value);
		if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
		return text;
	};
	const lines = [headers.join(",")];
	for (const row of rows) {
		lines.push(headers.map((h) => escape(row[h])).join(","));
	}
	return `${lines.join("\n")}\n`;
}