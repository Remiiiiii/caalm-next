"use client";

import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CaalmAnalyticsChartShellProps {
	title: string;
	subtitle?: string;
	children: ReactNode;
	className?: string;
	panelClassName?: string;
}

/** Outer glass-card + dark inner panel for Revenue-vs-orders style analytics charts. */
export function CaalmAnalyticsChartShell({
	title,
	subtitle,
	children,
	className,
	panelClassName,
}: CaalmAnalyticsChartShellProps) {
	return (
		<Card className={cn("glass-card", className)}>
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6">
				<h3 className="mb-1 text-sm font-medium sidebar-gradient-text">
					{title}
				</h3>
				{subtitle ? (
					<p className="mb-4 text-xs text-slate-600">{subtitle}</p>
				) : (
					<div className="mb-4" />
				)}
				<div
					className={cn(
						"rounded-xl border border-slate-800/80 bg-slate-900/95 p-3 sm:p-4",
						"[&_.recharts-cartesian-axis-tick_text]:fill-slate-400",
						"[&_.recharts-legend-item-text]:fill-slate-300",
						panelClassName,
					)}
				>
					{children}
				</div>
			</CardContent>
		</Card>
	);
}

export const CAALM_CHART_COLORS = {
	primary: "#03AFBF",
	secondary: "#64748b",
	primaryGlow: "rgba(3, 175, 191, 0.35)",
	grid: "rgba(148, 163, 184, 0.15)",
	axis: "#94a3b8",
	tooltipBg: "rgba(15, 23, 42, 0.95)",
	tooltipBorder: "rgba(148, 163, 184, 0.35)",
	donut: ["#03AFBF", "#0f5384", "#56B8FF", "#7C3AED", "#1E40AF"],
} as const;

export const darkChartTooltipStyle = {
	backgroundColor: CAALM_CHART_COLORS.tooltipBg,
	border: `1px solid ${CAALM_CHART_COLORS.tooltipBorder}`,
	borderRadius: 8,
	fontSize: 12,
	color: "#e2e8f0",
	boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
} as const;
