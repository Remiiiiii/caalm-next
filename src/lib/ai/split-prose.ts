/**
 * Turn a wall of notice/AI text into readable paragraphs.
 * Keeps existing blank-line breaks; otherwise splits on sentence groups.
 */
export function splitProseParagraphs(
	text: string,
	wordsPerParagraph = 45,
): string[] {
	const cleaned = text.replace(/\r\n/g, "\n").trim();
	if (!cleaned) return [];

	const withSectionBreaks = cleaned
		.replace(
			/\s+(THIS IS A NOTICE|The proposed|Interested (?:persons|parties)|This is not a request|Statutory Authority|The Government intends|While intended)/gi,
			"\n\n$1",
		)
		.trim();

	if (/\n\s*\n/.test(withSectionBreaks)) {
		return withSectionBreaks
			.split(/\n\s*\n/)
			.map((part) => part.replace(/[ \t]+/g, " ").replace(/\n/g, " ").trim())
			.filter(Boolean);
	}

	const flat = withSectionBreaks.replace(/\s+/g, " ").trim();
	const sentences = flat.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [flat];
	const paragraphs: string[] = [];
	let current = "";
	let wordCount = 0;

	for (const sentence of sentences) {
		const trimmed = sentence.trim();
		if (!trimmed) continue;
		const words = trimmed.split(/\s+/).filter(Boolean).length;

		if (current && wordCount + words > wordsPerParagraph) {
			paragraphs.push(current.trim());
			current = trimmed;
			wordCount = words;
			continue;
		}

		current = current ? `${current} ${trimmed}` : trimmed;
		wordCount += words;
	}

	if (current.trim()) paragraphs.push(current.trim());
	return paragraphs.length > 0 ? paragraphs : [flat];
}
