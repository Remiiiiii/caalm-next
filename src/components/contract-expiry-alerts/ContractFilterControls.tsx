"use client";

import { Filter } from "lucide-react";
import type React from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { FILTER_VALUES } from "./types";

const FILTER_OPTIONS = [
	{ value: FILTER_VALUES.THIRTY_DAYS, label: "30 days" },
	{ value: FILTER_VALUES.SIXTY_DAYS, label: "60 days" },
	{ value: FILTER_VALUES.NINETY_DAYS, label: "90 days" },
	{ value: FILTER_VALUES.SIX_MONTHS, label: "6 months" },
	{ value: FILTER_VALUES.ONE_YEAR, label: "1 year" },
	{ value: FILTER_VALUES.EXPIRED, label: "Expired" },
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
	const triggerClassName =
		size === "sm"
			? "h-7 w-auto min-w-0 shrink-0 rounded-md px-2! py-0! text-xs shadow-none [&_svg]:h-3 [&_svg]:w-3"
			: "h-10 w-44 shrink-0";

	return (
		<div
			className={`flex items-center ${size === "sm" ? "gap-1" : "gap-2"} ${className}`}
		>
			<Filter className={`${iconSize} shrink-0 text-slate-600`} aria-hidden />
			<Select
				value={String(filterDays)}
				onValueChange={(value) => onFilterChange(Number(value))}
			>
				<SelectTrigger
					id={id}
					aria-label="Filter contracts by time period"
					className={triggerClassName}
				>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{FILTER_OPTIONS.map((option) => (
						<SelectItem key={option.value} value={String(option.value)}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
};
