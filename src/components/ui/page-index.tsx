"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PageIndexProps {
	page: number;
	onPageChange: (page: number) => void;
	/** Pass this, or pass `totalItems` + `pageSize` and the component will compute pages. */
	totalPages?: number;
	totalItems?: number;
	pageSize?: number;
	summary?: ReactNode;
	/** When true and no `summary` is set, show Showing x-y of z. */
	showRange?: boolean;
	itemLabel?: string;
	disabled?: boolean;
	hideWhenSinglePage?: boolean;
	scrollToTop?: boolean;
	className?: string;
	"aria-label"?: string;
}

const controlClassName =
	"inline-flex items-center gap-1 bg-transparent p-0 text-xs font-medium text-slate-700 shadow-none border-0 rounded-none cursor-pointer transition-colors duration-200 hover:text-[#0f5384] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:text-slate-400";

export function pageCountFromItems(
	totalItems: number,
	pageSize: number,
): number {
	if (pageSize <= 0) return 1;
	return Math.max(1, Math.ceil(Math.max(0, totalItems) / pageSize));
}

export function showingRangeText(
	page: number,
	pageSize: number,
	totalItems: number,
	itemLabel?: string,
): string {
	if (totalItems <= 0) return itemLabel ? `0 ${itemLabel}` : "0 entries";
	const start = (page - 1) * pageSize + 1;
	const end = Math.min(page * pageSize, totalItems);
	const noun = itemLabel ? ` ${itemLabel}` : "";
	return `Showing ${start}–${end} of ${totalItems}${noun}`;
}

export function PageIndex({
	page,
	totalPages,
	totalItems,
	pageSize,
	onPageChange,
	summary,
	showRange = false,
	itemLabel,
	disabled = false,
	hideWhenSinglePage = false,
	scrollToTop = false,
	className,
	"aria-label": ariaLabel = "Pagination",
}: PageIndexProps) {
	const resolvedPageSize = pageSize && pageSize > 0 ? pageSize : 1;
	const safeTotalPages =
		typeof totalPages === "number"
			? Math.max(1, totalPages)
			: typeof totalItems === "number"
				? pageCountFromItems(totalItems, resolvedPageSize)
				: 1;

	useEffect(() => {
		if (!scrollToTop || page <= 1) return;
		window.scrollTo({ top: 0, behavior: "smooth" });
	}, [page, scrollToTop]);

	if (hideWhenSinglePage && safeTotalPages <= 1) return null;

	const atStart = page <= 1 || safeTotalPages <= 1 || disabled;
	const atEnd = page >= safeTotalPages || safeTotalPages <= 1 || disabled;
	const rangeSummary =
		summary ??
		(showRange && typeof totalItems === "number"
			? showingRangeText(page, resolvedPageSize, totalItems, itemLabel)
			: null);

	return (
		<nav
			aria-label={ariaLabel}
			className={cn(
				"flex flex-wrap items-center gap-3 text-xs text-slate-600",
				className,
			)}
		>
			{rangeSummary ? <span>{rangeSummary}</span> : null}
			<button
				type="button"
				className={cn(controlClassName, rangeSummary && "ml-auto")}
				disabled={atStart}
				onClick={() => onPageChange(page - 1)}
			>
				<ChevronLeft className="h-4 w-4" />
				Previous
			</button>
			<span className="text-slate-700">
				Page {page} of {safeTotalPages}
			</span>
			<button
				type="button"
				className={controlClassName}
				disabled={atEnd}
				onClick={() => onPageChange(page + 1)}
			>
				Next
				<ChevronRight className="h-4 w-4" />
			</button>
		</nav>
	);
}
