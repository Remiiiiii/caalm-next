"use client";

import { Filter } from "lucide-react";
import type React from "react";
import { CaalmFilterSelect } from "@/components/ui/CaalmFilterSelect";
import { FILTER_VALUES } from "./types";

const FILTER_OPTIONS = [
	{ value: String(FILTER_VALUES.THIRTY_DAYS), label: "30 days" },
	{ value: String(FILTER_VALUES.SIXTY_DAYS), label: "60 days" },
	{ value: String(FILTER_VALUES.NINETY_DAYS), label: "90 days" },
	{ value: String(FILTER_VALUES.SIX_MONTHS), label: "6 months" },
	{ value: String(FILTER_VALUES.ONE_YEAR), label: "1 year" },
	{ value: String(FILTER_VALUES.EXPIRED), label: "Expired" },
] as const;

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
	const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

	return (
		<div
			className={`flex items-center ${size === "sm" ? "gap-1" : "gap-2"} ${className}`}
			id={id}
		>
			<Filter className={`${iconSize} shrink-0 text-slate-600`} aria-hidden />
			<CaalmFilterSelect
				value={String(filterDays)}
				options={[...FILTER_OPTIONS]}
				ariaLabel="Filter contracts by time period"
				variant={size === "sm" ? "dock" : "filter"}
				onChange={(value) => onFilterChange(Number(value))}
			/>
		</div>
	);
};
