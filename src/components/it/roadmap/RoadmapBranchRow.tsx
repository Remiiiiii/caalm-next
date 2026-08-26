"use client";

import { Check, Copy, GitBranch } from "lucide-react";
import { useState } from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const COPIED_MS = 2000;

type Props = {
	branch: string;
};

export function RoadmapBranchRow({ branch }: Props) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(branch);
			setCopied(true);
			window.setTimeout(() => setCopied(false), COPIED_MS);
		} catch {
			setCopied(false);
		}
	};

	return (
		<div className="text-xs text-slate-600 tabular-nums flex items-center gap-1.5 min-w-0">
			<GitBranch
				className="h-3.5 w-3.5 text-[#0f5384] shrink-0"
				aria-hidden
			/>
			<span className="min-w-0 truncate">{branch}</span>
			<TooltipProvider>
				<Tooltip open={copied}>
					<TooltipTrigger asChild>
						<button
							type="button"
							onClick={() => void handleCopy()}
							className={cn(
								"shrink-0 rounded p-0.5 text-slate-500 cursor-pointer transition-colors duration-200",
								"hover:text-[#0f5384] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
								copied && "text-green",
							)}
							aria-label={copied ? "Branch copied" : "Copy branch name"}
						>
							{copied ? (
								<Check className="h-3.5 w-3.5" aria-hidden />
							) : (
								<Copy className="h-3.5 w-3.5" aria-hidden />
							)}
						</button>
					</TooltipTrigger>
					<TooltipContent side="top" className="text-xs">
						Copied!
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		</div>
	);
}
