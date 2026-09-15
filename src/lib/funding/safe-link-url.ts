/**
 * Obligation link URLs must be normal http(s) only — blocks javascript:, data:, etc.
 */
export function parseAllowedHttpUrl(
	raw: string | undefined | null,
): string | undefined {
	if (raw == null) return undefined;
	const trimmed = String(raw).trim();
	if (!trimmed) return undefined;
	try {
		const url = new URL(trimmed);
		if (url.protocol !== "http:" && url.protocol !== "https:") {
			return undefined;
		}
		return url.toString();
	} catch {
		return undefined;
	}
}
