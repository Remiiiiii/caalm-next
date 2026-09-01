"use client";

import type { ReactNode } from "react";
import { ContractCitationBadge } from "@/components/contract-assistant/ContractCitationBadge";
import type { ContractCitation } from "@/lib/ai/contract-assistant.types";
import { splitProseParagraphs } from "@/lib/ai/split-prose";

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;");
}

function formatMarkdown(text: string): string {
	let formatted = escapeHtml(text);
	formatted = formatted.replace(
		/^###\s+(.+)$/gm,
		'<strong class="mb-1 mt-3 block text-sm font-semibold text-slate-800">$1</strong>',
	);
	formatted = formatted.replace(
		/^##\s+(.+)$/gm,
		'<strong class="mb-2 mt-4 block text-base font-semibold text-slate-800">$1</strong>',
	);
	formatted = formatted.replace(
		/^#\s+(.+)$/gm,
		'<strong class="mb-2 mt-4 block text-lg font-semibold text-slate-800">$1</strong>',
	);
	formatted = formatted.replace(
		/\*\*(.+?)\*\*/g,
		'<strong class="font-semibold text-slate-800">$1</strong>',
	);
	formatted = formatted.replace(
		/^\d+\.\s+(.+)$/gm,
		'<p class="mt-3"><strong class="text-slate-800">$1</strong></p>',
	);
	formatted = formatted.replace(
		/^[-*•]\s+(.+)$/gm,
		'<li class="ml-4 list-disc text-slate-700">$1</li>',
	);
	if (!formatted.includes("\n\n") && formatted.split(/\s+/).length > 40) {
		formatted = splitProseParagraphs(formatted).join("\n\n");
	}
	formatted = formatted.replace(/\n{2,}/g, '</p><p class="mt-3">');
	formatted = formatted.replace(/\n/g, "<br />");
	return `<p class="mt-0">${formatted}</p>`;
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
	const parts: ReactNode[] = [];
	const regex = /\[(\d+)(?:-(\d+))?\]/g;
	let lastIndex = 0;
	let match: RegExpExecArray | null = regex.exec(text);
	let key = 0;

	while (match) {
		const before = text.slice(lastIndex, match.index);
		if (before) {
			parts.push(
				<span
					key={`md-${key++}`}
					dangerouslySetInnerHTML={{ __html: formatMarkdown(before) }}
				/>,
			);
		}
		const id = Number(match[1]);
		const citation = citationMap.get(id);
		if (citation) {
			parts.push(
				<ContractCitationBadge
					key={`cite-${id}-${key++}`}
					citation={citation}
					onJumpToPage={onJumpToPage}
				/>,
			);
		} else {
			parts.push(<span key={`raw-${key++}`}>{match[0]}</span>);
		}
		lastIndex = match.index + match[0].length;
		match = regex.exec(text);
	}

	const rest = text.slice(lastIndex);
	if (rest) {
		parts.push(
			<span
				key={`md-${key++}`}
				dangerouslySetInnerHTML={{ __html: formatMarkdown(rest) }}
			/>,
		);
	}

	return (
		<div className="text-left text-sm leading-relaxed text-slate-700">
			{parts}
		</div>
	);
}
