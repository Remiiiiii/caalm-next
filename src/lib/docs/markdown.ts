import type { DocsHeading } from "./types";

/** Turn a heading into a stable anchor id. */
export function slugifyHeading(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.replace(/[`*_~]/g, "")
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-");
}

export function extractHeadings(markdown: string): DocsHeading[] {
	const headings: DocsHeading[] = [];
	const lines = markdown.split(/\r?\n/);
	let inFence = false;

	for (const line of lines) {
		if (line.trim().startsWith("```")) {
			inFence = !inFence;
			continue;
		}
		if (inFence) continue;

		const match = /^(#{2,3})\s+(.+)$/.exec(line);
		if (!match) continue;
		const level = match[1].length as 2 | 3;
		const text = match[2].trim();
		headings.push({ id: slugifyHeading(text), text, level });
	}

	return headings;
}

export type InlineNode =
	| { type: "text"; value: string }
	| { type: "code"; value: string }
	| { type: "strong"; children: InlineNode[] }
	| { type: "em"; children: InlineNode[] }
	| { type: "link"; href: string; children: InlineNode[] };

export type MdBlock =
	| { type: "h1" | "h2" | "h3"; id?: string; text: string }
	| { type: "p"; children: InlineNode[] }
	| { type: "ul" | "ol"; items: InlineNode[][] }
	| { type: "blockquote"; children: InlineNode[] }
	| {
			type: "callout";
			variant: "note" | "tip" | "warning" | "important";
			title?: string;
			children: InlineNode[];
	  }
	| { type: "code"; lang?: string; code: string }
	| { type: "table"; headers: string[]; rows: string[][] }
	| { type: "hr" };

const CALLOUT_RE = /^>\s*\[!(NOTE|TIP|WARNING|IMPORTANT)\]\s*(.*)$/i;

function parseInline(input: string): InlineNode[] {
	const nodes: InlineNode[] = [];
	let i = 0;

	const pushText = (value: string) => {
		if (!value) return;
		const last = nodes[nodes.length - 1];
		if (last?.type === "text") {
			last.value += value;
		} else {
			nodes.push({ type: "text", value });
		}
	};

	while (i < input.length) {
		if (input[i] === "`") {
			const end = input.indexOf("`", i + 1);
			if (end !== -1) {
				nodes.push({ type: "code", value: input.slice(i + 1, end) });
				i = end + 1;
				continue;
			}
		}

		if (input.startsWith("[", i)) {
			const closeLabel = input.indexOf("]", i);
			const openParen = closeLabel >= 0 ? input.indexOf("(", closeLabel) : -1;
			const closeParen = openParen >= 0 ? input.indexOf(")", openParen) : -1;
			if (
				closeLabel > i &&
				openParen === closeLabel + 1 &&
				closeParen > openParen
			) {
				const label = input.slice(i + 1, closeLabel);
				const href = input.slice(openParen + 1, closeParen);
				nodes.push({
					type: "link",
					href,
					children: parseInline(label),
				});
				i = closeParen + 1;
				continue;
			}
		}

		if (input.startsWith("**", i)) {
			const end = input.indexOf("**", i + 2);
			if (end !== -1) {
				nodes.push({
					type: "strong",
					children: parseInline(input.slice(i + 2, end)),
				});
				i = end + 2;
				continue;
			}
		}

		if (input[i] === "*" && input[i + 1] !== "*") {
			const end = input.indexOf("*", i + 1);
			if (end !== -1) {
				nodes.push({
					type: "em",
					children: parseInline(input.slice(i + 1, end)),
				});
				i = end + 1;
				continue;
			}
		}

		pushText(input[i]);
		i += 1;
	}

	return nodes;
}

function parseTable(lines: string[], start: number): { block: MdBlock; next: number } {
	const header = lines[start]
		.split("|")
		.map((c) => c.trim())
		.filter(Boolean);
	let i = start + 1;
	if (i < lines.length && /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(lines[i])) {
		i += 1;
	}
	const rows: string[][] = [];
	while (i < lines.length && lines[i].includes("|")) {
		const row = lines[i]
			.split("|")
			.map((c) => c.trim())
			.filter(Boolean);
		if (row.length) rows.push(row);
		i += 1;
	}
	return { block: { type: "table", headers: header, rows }, next: i };
}

/**
 * Lightweight markdown → AST. Supports the subset we use in CAALM docs:
 * headings, paragraphs, lists, tables, fenced code, blockquotes, GitHub callouts.
 */
export function parseMarkdown(markdown: string): MdBlock[] {
	const lines = markdown.replace(/\r\n/g, "\n").split("\n");
	const blocks: MdBlock[] = [];
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];
		const trimmed = line.trim();

		if (!trimmed) {
			i += 1;
			continue;
		}

		if (trimmed === "---") {
			blocks.push({ type: "hr" });
			i += 1;
			continue;
		}

		if (trimmed.startsWith("```")) {
			const lang = trimmed.slice(3).trim() || undefined;
			i += 1;
			const codeLines: string[] = [];
			while (i < lines.length && !lines[i].trim().startsWith("```")) {
				codeLines.push(lines[i]);
				i += 1;
			}
			i += 1; // closing fence
			blocks.push({ type: "code", lang, code: codeLines.join("\n") });
			continue;
		}

		const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
		if (heading) {
			const level = heading[1].length;
			const text = heading[2].trim();
			const tag = (`h${level}` as "h1" | "h2" | "h3");
			blocks.push({
				type: tag,
				id: level >= 2 ? slugifyHeading(text) : undefined,
				text,
			});
			i += 1;
			continue;
		}

		if (trimmed.includes("|") && trimmed.startsWith("|")) {
			const { block, next } = parseTable(lines, i);
			blocks.push(block);
			i = next;
			continue;
		}

		if (trimmed.startsWith(">")) {
			const calloutMatch = CALLOUT_RE.exec(trimmed);
			const bodyLines: string[] = [];
			if (calloutMatch) {
				const variant = calloutMatch[1].toLowerCase() as
					| "note"
					| "tip"
					| "warning"
					| "important";
				if (calloutMatch[2]) bodyLines.push(calloutMatch[2]);
				i += 1;
				while (i < lines.length && lines[i].trim().startsWith(">")) {
					bodyLines.push(lines[i].replace(/^>\s?/, ""));
					i += 1;
				}
				blocks.push({
					type: "callout",
					variant,
					title: variant[0].toUpperCase() + variant.slice(1),
					children: parseInline(bodyLines.join(" ").trim()),
				});
				continue;
			}

			while (i < lines.length && lines[i].trim().startsWith(">")) {
				bodyLines.push(lines[i].replace(/^>\s?/, ""));
				i += 1;
			}
			blocks.push({
				type: "blockquote",
				children: parseInline(bodyLines.join(" ").trim()),
			});
			continue;
		}

		if (/^[-*]\s+/.test(trimmed)) {
			const items: InlineNode[][] = [];
			while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
				items.push(parseInline(lines[i].trim().replace(/^[-*]\s+/, "")));
				i += 1;
			}
			blocks.push({ type: "ul", items });
			continue;
		}

		if (/^\d+\.\s+/.test(trimmed)) {
			const items: InlineNode[][] = [];
			while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
				items.push(parseInline(lines[i].trim().replace(/^\d+\.\s+/, "")));
				i += 1;
			}
			blocks.push({ type: "ol", items });
			continue;
		}

		const para: string[] = [trimmed];
		i += 1;
		while (
			i < lines.length &&
			lines[i].trim() &&
			!/^(#{1,3}\s|```|---|>|[-*]\s|\d+\.\s|\|)/.test(lines[i].trim())
		) {
			para.push(lines[i].trim());
			i += 1;
		}
		blocks.push({ type: "p", children: parseInline(para.join(" ")) });
	}

	return blocks;
}

export function stripMarkdown(markdown: string): string {
	return markdown
		.replace(/```[\s\S]*?```/g, " ")
		.replace(/^>\s*\[!(NOTE|TIP|WARNING|IMPORTANT)\]\s*/gim, "")
		.replace(/^>\s?/gm, "")
		.replace(/!\[[^\]]*\]\([^)]+\)/g, "")
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
		.replace(/[`*_#]/g, "")
		.replace(/\s+/g, " ")
		.trim();
}
