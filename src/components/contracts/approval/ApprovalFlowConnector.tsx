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
			className="flex h-full min-w-[40px] flex-1 items-center justify-center px-1 sm:min-w-[56px]"
			aria-hidden
		>
			<svg
				width="100%"
				height="100%"
				viewBox="0 0 24 24"
				fill="currentColor"
				xmlns="http://www.w3.org/2000/svg"
				className={cn(
					"h-7 w-10 max-w-full transition-colors duration-300 sm:h-8 sm:w-12",
					filled || current ? "text-[#0f5384]" : "text-slate-200",
					current && !filled && "animate-pulse",
				)}
			>
				<path d="M21 12L14 5V9H3.8C3.51997 9 3.37996 9 3.273 9.0545C3.17892 9.10243 3.10243 9.17892 3.0545 9.273C3 9.37996 3 9.51997 3 9.8V14.2C3 14.48 3 14.62 3.0545 14.727C3.10243 14.8211 3.17892 14.8976 3.273 14.9455C3.37996 15 3.51997 15 3.8 15H14V19L21 12Z" />
			</svg>
		</div>
	);
}
