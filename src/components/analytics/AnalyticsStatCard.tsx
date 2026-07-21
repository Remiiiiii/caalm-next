"use client";

import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
	icon: Icon,
	trend,
	trendDirection,
	className,
	onClick,
}: AnalyticsStatCardProps) {
	const trendColor =
		trendDirection === "up"
			? "text-green"
			: trendDirection === "down"
				? "text-red"
				: "text-slate-600";

	return (
		<Card
			className={cn(
				"glass-card",
				onClick && "interactive-glass-card cursor-pointer",
				className,
			)}
			onClick={onClick}
			tabIndex={onClick ? 0 : undefined}
			role={onClick ? "button" : undefined}
			onKeyDown={
				onClick
					? (e) => {
							if (e.key === "Enter" || e.key === " ") onClick();
						}
					: undefined
			}
		>
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-sm font-medium sidebar-gradient-text">{title}</p>
						<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
							<span>{value}</span>
							<span className="inline-block ml-2 pb-1">
								<Icon className="h-8 w-8 text-slate-600" />
							</span>
						</div>
						{description ? (
							<p className="text-xs text-slate-600 mt-1">{description}</p>
						) : null}
						{trend ? (
							<p className={cn("text-xs mt-1", trendColor)}>{trend}</p>
						) : null}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
