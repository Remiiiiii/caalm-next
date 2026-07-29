"use client";

import { LayoutGrid, Table } from "lucide-react";
import { cn } from "@/lib/utils";

export type FilesViewType = "card" | "table";

interface FilesViewToggleProps {
	view: FilesViewType;
	onViewChange: (view: FilesViewType) => void;
}

export function FilesViewToggle({ view, onViewChange }: FilesViewToggleProps) {
	return (
		<div className="flex items-center">
			<div className="inline-flex h-10 items-center rounded-lg border-2 border-slate-200 bg-white p-1 shadow-sm">
				<button
					type="button"
					onClick={() => onViewChange("card")}
					className={cn(
						"inline-flex cursor-pointer items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
						"disabled:pointer-events-none disabled:opacity-50",
						view === "card"
							? "bg-[#03afbf] text-white shadow-md hover:bg-[#02a0af]"
							: "text-slate-600 hover:bg-slate-50",
					)}
					aria-label="Card view"
					aria-pressed={view === "card"}
				>
					<LayoutGrid className="h-5 w-5" />
				</button>
				<button
					type="button"
					onClick={() => onViewChange("table")}
					className={cn(
						"inline-flex cursor-pointer items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
						"disabled:pointer-events-none disabled:opacity-50",
						view === "table"
							? "bg-[#03afbf] text-white shadow-md hover:bg-[#02a0af]"
							: "text-slate-600 hover:bg-slate-50",
					)}
					aria-label="Table view"
					aria-pressed={view === "table"}
				>
					<Table className="h-5 w-5" />
				</button>
			</div>
		</div>
	);
}
