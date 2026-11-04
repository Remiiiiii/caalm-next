function escapeHtml(raw: string): string {
	return raw
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function inlineFormat(raw: string): string {
	let formatted = escapeHtml(raw);
	formatted = formatted.replace(
		/\*\*([^*]+)\*\*/g,
		'<strong class="font-semibold">$1</strong>',
	);
	formatted = formatted.replace(
		/`([^`]+)`/g,
		'<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px] text-slate-700">$1</code>',
	);
	// Markdown links → safe anchors (href was escaped above; unescape for attribute)
	formatted = formatted.replace(
		/\[([^\]]+)\]\(([^)]+)\)/g,
		(_match, label: string, hrefEscaped: string) => {
			const href = hrefEscaped
				.replace(/&amp;/g, "&")
				.replace(/&lt;/g, "<")
				.replace(/&gt;/g, ">")
				.replace(/&quot;/g, '"');
			if (!/^(\/|https?:\/\/)/i.test(href)) return label;
			const safeHref = escapeHtml(href);
			return `<a href="${safeHref}" class="font-semibold text-[#0f5384] underline underline-offset-2 hover:text-[#078fab]">${label}</a>`;
		},
	);
	return formatted;
}

/** True when the whole paragraph is a single markdown link. */
export function parseSoleMarkdownLink(
	raw: string,
): { label: string; href: string } | null {
	const match = raw.trim().match(/^\[([^\]]+)\]\(([^)]+)\)$/);
	if (!match) return null;
	const label = match[1]?.trim() ?? "";
	const href = match[2]?.trim() ?? "";
	if (!label || !href || !/^(\/|https?:\/\/)/i.test(href)) return null;
	return { label, href };
}

export type MarkdownBlock =
	| { type: "heading"; level: 2 | 3; text: string }
	| { type: "paragraph"; text: string }
	| { type: "list"; ordered: boolean; items: string[] }
	| { type: "code"; language: string; code: string }
	| { type: "table"; headers: string[]; rows: string[][] };

export function parseAssistantMarkdown(text: string): MarkdownBlock[] {
	if (!text.trim()) return [];
	const lines = text.replace(/\r\n/g, "\n").split("\n");
	const blocks: MarkdownBlock[] = [];
	let i = 0;

	while (i < lines.length) {
		const line = lines[i] ?? "";

		if (line.trim().startsWith("```")) {
			const language = line.trim().slice(3).trim();
			const body: string[] = [];
			i += 1;
			while (i < lines.length && !lines[i]?.trim().startsWith("```")) {
				body.push(lines[i] ?? "");
				i += 1;
			}
			blocks.push({ type: "code", language, code: body.join("\n") });
			i += 1;
			continue;
		}

		if (line.startsWith("### ")) {
			blocks.push({ type: "heading", level: 3, text: line.slice(4).trim() });
			i += 1;
			continue;
		}
		if (line.startsWith("## ")) {
			blocks.push({ type: "heading", level: 2, text: line.slice(3).trim() });
			i += 1;
			continue;
		}

		if (/^\|.+\|$/.test(line.trim()) && lines[i + 1]?.includes("---")) {
			const headers = line
				.trim()
				.slice(1, -1)
				.split("|")
				.map((cell) => cell.trim());
			i += 2;
			const rows: string[][] = [];
			while (i < lines.length && /^\|.+\|$/.test(lines[i]?.trim() ?? "")) {
				rows.push(
					(lines[i] ?? "")
						.trim()
						.slice(1, -1)
						.split("|")
						.map((cell) => cell.trim()),
				);
				i += 1;
			}
			blocks.push({ type: "table", headers, rows });
			continue;
		}

		if (/^\d+\.\s+/.test(line) || /^[-*]\s+/.test(line)) {
			const ordered = /^\d+\.\s+/.test(line);
			const items: string[] = [];
			while (
				i < lines.length &&
				(ordered ? /^\d+\.\s+/.test(lines[i] ?? "") : /^[-*]\s+/.test(lines[i] ?? ""))
			) {
				items.push((lines[i] ?? "").replace(/^\d+\.\s+|^[-*]\s+/, "").trim());
				i += 1;
			}
			blocks.push({ type: "list", ordered, items });
			continue;
		}

		if (!line.trim()) {
			i += 1;
			continue;
		}

		const para: string[] = [line];
		i += 1;
		while (
			i < lines.length &&
			lines[i]?.trim() &&
			!lines[i]?.startsWith("##") &&
			!lines[i]?.trim().startsWith("```") &&
			!/^\d+\.\s+/.test(lines[i] ?? "") &&
			!/^[-*]\s+/.test(lines[i] ?? "")
		) {
			para.push(lines[i] ?? "");
			i += 1;
		}
		blocks.push({ type: "paragraph", text: para.join(" ") });
	}

	return blocks;
}

/** HTML for simple bubbles (user messages). Prefer AssistantRichMarkdown for agent replies. */
export function formatAssistantMarkdown(text: string): string {
	if (!text) return "";
	const blocks = parseAssistantMarkdown(text);
	return blocks
		.map((block) => {
			switch (block.type) {
				case "heading":
					return `<p class="font-semibold sidebar-gradient-text">${inlineFormat(block.text)}</p>`;
				case "paragraph":
					return `<p>${inlineFormat(block.text)}</p>`;
				case "list": {
					const tag = block.ordered ? "ol" : "ul";
					const cls = block.ordered
						? "list-decimal pl-5 space-y-1"
						: "list-disc pl-5 space-y-1";
					const items = block.items
						.map((item) => `<li>${inlineFormat(item)}</li>`)
						.join("");
					return `<${tag} class="${cls}">${items}</${tag}>`;
				}
				case "code":
					return `<pre class="overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-100">${escapeHtml(block.code)}</pre>`;
				case "table":
					return `<p>${inlineFormat(block.headers.join(" · "))}</p>`;
				default: {
					const _never: never = block;
					return _never;
				}
			}
		})
		.join("");
}

export { inlineFormat as formatInlineMarkdown, escapeHtml as escapeMarkdownHtml };

export function formatRelativeTime(iso: string): string {
	const date = new Date(iso);
	const diffMs = Math.max(0, Date.now() - date.getTime());
	const mins = Math.floor(diffMs / (1000 * 60));
	if (mins < 1) return "now";
	if (mins < 60) return `${mins}m`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d`;
	const months = Math.floor(days / 30);
	if (months < 12) return `${months}mo`;
	return `${Math.floor(months / 12)}y`;
}
