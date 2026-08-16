"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type IssueHistoryRangeNavProps = {
	label: string;
	canGoNewer: boolean;
	canGoOlder: boolean;
	onGoNewer: () => void;
	onGoOlder: () => void;
};

export function IssueHistoryRangeNav({
	label,
	canGoNewer,
	canGoOlder,
	onGoNewer,
	onGoOlder,
}: IssueHistoryRangeNavProps) {
	return (
		<div
			className="flex w-full items-center justify-center gap-3 sm:gap-4"
			role="group"
			aria-label="Issue history date range"
		>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="h-8 w-8 shrink-0 rounded-md border border-slate-200/80 bg-white/60 text-slate-600 hover:bg-white/80 disabled:opacity-40"
				disabled={!canGoOlder}
				onClick={onGoOlder}
				aria-label="Previous three months"
			>
				<ChevronLeft className="h-4 w-4" />
			</Button>
			<span className="min-w-0 truncate text-center text-sm font-medium text-slate-700 sm:text-base">
				{label}
			</span>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="h-8 w-8 shrink-0 rounded-md border border-slate-200/80 bg-white/60 text-slate-600 hover:bg-white/80 disabled:opacity-40"
				disabled={!canGoNewer}
				onClick={onGoNewer}
				aria-label="Next three months"
			>
				<ChevronRight className="h-4 w-4" />
			</Button>
		</div>
	);
}
