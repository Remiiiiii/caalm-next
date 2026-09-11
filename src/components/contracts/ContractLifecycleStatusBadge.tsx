"use client";

import { getContractLifecycleDisplay } from "@/lib/contracts/contractLifecycleDisplay";
import { cn } from "@/lib/utils";
import type { UIFileDoc } from "@/types/files";

interface ContractLifecycleStatusBadgeProps {
	file: UIFileDoc;
	clickable?: boolean;
	onClick?: () => void;
}

export function ContractLifecycleStatusBadge({
	file,
	clickable = false,
	onClick,
}: ContractLifecycleStatusBadgeProps) {
	const display = getContractLifecycleDisplay(file);
	const pillClass = cn(
		"inline-block px-2 py-0.5 text-xs rounded-full font-medium border",
		display.className,
		clickable &&
			"cursor-pointer transition-all duration-200 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
	);

	const pill = clickable ? (
		<button
			type="button"
			className={pillClass}
			onClick={(e) => {
				e.stopPropagation();
				onClick?.();
			}}
			aria-label={`Open approval workflow for ${file.contractName || file.name || "contract"}`}
		>
			{display.label}
		</button>
	) : (
		<span className={pillClass}>{display.label}</span>
	);

	return (
		<div className="flex flex-col items-start gap-0.5 min-w-0">
			<div className="flex items-center gap-1.5 flex-wrap">
				{pill}
				{display.stuck ? (
					<span className="inline-block px-2 py-0.5 text-xs rounded-full font-medium border bg-red/10 text-red border-red/20">
						Stuck &gt;3 days
					</span>
				) : null}
			</div>
			{display.subtext ? (
				<span className="text-[10px] text-slate-500 leading-tight">
					{display.subtext}
				</span>
			) : null}
		</div>
	);
}
