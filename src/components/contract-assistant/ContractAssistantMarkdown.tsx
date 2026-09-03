"use client";

import type { ReactNode } from "react";
import { ContractCitationBadge } from "@/components/contract-assistant/ContractCitationBadge";
import type { ContractCitation } from "@/lib/ai/contract-assistant.types";
import { splitProseParagraphs } from "@/lib/ai/split-prose";

/**
 * Normalize messy model markdown before rendering.
 * Models often emit inline " * **Label:**" separators instead of real newlines.
 */
function normalizeAssistantMarkdown(text: string): string {
	let next = text.replace(/\r\n/g, "\n").trim();

	next = next.replace(/\s+\*\s+(?=\*\*[^*]+?:\*\*)/g, "\n- ");
	next = next.replace(/^\*\s+(?=\*\*)/gm, "- ");
	next = next.replace(/\s+\*\s*$/gm, "");
	next = next.replace(/"([^"\n]{1,48})"/g, "$1");
	next = next.replace(
		/^(\*\*[^*\n]+\*\*)\s*\n(?=[-*•]|\d+\.)/m,
		"$1\n\n",
	);

	return next.trim();
}

function renderInlineText(
	text: string,
	citationMap: Map<number, ContractCitation>,
	onJumpToPage: ((page: number) => void) | undefined,
	keyPrefix: string,
): ReactNode[] {
	const parts: ReactNode[] = [];
	const regex = /\[(\d+)(?:-(\d+))?\]|\*\*(.+?)\*\*/g;
	let lastIndex = 0;
	let match: RegExpExecArray | null = regex.exec(text);
	let key = 0;

	while (match) {
		if (match.index > lastIndex) {
			parts.push(text.slice(lastIndex, match.index));
		}

		if (match[1]) {
			const id = Number(match[1]);
			const citation = citationMap.get(id);
			if (citation) {
				parts.push(
					<ContractCitationBadge
						key={`${keyPrefix}-cite-${id}-${key++}`}
						citation={citation}
						onJumpToPage={onJumpToPage}
					/>,
				);
			}
		} else if (match[3]) {
			parts.push(
				<strong
					key={`${keyPrefix}-b-${key++}`}
					className="font-semibold text-slate-700"
				>
					{match[3]}
				</strong>,
			);
		}

		lastIndex = match.index + match[0].length;
		match = regex.exec(text);
	}

	if (lastIndex < text.length) {
		parts.push(text.slice(lastIndex));
	}

	return parts;
}

function renderFactLine(
	content: string,
	citationMap: Map<number, ContractCitation>,
	onJumpToPage: ((page: number) => void) | undefined,
	keyPrefix: string,
): ReactNode {
	const fact = content.match(/^\*\*([^*]+?):\*\*\s*(.*)$/);
	if (fact) {
		const value = fact[2].trim();
		return (
			<div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
				<span className="shrink-0 font-semibold text-slate-700">
					{fact[1].trim()}:
				</span>
				<span className="min-w-0 text-slate-700">
					{value
						? renderInlineText(value, citationMap, onJumpToPage, keyPrefix)
						: "—"}
				</span>
			</div>
		);
	}

	return (
		<span className="text-slate-700">
			{renderInlineText(content, citationMap, onJumpToPage, keyPrefix)}
		</span>
	);
}

export function ContractAssistantMarkdown({
	text,
	citations,
	onJumpToPage,
}: {
	text: string;
	citations: ContractCitation[];
	onJumpToPage?: (page: number) => void;
}) {
	const citationMap = new Map(citations.map((item) => [item.id, item]));
	const normalized = normalizeAssistantMarkdown(text);
	const lines = normalized.split("\n");
	const nodes: ReactNode[] = [];
	let listItems: ReactNode[] = [];
	let paragraphLines: string[] = [];
	let blockKey = 0;

	const flushList = () => {
		if (listItems.length === 0) return;
		nodes.push(
			<ul
				key={`list-${blockKey++}`}
				className="my-2 space-y-2 border-l-2 border-slate-200 pl-3"
			>
				{listItems}
			</ul>,
		);
		listItems = [];
	};

	const flushParagraph = () => {
		if (paragraphLines.length === 0) return;
		const joined = paragraphLines.join(" ").trim();
		if (joined) {
			nodes.push(
				<p
					key={`p-${blockKey++}`}
					className="mt-2 text-sm leading-relaxed text-slate-700 first:mt-0"
				>
					{renderInlineText(
						joined,
						citationMap,
						onJumpToPage,
						`p-${blockKey}`,
					)}
				</p>,
			);
		}
		paragraphLines = [];
	};

	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line) {
			flushList();
			flushParagraph();
			continue;
		}

		const heading =
			line.match(/^###\s+(.+)$/) ||
			line.match(/^##\s+(.+)$/) ||
			line.match(/^#\s+(.+)$/);
		if (heading) {
			flushList();
			flushParagraph();
			nodes.push(
				<p
					key={`h-${blockKey++}`}
					className="mt-3 text-sm font-semibold sidebar-gradient-text first:mt-0"
				>
					{heading[1].trim()}
				</p>,
			);
			continue;
		}

		if (/^\*\*[^*]+\*\*$/.test(line)) {
			flushList();
			flushParagraph();
			nodes.push(
				<p
					key={`t-${blockKey++}`}
					className="mb-2 mt-0 text-sm font-semibold sidebar-gradient-text"
				>
					{line.slice(2, -2).trim()}
				</p>,
			);
			continue;
		}

		const bullet = line.match(/^[-*•]\s+(.+)$/);
		if (bullet) {
			flushParagraph();
			const itemKey = `li-${blockKey++}`;
			listItems.push(
				<li key={itemKey} className="text-sm leading-relaxed">
					{renderFactLine(bullet[1], citationMap, onJumpToPage, itemKey)}
				</li>,
			);
			continue;
		}

		const numbered = line.match(/^\d+\.\s+(.+)$/);
		if (numbered) {
			flushParagraph();
			const itemKey = `li-${blockKey++}`;
			listItems.push(
				<li key={itemKey} className="list-decimal text-sm leading-relaxed">
					{renderFactLine(numbered[1], citationMap, onJumpToPage, itemKey)}
				</li>,
			);
			continue;
		}

		flushList();
		paragraphLines.push(line);
	}

	flushList();
	flushParagraph();

	if (nodes.length === 0) {
		return (
			<div className="text-left text-sm leading-relaxed text-slate-700">
				{splitProseParagraphs(normalized).map((paragraph, index) => (
					<p key={`fb-${index}`} className="mt-2 first:mt-0">
						{renderInlineText(
							paragraph,
							citationMap,
							onJumpToPage,
							`fb-${index}`,
						)}
					</p>
				))}
			</div>
		);
	}

	return (
		<div className="text-left text-sm leading-relaxed text-slate-700">
			{nodes}
		</div>
	);
}
