/** Map raw enum-ish values (e.g. "government_contract") to "Government Contract". */
export function formatExpiryTypeLabel(raw?: string | null): string {
	if (!raw) return "—";
	return raw
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.replace(/\b\w/g, (c) => c.toUpperCase());
}
