import type { KnowledgeChunk } from "@/lib/assistant/knowledge/chunks";
import { ALL_KNOWLEDGE_CHUNKS } from "@/lib/assistant/knowledge/chunks";

export type RetrievedSource = {
	id: string;
	title: string;
	excerpt: string;
	href?: string;
};

function scoreChunk(chunk: KnowledgeChunk, terms: string[]): number {
	const haystack =
		`${chunk.title} ${chunk.body} ${chunk.keywords.join(" ")}`.toLowerCase();
	let score = 0;
	for (const term of terms) {
		if (term.length < 2) continue;
		if (haystack.includes(term)) score += 1;
		if (chunk.keywords.some((k) => k.includes(term))) score += 2;
	}
	return score;
}

export function retrieveKnowledge(
	query: string,
	pathname?: string,
	limit = 4,
): { contextText: string; sources: RetrievedSource[] } {
	const terms = query
		.toLowerCase()
		.split(/\W+/)
		.filter(Boolean)
		.slice(0, 24);

	if (pathname) {
		const pathTerms = pathname.split("/").filter(Boolean);
		terms.push(...pathTerms);
	}

	const ranked = ALL_KNOWLEDGE_CHUNKS.map((chunk) => ({
		chunk,
		score: scoreChunk(chunk, terms),
	}))
		.filter((r) => r.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, limit);

	const picked =
		ranked.length > 0
			? ranked
			: ALL_KNOWLEDGE_CHUNKS.slice(0, 2).map((chunk) => ({ chunk, score: 0 }));

	const sources: RetrievedSource[] = picked.map(({ chunk }) => ({
		id: chunk.id,
		title: chunk.title,
		excerpt: chunk.body.slice(0, 220),
		href: chunk.href,
	}));

	const contextText = sources
		.map(
			(s, i) =>
				`[${i + 1}] ${s.title}: ${s.excerpt}${s.href ? ` (Link: ${s.href})` : ""}`,
		)
		.join("\n");

	return { contextText, sources };
}
