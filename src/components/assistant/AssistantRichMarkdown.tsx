"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import {
	escapeMarkdownHtml,
	formatInlineMarkdown,
	parseAssistantMarkdown,
	parseSoleMarkdownLink,
	plainTextForPaste,
} from "@/lib/assistant/formatMarkdown";
import { cn } from "@/lib/utils";

function CodeBlock({ code, language }: { code: string; language: string }) {
	const [copied, setCopied] = useState(false);
	return (
		<div className="relative overflow-hidden rounded-lg bg-slate-900 text-slate-100">
			<div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
				<span className="text-[11px] uppercase tracking-wide text-slate-400">
					{language || "code"}
				</span>
				<button
					type="button"
					className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-300 hover:bg-white/10"
					aria-label="Copy code"
					onClick={() => {
						void navigator.clipboard.writeText(code);
						setCopied(true);
						window.setTimeout(() => setCopied(false), 1200);
					}}
				>
					{copied ? (
						<Check className="h-3.5 w-3.5" aria-hidden />
					) : (
						<Copy className="h-3.5 w-3.5" aria-hidden />
					)}
				</button>
			</div>
			<pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed">
				{code}
			</pre>
		</div>
	);
}

function precedingInstructsPaste(
	blocks: ReturnType<typeof parseAssistantMarkdown>,
	index: number,
): boolean {
	for (let i = index - 1; i >= 0; i -= 1) {
		const prev = blocks[i];
		if (!prev) continue;
		if (prev.type === "heading") continue;
		if (prev.type === "paragraph" || prev.type === "blockquote") {
			return /\b(paste|copy|verification\s+note|closing\s+note|use this|suggested\s+(?:response|note)|mark\s+closed)\b/i.test(
				prev.text,
			);
		}
		break;
	}
	return false;
}

function isPasteableQuoteBlock(
	text: string,
	blocks: ReturnType<typeof parseAssistantMarkdown>,
	index: number,
): boolean {
	const plain = plainTextForPaste(text);
	if (plain.length < 40) return false;
	if (precedingInstructsPaste(blocks, index)) return true;
	const trimmed = text.trim();
	return /^["“'*]/.test(trimmed) || /["”']$/.test(trimmed);
}

function PasteableQuoteBlock({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);
	const copyValue = plainTextForPaste(text);

	return (
		<div className="space-y-1.5">
			<blockquote
				className="border-l-[3px] border-slate-300 pl-3 text-sm italic leading-relaxed text-slate-600"
				dangerouslySetInnerHTML={{
					__html: formatInlineMarkdown(text),
				}}
			/>
			<div className="flex justify-end">
				<button
					type="button"
					className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-[#0f5384] hover:bg-[#0f5384]/5"
					aria-label="Copy response"
					onClick={() => {
						void navigator.clipboard.writeText(copyValue);
						setCopied(true);
						window.setTimeout(() => setCopied(false), 1200);
					}}
				>
					{copied ? (
						<Check className="h-3.5 w-3.5" aria-hidden />
					) : (
						<Copy className="h-3.5 w-3.5" aria-hidden />
					)}
					{copied ? "Copied" : "Copy"}
				</button>
			</div>
		</div>
	);
}

export default function AssistantRichMarkdown({
	text,
	tone = "assistant",
	onOpenHref,
}: {
	text: string;
	tone?: "assistant" | "user";
	onOpenHref?: (href: string) => void;
}) {
	const blocks = parseAssistantMarkdown(text);
	const isUser = tone === "user";

	return (
		<div
			className={cn(
				"max-w-none space-y-2 text-sm leading-relaxed",
				isUser ? "text-white" : "text-slate-700",
			)}
		>
			{blocks.map((block, index) => {
				const key = `${block.type}-${index}`;
				if (block.type === "heading") {
					return (
						<p
							key={key}
							className={cn(
								"font-semibold leading-snug",
								isUser ? "text-white" : "sidebar-gradient-text",
								// Divider between response sections (Summary / What was found / …)
								index > 0 &&
									!isUser &&
									"mt-3 border-t border-slate-200/80 pt-3",
							)}
							dangerouslySetInnerHTML={{
								__html: formatInlineMarkdown(block.text),
							}}
						/>
					);
				}
				if (block.type === "blockquote") {
					if (
						!isUser &&
						isPasteableQuoteBlock(block.text, blocks, index)
					) {
						return <PasteableQuoteBlock key={key} text={block.text} />;
					}
					return (
						<blockquote
							key={key}
							className="border-l-[3px] border-slate-300 pl-3 text-sm italic leading-relaxed text-slate-600"
							dangerouslySetInnerHTML={{
								__html: formatInlineMarkdown(block.text),
							}}
						/>
					);
				}
				if (block.type === "paragraph") {
					const soleLink = parseSoleMarkdownLink(block.text);
					if (soleLink && !isUser) {
						return (
							<p key={key} className="pt-1">
								<button
									type="button"
									onClick={() =>
										onOpenHref
											? onOpenHref(soleLink.href)
											: window.open(soleLink.href, "_self")
									}
									className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#0f5384]/20 bg-[#0f5384]/5 px-3 py-1.5 text-xs font-semibold text-[#0f5384] transition-colors hover:bg-[#0f5384]/10"
								>
									{soleLink.label}
									<ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
								</button>
							</p>
						);
					}
					return (
						<p
							key={key}
							className="break-words leading-relaxed"
							dangerouslySetInnerHTML={{
								__html: formatInlineMarkdown(block.text),
							}}
						/>
					);
				}
				if (block.type === "list") {
					const Tag = block.ordered ? "ol" : "ul";
					return (
						<Tag
							key={key}
							className={cn(
								"my-0 space-y-1.5 pl-5",
								block.ordered ? "list-decimal" : "list-disc",
							)}
						>
							{block.items.map((item, itemIndex) => (
								<li
									key={`${key}-${itemIndex}`}
									className="break-words leading-relaxed [overflow-wrap:anywhere]"
									dangerouslySetInnerHTML={{
										__html: formatInlineMarkdown(item),
									}}
								/>
							))}
						</Tag>
					);
				}
				if (block.type === "code") {
					return (
						<CodeBlock key={key} code={block.code} language={block.language} />
					);
				}
				return (
					<div
						key={key}
						className="overflow-x-auto rounded-lg border border-slate-200/80"
					>
						<table className="w-full text-left text-xs">
							<thead>
								<tr className="border-b border-slate-200/80 bg-slate-50/80">
									{block.headers.map((header) => (
										<th key={header} className="px-2 py-1.5 font-semibold">
											{header}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{block.rows.map((row) => (
									<tr key={row.join("|")} className="border-b border-slate-100">
										{row.map((cell) => (
											<td
												key={cell}
												className="px-2 py-1.5"
												dangerouslySetInnerHTML={{
													__html: formatInlineMarkdown(cell),
												}}
											/>
										))}
									</tr>
								))}
							</tbody>
						</table>
						<span className="sr-only">{escapeMarkdownHtml(block.headers.join(" "))}</span>
					</div>
				);
			})}
		</div>
	);
}
