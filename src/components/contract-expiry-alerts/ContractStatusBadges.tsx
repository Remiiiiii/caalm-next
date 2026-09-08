"use client";

import { AlertTriangle, Bell } from "lucide-react";
import type React from "react";
import { FILTER_VALUES } from "./types";

interface ContractStatusBadgesProps {
	expiringCount: number;
	expiredCount: number;
	filterDays: number;
	isPlaying?: boolean;
	size?: "sm" | "md";
}

export const ContractStatusBadges: React.FC<ContractStatusBadgesProps> = ({
	expiringCount,
	expiredCount,
	filterDays,
	size = "md",
}) => {
	const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
	const textSize = size === "sm" ? "text-xs" : "text-sm";

	return (
		<div className="flex items-center gap-2" role="status" aria-live="polite">
			{expiringCount > 0 && filterDays !== FILTER_VALUES.EXPIRED && (
				<div className="flex items-center gap-1">
					<Bell
						className={`${iconSize} shrink-0 animate-pulse text-[#E86A1A]`}
					/>
					<span
						className={`${textSize} font-semibold tabular-nums animate-pulse text-[#E86A1A]`}
					>
						{expiringCount}
					</span>
					<span
						className={`${textSize} font-semibold animate-pulse text-[#E86A1A]`}
					>
						expiring
					</span>
				</div>
			)}
			{expiredCount > 0 && (
				<div className="flex items-center gap-1">
					<AlertTriangle className={`${iconSize} text-red shrink-0`} />
					<span className={`${textSize} text-red font-medium tabular-nums`}>
						{expiredCount}
					</span>
					<span className={`${textSize} text-red font-medium`}>expired</span>
				</div>
			)}
		</div>
	);
};
