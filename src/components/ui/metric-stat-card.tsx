"use client";

import type { LucideIcon } from "lucide-react";
import type { ComponentType, KeyboardEvent, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
	StatCardIcon,
	type StatCardIconTone,
} from "@/components/ui/stat-card-icon";
import { cn } from "@/lib/utils";

export type MetricTone = StatCardIconTone;

export const COMPLIANCE_HEALTH_THRESHOLD = 80;

const VALUE_TONE: Record<MetricTone, string> = {
	default: "text-slate-700",
	warning: "text-orange",
	danger: "text-red",
	success: "text-green",
};

const DYNAMIC_TONE: Record<MetricTone, string> = {
	default: "text-slate-500",
	warning: "text-orange",
	danger: "text-red",
	success: "text-green",
};

export interface MetricStatCardProps {
	title: string;
	value: ReactNode;
	description?: ReactNode;
	icon: LucideIcon | ComponentType<{ className?: string; strokeWidth?: number }>;
	iconTone?: MetricTone;
	/** Status or trend icon to the left of the value — not the category icon. */
	dynamicIcon?: LucideIcon;
	dynamicTone?: MetricTone;
	valueTone?: MetricTone;
	className?: string;
	valueClassName?: string;
	interactive?: boolean;
	onClick?: () => void;
}

export function parseMetricPercent(
	value: string | number | null | undefined,
): number | null {
	if (value == null) return null;
	const n =
		typeof value === "number"
			? value
			: Number(String(value).replace("%", "").trim());
	return Number.isFinite(n) ? n : null;
}

/** How many records sit below a compliance-style rate. */
export function complianceNeedReviewCount(
	total: number,
	rate: string | number | null | undefined,
): number | null {
	const pct = parseMetricPercent(rate);
	if (pct == null || total <= 0) return null;
	return Math.max(0, total - Math.round((total * pct) / 100));
}

export function complianceMetricTone(
	rate: string | number | null | undefined,
): MetricTone {
	const pct = parseMetricPercent(rate);
	if (pct == null) return "default";
	if (pct < COMPLIANCE_HEALTH_THRESHOLD) return "danger";
	if (pct >= 95) return "success";
	return "default";
}

export function MetricStatCard({
	title,
	value,
	description,
	icon,
	iconTone = "default",
	dynamicIcon: DynamicIcon,
	dynamicTone = "default",
	valueTone = "default",
	className,
	valueClassName,
	interactive = false,
	onClick,
}: MetricStatCardProps) {
	const descriptionTone =
		valueTone === "default" ? "text-slate-600" : VALUE_TONE[valueTone];

	return (
		<Card
			className={cn(
				"glass-card h-full",
				interactive &&
					"interactive-glass-card cursor-pointer focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
				className,
			)}
			onClick={onClick}
			tabIndex={onClick ? 0 : undefined}
			role={onClick ? "button" : undefined}
			onKeyDown={
				onClick
					? (event: KeyboardEvent<HTMLDivElement>) => {
							if (event.key === "Enter" || event.key === " ") {
								event.preventDefault();
								onClick();
							}
						}
					: undefined
			}
		>
			<div className="glass-card-cap" />
			<CardContent className="mt-0! flex flex-col items-start px-4 pb-4 pt-6 text-left">
				<div className="flex items-center gap-2.5">
					<StatCardIcon icon={icon} tone={iconTone} />
					<p className="text-base font-semibold leading-snug sidebar-gradient-text">
						{title}
					</p>
				</div>
				<div
					className={cn(
						"flex items-center gap-2 pt-1.5 text-3xl font-bold tabular-nums",
						VALUE_TONE[valueTone],
						valueClassName,
					)}
				>
					{DynamicIcon ? (
						<DynamicIcon
							className={cn("h-4 w-4 shrink-0", DYNAMIC_TONE[dynamicTone])}
							strokeWidth={2}
							aria-hidden
						/>
					) : null}
					<span className="min-w-0">{value}</span>
				</div>
				{description ? (
					<div className={cn("mt-1 text-xs", descriptionTone)}>
						{description}
					</div>
				) : null}
			</CardContent>
		</Card>
	);
}
