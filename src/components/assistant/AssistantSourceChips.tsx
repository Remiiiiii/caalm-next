"use client";

import type { RetrievedSource } from "@/components/assistant/assistantTypes";

export default function AssistantSourceChips({
	sources,
	onOpen,
}: {
	sources: RetrievedSource[];
	onOpen: (href: string) => void;
}) {
	if (!sources.length) return null;
	return (
		<ul className="mt-2 flex flex-wrap gap-1.5">
			{sources.map((source) => (
				<li key={source.id}>
					{source.href ? (
						<button
							type="button"
							onClick={() => onOpen(source.href!)}
							className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-blue/20 bg-blue/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue hover:bg-blue/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
						>
							{source.title}
							<span className="font-medium underline-offset-2">Open</span>
						</button>
					) : (
						<span className="inline-flex rounded-full border border-blue/20 bg-blue/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue">
							{source.title}
						</span>
					)}
				</li>
			))}
		</ul>
	);
}
