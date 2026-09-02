"use client";

import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { ContractCitation } from "@/lib/ai/contract-assistant.types";

export function ContractCitationBadge({
	citation,
	onJumpToPage,
}: {
	citation: ContractCitation;
	onJumpToPage?: (page: number) => void;
}) {
	const firstPage = citation.pages[0];
	const pageLabel =
		citation.pages.length > 1
			? `Pages ${citation.pages.join("-")}`
			: firstPage
				? `Page ${firstPage}`
				: "Source excerpt";

	const label =
		citation.pages.length > 1
			? citation.pages.join("-")
			: String(citation.id);

	return (
		<HoverCard openDelay={120} closeDelay={80}>
			<HoverCardTrigger asChild>
				<button
					type="button"
					className="ml-0.5 inline cursor-help border-0 bg-transparent p-0 align-baseline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
					aria-label={`${pageLabel} citation`}
				>
					<sub className="text-[10px] font-medium text-blue transition-colors duration-200 hover:text-[#0f5384] hover:underline">
						{label}
					</sub>
				</button>
			</HoverCardTrigger>
			<HoverCardContent
				align="start"
				side="top"
				sideOffset={6}
				collisionPadding={16}
				className="z-100 w-72 max-w-[min(18rem,calc(100vw-2rem))] wrap-break-word border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-lg"
			>
				<p className="text-xs font-medium sidebar-gradient-text">{pageLabel}</p>
				<p className="mt-2 whitespace-pre-wrap wrap-break-word text-xs leading-5 text-slate-600">
					{citation.quote || "No excerpt available."}
				</p>
				{firstPage && onJumpToPage ? (
					<button
						type="button"
						className="mt-2 cursor-pointer text-xs font-medium text-[#0f5384] hover:underline"
						onClick={() => onJumpToPage(firstPage)}
					>
						Go to page {firstPage}
					</button>
				) : null}
			</HoverCardContent>
		</HoverCard>
	);
}
