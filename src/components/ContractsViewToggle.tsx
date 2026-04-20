"use client";

import { LayoutGrid, Table } from "lucide-react";
import { cn } from "@/lib/utils";
import { useContractsView } from "./ContractsView";

export function ContractsViewToggle() {
	const { view, handleViewChange } = useContractsView();

	return (
		<div className="flex items-center">
			<div className="inline-flex items-center rounded-lg border-2 border-slate-200 bg-white p-1 shadow-sm">
				<button
					onClick={() => handleViewChange("card")}
					className={cn(
						"inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2",
						"disabled:pointer-events-none disabled:opacity-50",
						view === "card"
							? "bg-[#03afbf] text-white shadow-md hover:bg-[#02a0af]"
							: "text-slate-600 hover:bg-slate-50",
					)}
					aria-label="Card view"
				>
					<LayoutGrid className="h-5 w-5" />
				</button>
				<button
					onClick={() => handleViewChange("table")}
					className={cn(
						"inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2",
						"disabled:pointer-events-none disabled:opacity-50",
						view === "table"
							? "bg-[#03afbf] text-white shadow-md hover:bg-[#02a0af]"
							: "text-slate-600 hover:bg-slate-50",
					)}
					aria-label="Table view"
				>
					<Table className="h-5 w-5" />
				</button>
			</div>
		</div>
	);
}
