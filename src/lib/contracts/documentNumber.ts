import { isTemplateTokenValue } from "@/lib/ai/scrubTemplateTokens";

const SUFFIX_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function yyyymmdd(date = new Date()): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}${month}${day}`;
}

function randomSuffix(length = 4): string {
	const bytes =
		typeof crypto !== "undefined" && crypto.getRandomValues
			? crypto.getRandomValues(new Uint8Array(length))
			: Uint8Array.from({ length }, () => Math.floor(Math.random() * 256));
	return Array.from(
		bytes,
		(byte) => SUFFIX_ALPHABET[byte % SUFFIX_ALPHABET.length],
	).join("");
}

/** Standard CAALM document number: CTR-20260910-A3K7 or LIC-20260910-A3K7 */
export function generateDocumentNumber(prefix: "CTR" | "LIC"): string {
	return `${prefix}-${yyyymmdd()}-${randomSuffix()}`;
}

export function needsDocumentNumber(value?: string | null): boolean {
	if (!value || !value.trim()) return true;
	return isTemplateTokenValue(value);
}
