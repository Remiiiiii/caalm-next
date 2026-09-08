"use client";

import type { ClauseTocEntry } from "@/lib/contracts/negotiation/document-model";
import { cn } from "@/lib/utils";

interface NegotiationClauseNavProps {
	toc: ClauseTocEntry[];
	activeClauseId: string;
	onJump: (entry: ClauseTocEntry) => void;
}

export function NegotiationClauseNav({
	toc,
	activeClauseId,
	onJump,
}: NegotiationClauseNavProps) {
	if (toc.length === 0) return null;
	return (
		<div className="px-3 pt-3 pb-2">
			<p className="mb-2 px-1 text-[11px] font-bold tracking-wide text-slate-500 uppercase">
				Jump to clause
			</p>
			<ul>
				{toc.map((entry) => (
					<li key={entry.id}>
						<button
							type="button"
							onClick={() => onJump(entry)}
							className={cn(
								"w-full cursor-pointer border-b border-slate-100 px-1 py-1.5 text-left text-xs transition-colors",
								entry.id === activeClauseId
									? "font-semibold text-[#0f5384]"
									: "text-slate-600 hover:text-[#0f5384]",
							)}
						>
							{entry.index}. {entry.title}
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}
