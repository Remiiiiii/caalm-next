"use client";

import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type CaalmChartPanelTone = "dark" | "light";

interface CaalmAnalyticsChartShellProps {
	title: string;
	subtitle?: string;
	children: ReactNode;
	className?: string;
	panelClassName?: string;
	/** Content aligned to the top-right of the title row (e.g. theme switch). */
	headerAction?: ReactNode;
	panelTone?: CaalmChartPanelTone;
}

/** Outer glass-card + inner analytics panel (dark by default). */
export function CaalmAnalyticsChartShell({
	title,
	subtitle,
	children,
	className,
	panelClassName,
	headerAction,
	panelTone = "dark",
}: CaalmAnalyticsChartShellProps) {
	const isLight = panelTone === "light";

	return (
		<Card className={cn("glass-card", className)}>
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6">
				<div className="mb-1 flex items-start justify-between gap-3">
					<h3 className="text-sm font-medium sidebar-gradient-text">{title}</h3>
					{headerAction ? (
						<div className="shrink-0 pt-0.5">{headerAction}</div>
					) : null}
				</div>
				{subtitle ? (
					<p className="mb-4 text-xs text-slate-600">{subtitle}</p>
				) : (
					<div className="mb-4" />
				)}
				<div
					className={cn(
						"rounded-xl p-3 sm:p-4",
						isLight
							? [
									"border border-slate-200 bg-white",
									"[&_.recharts-cartesian-axis-tick_text]:fill-slate-600",
									"[&_.recharts-legend-item-text]:fill-slate-700",
								]
							: [
									"border border-slate-800/80 bg-slate-900/95",
									"[&_.recharts-cartesian-axis-tick_text]:fill-slate-400",
									"[&_.recharts-legend-item-text]:fill-slate-300",
								],
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

export const CAALM_CHART_COLORS_LIGHT = {
	primary: "#0f5384",
	secondary: "#64748b",
	primaryGlow: "rgba(15, 83, 132, 0.28)",
	grid: "rgba(100, 116, 139, 0.22)",
	axis: "#475569",
	tooltipBg: "rgba(255, 255, 255, 0.98)",
	tooltipBorder: "rgba(148, 163, 184, 0.45)",
	donut: ["#0f5384", "#03AFBF", "#56B8FF", "#7C3AED", "#1E40AF"],
} as const;

export const darkChartTooltipStyle = {
	backgroundColor: CAALM_CHART_COLORS.tooltipBg,
	border: `1px solid ${CAALM_CHART_COLORS.tooltipBorder}`,
	borderRadius: 8,
	fontSize: 12,
	color: "#e2e8f0",
	boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
} as const;

export const lightChartTooltipStyle = {
	backgroundColor: CAALM_CHART_COLORS_LIGHT.tooltipBg,
	border: `1px solid ${CAALM_CHART_COLORS_LIGHT.tooltipBorder}`,
	borderRadius: 8,
	fontSize: 12,
	color: "#0f172a",
	boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
} as const;
