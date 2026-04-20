"use client";

import { Calendar } from "lucide-react";
import type React from "react";
import { getEmptyStateMessage } from "./types";

interface ContractEmptyStateProps {
	filterDays: number;
	variant?: "compact" | "full";
}

export const ContractEmptyState: React.FC<ContractEmptyStateProps> = ({
	filterDays,
	variant = "full",
}) => {
	const message = getEmptyStateMessage(filterDays);

	if (variant === "compact") {
		return (
			<div className="text-center py-6 flex-1 flex flex-col items-center justify-center">
				<Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
				<p className="text-sm text-slate-500 mb-1">{message.title}</p>
				<p className="text-xs text-slate-400">{message.subtitle}</p>
			</div>
		);
	}

	// Full variant
	return (
		<div className="text-center py-8">
			<Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
			<p className="text-gray-500 text-sm">{message.title}</p>
			<p className="text-gray-400 text-xs mt-1">{message.subtitle}</p>
		</div>
	);
};
