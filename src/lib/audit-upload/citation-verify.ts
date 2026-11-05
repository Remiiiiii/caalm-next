import type { AuditCitation } from "./types";

function normalize(value: string): string {
	return value
		.toLowerCase()
		.replace(/\s+/g, " ")
		.replace(/[^\w\s]/g, "")
		.trim();
}

function fuzzyIncludes(haystack: string, needle: string): boolean {
	if (!needle) return false;
	if (haystack.includes(needle)) return true;
	if (needle.length < 12) return false;
	const tokens = needle.split(" ").filter((token) => token.length > 3);
	if (tokens.length === 0) return false;
	const hits = tokens.filter((token) => haystack.includes(token)).length;
	return hits / tokens.length >= 0.7;
}

export function verifyCitations(
	sourceText: string,
	citations: Array<Pick<AuditCitation, "quote" | "page" | "section">>,
): AuditCitation[] {
	const haystack = normalize(sourceText);
	return citations.map((citation) => ({
		quote: citation.quote,
		page: citation.page ?? null,
		section: citation.section ?? null,
		matched: fuzzyIncludes(haystack, normalize(citation.quote)),
	}));
}

export function citationsPassed(citations: AuditCitation[]): boolean {
	if (citations.length === 0) return false;
	return citations.every((citation) => citation.matched);
}
