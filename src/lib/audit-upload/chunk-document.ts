export interface DocumentChunk {
	index: number;
	text: string;
	page: number | null;
	section: string | null;
}

const TARGET_CHARS = 3500;

function detectSection(text: string): string | null {
	const heading = text.match(/^\s*(#{1,3}\s+|[A-Z][A-Z0-9 \-]{8,})/m);
	if (!heading) return null;
	return heading[0].replace(/^#+\s*/, "").trim().slice(0, 120) || null;
}

export function chunkDocument(text: string): DocumentChunk[] {
	const pages = text.split(/\f|\n(?=Page\s+\d+)/i);
	const chunks: DocumentChunk[] = [];
	let index = 0;

	pages.forEach((pageText, pageIndex) => {
		const trimmed = pageText.trim();
		if (!trimmed) return;
		const page = pages.length > 1 ? pageIndex + 1 : null;
		if (trimmed.length <= TARGET_CHARS) {
			chunks.push({
				index: index++,
				text: trimmed,
				page,
				section: detectSection(trimmed),
			});
			return;
		}
		for (let start = 0; start < trimmed.length; start += TARGET_CHARS) {
			const slice = trimmed.slice(start, start + TARGET_CHARS);
			chunks.push({
				index: index++,
				text: slice,
				page,
				section: detectSection(slice),
			});
		}
	});

	return chunks.length > 0
		? chunks
		: [{ index: 0, text: text.trim(), page: null, section: null }];
}
