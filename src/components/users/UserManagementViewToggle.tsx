"use client";

import { Share2, Table } from "lucide-react";
import { cn } from "@/lib/utils";

export type UserManagementViewType = "table" | "diagram";

export const USER_MANAGEMENT_VIEW_STORAGE_KEY =
	"user-management-view-preference";

export function UserManagementViewToggle({
	view,
	onViewChange,
}: {
	view: UserManagementViewType;
	onViewChange: (view: UserManagementViewType) => void;
}) {
	return (
		<div className="flex items-center">
			<div className="inline-flex h-10 items-center rounded-lg border-2 border-slate-200 bg-white p-1 shadow-sm">
				<button
					type="button"
					onClick={() => onViewChange("table")}
					className={cn(
						"inline-flex cursor-pointer items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
						view === "table"
							? "bg-[#03afbf] text-white shadow-md hover:bg-[#02a0af]"
							: "text-slate-600 hover:bg-slate-50",
					)}
					aria-label="Table view"
					aria-pressed={view === "table"}
				>
					<Table className="h-5 w-5" />
				</button>
				<button
					type="button"
					onClick={() => onViewChange("diagram")}
					className={cn(
						"inline-flex cursor-pointer items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
						view === "diagram"
							? "bg-[#03afbf] text-white shadow-md hover:bg-[#02a0af]"
							: "text-slate-600 hover:bg-slate-50",
					)}
					aria-label="Assignment diagram view"
					aria-pressed={view === "diagram"}
				>
					<Share2 className="h-5 w-5" />
				</button>
			</div>
		</div>
	);
}
