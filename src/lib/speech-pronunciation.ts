/**
 * Expand common abbreviations so TTS reads them as full words.
 */
export function normalizeSpeechPronunciation(text: string): string {
	return text
		.replace(/\bInc\./gi, "incorporated")
		.replace(/\bInc\b/gi, "incorporated")
		.replace(/\bDept\./gi, "department")
		.replace(/\bDept\b/gi, "department");
}
