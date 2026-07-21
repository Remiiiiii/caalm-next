"use client";

import { FOOTER_KEYWORDS } from "./landingContent";

export default function FooterMarquee() {
	const items = [...FOOTER_KEYWORDS, ...FOOTER_KEYWORDS];

	return (
		<div className="relative w-full overflow-hidden border-y border-slate-200/80 bg-white/40 py-3">
			<div
				className="pointer-events-none absolute left-0 top-0 h-full w-16 z-10"
				style={{
					background:
						"linear-gradient(to right, rgba(255,255,255,0.95) 0%, transparent 100%)",
				}}
			/>
			<div
				className="pointer-events-none absolute right-0 top-0 h-full w-16 z-10"
				style={{
					background:
						"linear-gradient(to left, rgba(255,255,255,0.95) 0%, transparent 100%)",
				}}
			/>
			<div
				className="flex flex-row gap-8 animate-marquee whitespace-nowrap"
				style={{ animationDuration: "40s" }}
			>
				{items.map((keyword, i) => (
					<span
						key={`${keyword}-${i}`}
						className="inline-flex shrink-0 items-center gap-2 text-sm text-slate-600"
					>
						<span
							className="h-1.5 w-1.5 rounded-full bg-[#03AFBF]"
							aria-hidden
						/>
						{keyword}
					</span>
				))}
			</div>
		</div>
	);
}
