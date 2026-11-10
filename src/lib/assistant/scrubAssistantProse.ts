/**
 * Strip AI em/en dash punctuation from user-facing assistant prose.
 * Keeps normal hyphenated words (well-known) and label hyphens (co-founder).
 */

export function scrubAssistantProse(text: string): string {
	if (!text) return text;
	return text
		.replace(/\s*[—]\s*([A-Za-z])/g, (_m, letter: string) => `. ${letter.toUpperCase()}`)
		.replace(/\s*[—]\s*/g, ". ")
		.replace(/\s+[–]\s+/g, ", ")
		.replace(/\.{2,}/g, ".")
		.replace(/([.!?])\s*\./g, "$1")
		.replace(/[ \t]{2,}/g, " ");
}
