export type ReadinessProseBlock =
	| { type: "paragraph"; text: string }
	| { type: "list"; ordered: boolean; items: string[] };

/** Turn model markdown into plain professional prose, keeping paragraph breaks. */
export function formatReadinessAssistantText(raw: string): string {
	if (!raw) return "";
	return raw
		.replace(/\r\n/g, "\n")
		.replace(/```[a-zA-Z0-9]*\n?([\s\S]*?)```/g, "$1")
		.replace(/^#{1,6}\s+/gm, "")
		.replace(/\*\*([^*]+)\*\*/g, "$1")
		.replace(/__([^_]+)__/g, "$1")
		.replace(/(^|[^\w/])\*([^*\n]+)\*(?!\*)/g, "$1$2")
		.replace(/(^|[^\w/])_([^_\n]+)_(?!_)/g, "$1$2")
		.replace(/`([^`]+)`/g, "$1")
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
		.replace(/^>\s?/gm, "")
		.replace(/^[-*+]\s+/gm, "• ")
		.replace(/\s*\(\/[a-z0-9\-_/]+\)/gi, "")
		.replace(/\*/g, "")
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

export function splitReadinessProse(text: string): ReadinessProseBlock[] {
	const formatted = formatReadinessAssistantText(text);
	if (!formatted) return [];

	const chunks = formatted.split(/\n{2,}/).filter(Boolean);
	const blocks: ReadinessProseBlock[] = [];

	for (const chunk of chunks) {
		const lines = chunk
			.split("\n")
			.map((line) => line.trim())
			.filter(Boolean);
		if (!lines.length) continue;

		const unordered = lines.filter((line) => /^•\s/.test(line));
		const ordered = lines.filter((line) => /^\d+[.)]\s/.test(line));
		const isUnordered = unordered.length > 0 && unordered.length === lines.length;
		const isOrdered = ordered.length > 0 && ordered.length === lines.length;

		if (isUnordered || isOrdered) {
			blocks.push({
				type: "list",
				ordered: isOrdered,
				items: lines.map((line) =>
					line.replace(/^•\s+/, "").replace(/^\d+[.)]\s+/, ""),
				),
			});
			continue;
		}

		if (unordered.length || ordered.length) {
			const intro = lines.filter(
				(line) => !/^•\s/.test(line) && !/^\d+[.)]\s/.test(line),
			);
			if (intro.length) {
				blocks.push({ type: "paragraph", text: intro.join(" ") });
			}
			blocks.push({
				type: "list",
				ordered: ordered.length >= unordered.length,
				items: lines
					.filter((line) => /^•\s/.test(line) || /^\d+[.)]\s/.test(line))
					.map((line) =>
						line.replace(/^•\s+/, "").replace(/^\d+[.)]\s+/, ""),
					),
			});
			continue;
		}

		blocks.push({ type: "paragraph", text: lines.join(" ") });
	}

	return blocks;
}
