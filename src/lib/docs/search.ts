import type { DocsSearchHit, DocsSectionId } from "./types";

export type DocsSearchDoc = {
	slug: string;
	title: string;
	description: string;
	section: DocsSectionId;
	text: string;
};

function tokenize(query: string): string[] {
	return query
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter((t) => t.length > 1);
}

/**
 * Client-safe ranked search over the docs corpus.
 * No external search service required.
 */
export function searchDocs(
	corpus: DocsSearchDoc[],
	query: string,
	limit = 12,
): DocsSearchHit[] {
	const tokens = tokenize(query);
	if (!tokens.length) return [];

	const hits: DocsSearchHit[] = [];

	for (const doc of corpus) {
		const hayTitle = doc.title.toLowerCase();
		const hayDesc = doc.description.toLowerCase();
		const hayText = doc.text.toLowerCase();
		let score = 0;
		let matched = 0;

		for (const token of tokens) {
			let tokenHit = false;
			if (hayTitle.includes(token)) {
				score += 12;
				tokenHit = true;
			}
			if (hayDesc.includes(token)) {
				score += 6;
				tokenHit = true;
			}
			if (hayText.includes(token)) {
				score += 2;
				tokenHit = true;
			}
			if (tokenHit) matched += 1;
		}

		if (matched === 0) continue;
		score += matched * 3;
		if (matched === tokens.length) score += 8;

		const first = tokens.find((t) => hayText.includes(t));
		let snippet = doc.description;
		if (first) {
			const idx = hayText.indexOf(first);
			const start = Math.max(0, idx - 60);
			const end = Math.min(doc.text.length, idx + 120);
			snippet = `${start > 0 ? "…" : ""}${doc.text.slice(start, end).trim()}${
				end < doc.text.length ? "…" : ""
			}`;
		}

		hits.push({
			slug: doc.slug,
			title: doc.title,
			description: doc.description,
			section: doc.section,
			snippet,
			score,
		});
	}

	return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
