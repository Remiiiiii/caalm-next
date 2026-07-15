"use client";

import {
	Printer,
	RefreshCw,
	Settings,
	Share2,
	SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";

interface CalendarFiltersDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	outlookConnected: boolean;
	syncing: boolean;
	onShare: () => void;
	onPrint: () => void;
	onSettings: () => void;
	onSync: () => void;
}

export function CalendarFiltersDrawer({
	open,
	onOpenChange,
	outlookConnected,
	syncing,
	onShare,
	onPrint,
	onSettings,
	onSync,
}: CalendarFiltersDrawerProps) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="w-full sm:max-w-md p-0 flex flex-col border-l border-slate-200"
			>
				<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70" />
				<SheetHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 py-4 border-b border-slate-200 mt-4 px-6 text-left">
					<div className="flex items-center gap-3">
						<SlidersHorizontal className="w-5 h-5 text-[#0f5384]" />
						<SheetTitle className="text-xl font-semibold sidebar-gradient-text">
							Manage calendar
						</SheetTitle>
					</div>
					<SheetDescription className="text-sm text-slate-600 mt-1 ml-8">
						Share, print, settings, and Outlook sync
					</SheetDescription>
				</SheetHeader>

				<div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-2">
					<Button
						variant="outline"
						className="w-full justify-start gap-2 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
						onClick={() => {
							onShare();
							onOpenChange(false);
						}}
					>
						<Share2 className="h-4 w-4 text-[#0f5384]" />
						Share calendar
					</Button>
					<Button
						variant="outline"
						className="w-full justify-start gap-2 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
						onClick={() => {
							onPrint();
							onOpenChange(false);
						}}
					>
						<Printer className="h-4 w-4 text-[#0f5384]" />
						Print
					</Button>
					<Button
						variant="outline"
						className="w-full justify-start gap-2 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
						onClick={() => {
							onSettings();
							onOpenChange(false);
						}}
					>
						<Settings className="h-4 w-4 text-[#0f5384]" />
						Settings
					</Button>
					{outlookConnected && (
						<Button
							variant="outline"
							className="w-full justify-start gap-2 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
							disabled={syncing}
							onClick={() => {
								onSync();
								onOpenChange(false);
							}}
						>
							<RefreshCw
								className={`h-4 w-4 text-[#0f5384] ${syncing ? "animate-spin" : ""}`}
							/>
							{syncing ? "Syncing..." : "Sync Outlook"}
						</Button>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}

export default CalendarFiltersDrawer;
