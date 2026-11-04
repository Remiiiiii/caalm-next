"use client";

import { Download, PanelRightClose, SquarePen } from "lucide-react";
import AssistantSegmentedTabs, {
	type AssistantSheetTab,
} from "@/components/assistant/AssistantSegmentedTabs";
import { BusyIcon } from "@/components/ui/busy-icon";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

export default function AssistantSheetHeader({
	tab,
	onTabChange,
	onDownload,
	downloading,
	canDownload,
	onNewChat,
	onClose,
}: {
	tab: AssistantSheetTab;
	onTabChange: (tab: AssistantSheetTab) => void;
	onDownload: () => void;
	downloading: boolean;
	canDownload: boolean;
	onNewChat: () => void;
	onClose: () => void;
}) {
	return (
		<div className="flex items-center justify-between gap-2">
			<div className="min-w-0">
				<p className="mb-2 text-sm font-semibold sidebar-gradient-text">
					Ask CAALM
				</p>
				<AssistantSegmentedTabs value={tab} onChange={onTabChange} />
			</div>
			<TooltipProvider delayDuration={200}>
				<div className="flex items-center gap-0.5">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="h-8 w-8 cursor-pointer text-slate-600 hover:bg-slate-100 hover:text-slate-700"
								aria-label="Download chat"
								disabled={!canDownload || downloading}
								onClick={onDownload}
							>
								<BusyIcon busy={downloading} icon={Download} />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="bottom">Download chat</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="h-8 w-8 cursor-pointer text-slate-600 hover:bg-slate-100 hover:text-slate-700"
								aria-label="Start new chat"
								onClick={onNewChat}
							>
								<SquarePen className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="bottom">Start new chat</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="h-8 w-8 cursor-pointer text-slate-600 hover:bg-slate-100 hover:text-slate-700"
								aria-label="Hide chat window"
								onClick={onClose}
							>
								<PanelRightClose className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="bottom">Hide</TooltipContent>
					</Tooltip>
				</div>
			</TooltipProvider>
		</div>
	);
}
