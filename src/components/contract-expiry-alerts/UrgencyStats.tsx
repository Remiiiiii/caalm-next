"use client";

import type React from "react";
import { Badge } from "@/components/ui/badge";

interface UrgencyStatsProps {
	stats: {
		expired: number;
		critical: number;
		warning: number;
		attention: number;
	};
}

export const UrgencyStats: React.FC<UrgencyStatsProps> = ({ stats }) => {
	return (
		<div className="flex items-center space-x-4 mt-3">
			{stats.expired > 0 && (
				<Badge className="text-xs bg-red text-white">
					{stats.expired} Expired
				</Badge>
			)}
			{stats.critical > 0 && (
				<Badge className="text-xs bg-red/20 text-red">
					{stats.critical} Critical
				</Badge>
			)}
			{stats.warning > 0 && (
				<Badge className="text-xs bg-orange/20 text-orange">
					{stats.warning} Warning
				</Badge>
			)}
			{stats.attention > 0 && (
				<Badge className="text-xs bg-gray-100 text-gray-800">
					{stats.attention} Attention
				</Badge>
			)}
		</div>
	);
};
