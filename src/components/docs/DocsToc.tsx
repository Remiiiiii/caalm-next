"use client";

import type { DocsHeading } from "@/lib/docs/types";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function DocsToc({ headings }: { headings: DocsHeading[] }) {
	const [activeId, setActiveId] = useState<string>("");

	useEffect(() => {
		if (!headings.length) return;
		const elements = headings
			.map((h) => document.getElementById(h.id))
			.filter((el): el is HTMLElement => Boolean(el));

		const observer = new IntersectionObserver(
			(entries) => {
				const visible = entries
					.filter((e) => e.isIntersecting)
					.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
				if (visible[0]?.target?.id) {
					setActiveId(visible[0].target.id);
				}
			},
			{ rootMargin: "-20% 0px -65% 0px", threshold: [0, 0.25, 0.5, 1] },
		);

		for (const el of elements) observer.observe(el);
		return () => observer.disconnect();
	}, [headings]);

	if (!headings.length) return null;

	return (
		<nav aria-label="On this page" className="space-y-3">
			<p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
				On this page
			</p>
			<ul className="space-y-1 border-l border-slate-200">
				{headings.map((heading) => (
					<li key={heading.id}>
						<a
							href={`#${heading.id}`}
							className={cn(
								"block border-l-2 py-1 text-sm transition-colors duration-200",
								heading.level === 3 ? "pl-5" : "pl-3",
								activeId === heading.id
									? "-ml-px border-[#0f5384] font-medium text-[#0f5384]"
									: "border-transparent text-slate-500 hover:text-slate-800",
							)}
						>
							{heading.text}
						</a>
					</li>
				))}
			</ul>
		</nav>
	);
}
