"use client";

import type { ReactElement } from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

type GmailActionTooltipProps = {
	label: string;
	children: ReactElement;
	side?: "top" | "bottom" | "left" | "right";
};

/** Hover label for Mail action icons (archive, trash, reply, etc.). */
export function GmailActionTooltip({
	label,
	children,
	side = "bottom",
}: GmailActionTooltipProps) {
	return (
		<TooltipProvider delayDuration={300}>
			<Tooltip>
				<TooltipTrigger asChild>{children}</TooltipTrigger>
				<TooltipContent side={side} className="text-xs">
					{label}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
