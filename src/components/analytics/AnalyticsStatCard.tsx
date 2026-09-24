"use client";

import type { LucideIcon } from "lucide-react";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { MetricStatCard, type MetricTone } from "@/components/ui/metric-stat-card";

interface AnalyticsStatCardProps {
	title: string;
	value: string | number;
	description?: string;
	icon: LucideIcon;
	trend?: string;
	trendDirection?: "up" | "down" | "neutral";
	className?: string;
	onClick?: () => void;
}

export function AnalyticsStatCard({
	title,
	value,
	description,
	icon,
	trend,
	trendDirection,
	className,
	onClick,
}: AnalyticsStatCardProps) {
	const dynamicTone: MetricTone =
		trendDirection === "up"
			? "success"
			: trendDirection === "down"
				? "danger"
				: "default";
	const DynamicIcon =
		trendDirection === "up"
			? TrendingUp
			: trendDirection === "down"
				? TrendingDown
				: trend
					? Minus
					: undefined;

	return (
		<MetricStatCard
			title={title}
			value={value}
			description={
				trend ? (
					<span>
						{description ? `${description} · ` : ""}
						{trend}
					</span>
				) : (
					description
				)
			}
			icon={icon}
			dynamicIcon={DynamicIcon}
			dynamicTone={dynamicTone}
			className={className}
			interactive={Boolean(onClick)}
			onClick={onClick}
		/>
	);
}
