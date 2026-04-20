"use client";

import { Filter } from "lucide-react";
import type React from "react";
import { FILTER_VALUES } from "./types";

interface ContractFilterControlsProps {
	filterDays: number;
	onFilterChange: (value: number) => void;
	id: string;
	className?: string;
	size?: "sm" | "md";
}

export const ContractFilterControls: React.FC<ContractFilterControlsProps> = ({
	filterDays,
	onFilterChange,
	id,
	className = "",
	size = "md",
}) => {
	const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
	const selectClassName =
		size === "sm"
			? "text-xs border border-white/40 rounded px-2 py-1 bg-white/50 text-slate-600"
			: "text-xs border border-white/40 rounded px-2 py-1 bg-white/50";

	return (
		<div
			className={`flex items-center ${size === "sm" ? "gap-1" : "space-x-2"} ${className}`}
		>
			<Filter className={`${iconSize} text-slate-600`} />
			<label htmlFor={id} className="sr-only">
				Filter contracts by time period
			</label>
			<select
				id={id}
				value={filterDays}
				onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
					onFilterChange(Number(e.target.value))
				}
				aria-label="Filter contracts by time period"
				className={selectClassName}
			>
				<option value={FILTER_VALUES.THIRTY_DAYS}>30 days</option>
				<option value={FILTER_VALUES.SIXTY_DAYS}>60 days</option>
				<option value={FILTER_VALUES.NINETY_DAYS}>90 days</option>
				<option value={FILTER_VALUES.SIX_MONTHS}>6 months</option>
				<option value={FILTER_VALUES.ONE_YEAR}>1 year</option>
				<option value={FILTER_VALUES.EXPIRED}>Expired</option>
			</select>
		</div>
	);
};
