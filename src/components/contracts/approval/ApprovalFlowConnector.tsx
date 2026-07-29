"use client";

import { cn } from "@/lib/utils";

interface ApprovalFlowConnectorProps {
	filled: boolean;
	current: boolean;
}

export default function ApprovalFlowConnector({
	filled,
	current,
}: ApprovalFlowConnectorProps) {
	return (
		<div
			className="flex h-full min-w-[28px] flex-1 items-center px-1 sm:min-w-[40px]"
			aria-hidden
		>
			<div
				className={cn(
					"h-1 w-full rounded-full transition-all duration-300",
					filled
						? "bg-[#0f5384]"
						: current
							? "bg-linear-to-r from-[#0f5384] to-slate-200 animate-pulse"
							: "bg-slate-200",
				)}
			/>
		</div>
	);
}
