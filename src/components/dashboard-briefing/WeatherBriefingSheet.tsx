"use client";

import { PanelRightClose } from "lucide-react";
import useSWR from "swr";
import { BriefingNewsIcon } from "@/components/dashboard-briefing/BriefingNewsIcon";
import { MarketsCard } from "@/components/dashboard-briefing/MarketsCard";
import { MsnNewsCards } from "@/components/dashboard-briefing/MsnNewsCards";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeaderIcon,
	SheetTitle,
} from "@/components/ui/sheet";
import WeatherWidget from "@/components/WeatherWidget";
import { cn } from "@/lib/utils";
import type { BriefingResponse } from "@/types/briefing";

type WeatherBriefingSheetProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	location?: string;
	latitude?: number;
	longitude?: number;
};

async function briefingFetcher(url: string): Promise<BriefingResponse> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error("Failed to load briefing");
	}
	return response.json();
}

export function WeatherBriefingSheet({
	open,
	onOpenChange,
	location,
	latitude,
	longitude,
}: WeatherBriefingSheetProps) {
	const { data, isLoading } = useSWR(
		open ? "/api/briefing?v=15" : null,
		briefingFetcher,
		{
			revalidateOnFocus: true,
			refreshInterval: 60 * 1000,
			dedupingInterval: 15 * 1000,
		},
	);

	return (
		<Sheet open={open} onOpenChange={onOpenChange} modal={false}>
			<SheetContent
				side="right"
				showOverlay={false}
				onInteractOutside={(e) => e.preventDefault()}
				className={cn(
					"flex w-full flex-col gap-0 overflow-visible border-0 bg-transparent p-0 shadow-none backdrop-blur-none",
					"sm:max-w-md",
					"inset-y-auto! top-4! right-4! bottom-4! h-[calc(100vh-2rem)]! max-h-none!",
					"transition-none! duration-200! ease-out!",
					"data-[state=open]:duration-200! data-[state=closed]:duration-200!",
					"data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
					"data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
					"pointer-events-auto",
				)}
				showCloseButton={false}
			>
				<div
					className="glass-card-frosted relative flex h-full w-full flex-col overflow-hidden rounded-2xl"
					style={{ background: "rgba(255, 255, 255, 0.92)" }}
				>
					<div className="glass-card-cap rounded-t-2xl!" />

					<SheetTitle className="sr-only">Weather briefing</SheetTitle>

					<div className="mt-4 flex shrink-0 items-center justify-between gap-2 px-4 pb-3 pt-1">
						<div className="flex items-center gap-3">
							<SheetHeaderIcon>
								<BriefingNewsIcon className="h-5 w-auto" />
							</SheetHeaderIcon>
							<h2 className="text-xl font-semibold sidebar-gradient-text">
								Briefing
							</h2>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-8 w-8 cursor-pointer text-slate-600 hover:bg-white/50 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
							aria-label="Hide briefing"
							onClick={() => onOpenChange(false)}
						>
							<PanelRightClose className="h-4 w-4" />
						</Button>
					</div>

					<div className="glass-dialog-scroll-area min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-3">
						<WeatherWidget
							location={location}
							latitude={latitude}
							longitude={longitude}
							embedded
						/>
						<MsnNewsCards
							news={data?.news ?? []}
							loading={isLoading && !data}
						/>
						<MarketsCard
							markets={data?.markets ?? []}
							loading={isLoading && !data}
						/>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
