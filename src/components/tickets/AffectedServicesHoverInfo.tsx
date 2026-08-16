"use client";

import { CheckCircle2, Info } from "lucide-react";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";

export function AffectedServicesHoverInfo({
	service,
}: {
	service: string;
}) {
	return (
		<HoverCard openDelay={120} closeDelay={80}>
			<HoverCardTrigger asChild>
				<button
					type="button"
					className="absolute top-3 right-3 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-slate-200/80 bg-white/70 text-slate-500 transition-colors duration-200 hover:border-blue/30 hover:text-[#0f5384] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
					aria-label="View affected services"
				>
					<Info className="h-3.5 w-3.5" />
				</button>
			</HoverCardTrigger>
			<HoverCardContent
				align="end"
				side="bottom"
				sideOffset={8}
				className="w-56 border-slate-200 bg-white/95 p-0 shadow-lg backdrop-blur-xl"
			>
				<p className="px-4 py-3 text-xs font-medium text-slate-500">
					Affected services
				</p>
				<div className="mx-4 border-t border-slate-200/80" />
				<div className="flex items-center gap-2 px-4 py-3">
					<CheckCircle2 className="h-[18px] w-[18px] shrink-0 text-green" />
					<span className="min-w-0 break-words text-sm text-slate-700">
						{service}
					</span>
				</div>
			</HoverCardContent>
		</HoverCard>
	);
}
