"use client";

import type { InlineNode, MdBlock } from "@/lib/docs/markdown";
import { parseMarkdown } from "@/lib/docs/markdown";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";

function Inline({ nodes }: { nodes: InlineNode[] }): ReactNode {
	return nodes.map((node, i) => {
		switch (node.type) {
			case "text":
				return <span key={i}>{node.value}</span>;
			case "code":
				return (
					<code
						key={i}
						className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.9em] font-medium text-slate-800"
					>
						{node.value}
					</code>
				);
			case "strong":
				return (
					<strong key={i} className="font-semibold text-slate-900">
						<Inline nodes={node.children} />
					</strong>
				);
			case "em":
				return (
					<em key={i}>
						<Inline nodes={node.children} />
					</em>
				);
			case "link": {
				const external = node.href.startsWith("http");
				const className =
					"font-medium text-[#0f5384] underline decoration-slate-300 underline-offset-2 hover:decoration-[#0f5384]";
				if (external) {
					return (
						<a
							key={i}
							href={node.href}
							target="_blank"
							rel="noreferrer"
							className={className}
						>
							<Inline nodes={node.children} />
						</a>
					);
				}
				return (
					<Link key={i} href={node.href} className={className}>
						<Inline nodes={node.children} />
					</Link>
				);
			}
			default:
				return null;
		}
	});
}

const calloutStyles = {
	note: "border-blue-200 bg-blue-50/80 text-slate-800",
	tip: "border-emerald-200 bg-emerald-50/80 text-slate-800",
	warning: "border-amber-200 bg-amber-50/80 text-slate-800",
	important: "border-rose-200 bg-rose-50/80 text-slate-800",
} as const;

function Block({ block }: { block: MdBlock }) {
	switch (block.type) {
		case "h1":
			return (
				<h1 className="mt-2 mb-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
					{block.text}
				</h1>
			);
		case "h2":
			return (
				<h2
					id={block.id}
					className="mt-10 mb-3 scroll-mt-28 text-2xl font-semibold tracking-tight text-slate-900"
				>
					{block.text}
				</h2>
			);
		case "h3":
			return (
				<h3
					id={block.id}
					className="mt-8 mb-2 scroll-mt-28 text-lg font-semibold text-slate-900"
				>
					{block.text}
				</h3>
			);
		case "p":
			return (
				<p className="my-4 text-[15px] leading-7 text-slate-700 sm:text-base sm:leading-7">
					<Inline nodes={block.children} />
				</p>
			);
		case "ul":
			return (
				<ul className="my-4 list-disc space-y-2 pl-5 text-[15px] leading-7 text-slate-700">
					{block.items.map((item, i) => (
						<li key={i}>
							<Inline nodes={item} />
						</li>
					))}
				</ul>
			);
		case "ol":
			return (
				<ol className="my-4 list-decimal space-y-2 pl-5 text-[15px] leading-7 text-slate-700">
					{block.items.map((item, i) => (
						<li key={i}>
							<Inline nodes={item} />
						</li>
					))}
				</ol>
			);
		case "blockquote":
			return (
				<blockquote className="my-5 border-l-4 border-slate-300 bg-slate-50 px-4 py-3 text-slate-700">
					<Inline nodes={block.children} />
				</blockquote>
			);
		case "callout":
			return (
				<div
					className={cn(
						"my-6 rounded-lg border px-4 py-3 text-sm leading-6",
						calloutStyles[block.variant],
					)}
				>
					{block.title ? (
						<p className="mb-1 font-semibold tracking-wide">{block.title}</p>
					) : null}
					<p>
						<Inline nodes={block.children} />
					</p>
				</div>
			);
		case "code":
			return (
				<pre className="my-5 overflow-x-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-sm leading-6 text-slate-100">
					<code>{block.code}</code>
				</pre>
			);
		case "table":
			return (
				<div className="my-6 overflow-x-auto rounded-xl border border-slate-200">
					<table className="min-w-full divide-y divide-slate-200 text-left text-sm">
						<thead className="bg-slate-50">
							<tr>
								{block.headers.map((h) => (
									<th
										key={h}
										className="px-3 py-2.5 font-semibold text-slate-800"
									>
										{h}
									</th>
								))}
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100 bg-white">
							{block.rows.map((row, ri) => (
								<tr key={ri}>
									{row.map((cell, ci) => (
										<td key={ci} className="px-3 py-2.5 text-slate-700">
											{cell}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			);
		case "hr":
			return <hr className="my-10 border-slate-200" />;
		default:
			return null;
	}
}

export function DocsMarkdown({ markdown }: { markdown: string }) {
	const blocks = parseMarkdown(markdown);
	return (
		<div className="docs-prose max-w-3xl">
			{blocks.map((block, i) => (
				<Block key={i} block={block} />
			))}
		</div>
	);
}
