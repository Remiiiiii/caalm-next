/** Guess a CAALM field from a spreadsheet header using aliases and key names. */
export function guessMappedField<K extends string>(
	header: string,
	keys: readonly K[],
	aliases: Record<string, K>,
): K | "" {
	const normalized = header.trim().toLowerCase().replace(/\s+/g, " ");
	if (aliases[normalized]) return aliases[normalized];
	const underscored = normalized.replace(/ /g, "_");
	if (aliases[underscored]) return aliases[underscored];
	const compact = normalized.replace(/[\s_-]/g, "");
	if (aliases[compact]) return aliases[compact];
	const direct = keys.find((key) => key.toLowerCase() === compact);
	return direct ?? "";
}

export function pickMappedValue<K extends string>(
	row: Record<string, string>,
	mapping: Record<string, K | "">,
	field: K,
): string {
	for (const [header, target] of Object.entries(mapping)) {
		if (target === field) return (row[header] ?? "").trim();
	}
	return "";
}

export function listUnmappedHeaders<K extends string>(
	headers: string[],
	mapping: Record<string, K | "">,
): string[] {
	return headers.filter((header) => !mapping[header]);
}
