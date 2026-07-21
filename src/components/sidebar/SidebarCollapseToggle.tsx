"use client";

import { PanelLeft, PanelRight } from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSidebarCollapse } from "@/contexts/SidebarContext";
import { cn } from "@/lib/utils";

type SidebarCollapseToggleProps = {
	className?: string;
	/** Compact mode for collapsed rail */
	compact?: boolean;
};

export default function SidebarCollapseToggle({
	className,
	compact = false,
}: SidebarCollapseToggleProps) {
	const { isCollapsed, toggleSidebar } = useSidebarCollapse();
	const label = isCollapsed ? "Expand sidebar" : "Collapse sidebar";
	const Icon = isCollapsed ? PanelRight : PanelLeft;

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<button
						type="button"
						onClick={toggleSidebar}
						aria-expanded={!isCollapsed}
						aria-label={label}
						title={`${label} (Ctrl+B)`}
						className={cn(
							"flex items-center justify-center rounded-lg cursor-pointer",
							"text-slate-600 hover:text-[#0f5384] hover:bg-blue/10",
							"transition-all duration-200 border border-transparent hover:border-blue/20",
							"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
							compact ? "h-9 w-9" : "h-8 w-8",
							className,
						)}
					>
						<Icon className="h-4 w-4" />
					</button>
				</TooltipTrigger>
				<TooltipContent side="right">
					<p>
						{label} <span className="text-slate-400 text-xs ml-1">Ctrl+B</span>
					</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
