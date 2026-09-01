"use client";

import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
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

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="ml-1 inline-block cursor-pointer rounded-full border border-blue/20 bg-blue/10 px-2 py-0.5 text-xs font-medium text-blue transition-all duration-200 hover:border-blue-300 hover:bg-blue-50"
					aria-label={`${pageLabel} citation`}
					onClick={() => {
						if (firstPage && onJumpToPage) onJumpToPage(firstPage);
					}}
				>
					{citation.pages.length > 1
						? citation.pages.join("-")
						: String(citation.id)}
				</button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-72 border-slate-200 bg-white p-3 text-sm text-slate-700"
			>
				<p className="text-xs font-medium sidebar-gradient-text">{pageLabel}</p>
				<p className="mt-2 text-xs leading-5 text-slate-600">
					{citation.quote || "No excerpt available."}
				</p>
			</PopoverContent>
		</Popover>
	);
}
