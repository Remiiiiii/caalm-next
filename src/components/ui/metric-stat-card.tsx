"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
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

const TITLE_TONE: Record<MetricTone, string> = {
	default: "sidebar-gradient-text",
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

const BORDER_TONE: Record<MetricTone, string> = {
	default: "",
	warning: "border-orange/40",
	danger: "border-red/40",
	success: "border-green/30",
};

export interface MetricStatCardProps {
	title: string;
	value: ReactNode;
	description?: ReactNode;
	/** Extra content under the description (breakdown bar, sparkline, CTA). */
	footer?: ReactNode;
	icon: LucideIcon | ComponentType<{ className?: string; strokeWidth?: number }>;
	iconTone?: MetricTone;
	titleTone?: MetricTone;
	/** Soft border accent — use for urgent cards (e.g. low compliance). */
	borderTone?: MetricTone;
	/** Status or trend icon to the left of the value — not the category icon. */
	dynamicIcon?: LucideIcon;
	dynamicTone?: MetricTone;
	valueTone?: MetricTone;
	className?: string;
	valueClassName?: string;
	interactive?: boolean;
	onClick?: () => void;
	/** Optional top-right navigate control (stops card onClick bubbling). */
	headerHref?: string;
	headerHrefLabel?: string;
	headerHrefIcon?: LucideIcon;
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

export interface MetricSegment {
	key: string;
	label: string;
	count: number;
	/** Tailwind bg class, e.g. `bg-green` */
	colorClass: string;
	/** Tailwind text class for the legend dot/label */
	textClass: string;
}

/** Proportional status/role bar with a matching legend. */
export function MetricSegmentBar({
	segments,
	className,
	formatValue,
}: {
	segments: MetricSegment[];
	className?: string;
	/** Optional legend formatter (e.g. dollars). Defaults to the raw count. */
	formatValue?: (count: number) => string;
}) {
	const total = segments.reduce((sum, s) => sum + Math.max(0, s.count), 0);
	const visible = segments.filter((s) => s.count > 0);
	const labelFor = (count: number) =>
		formatValue ? formatValue(count) : String(count);

	return (
		<div className={cn("w-full space-y-2", className)}>
			<div
				className="flex h-2 w-full overflow-hidden rounded-full bg-slate-200"
				role="img"
				aria-label={segments
					.map((s) => `${s.label} ${labelFor(s.count)}`)
					.join(", ")}
			>
				{total === 0 ? (
					<div className="h-full w-full bg-slate-200" />
				) : (
					visible.map((segment) => (
						<div
							key={segment.key}
							className={cn(
								"h-full min-w-[3px] transition-all duration-200",
								segment.colorClass,
							)}
							style={{ width: `${(segment.count / total) * 100}%` }}
							title={`${segment.label}: ${labelFor(segment.count)}`}
						/>
					))
				)}
			</div>
			<div className="flex flex-wrap gap-x-3 gap-y-1">
				{segments.map((segment) => (
					<span
						key={segment.key}
						className={cn(
							"inline-flex items-center gap-1.5 text-[11px] tabular-nums",
							segment.textClass,
						)}
					>
						<span
							className={cn(
								"h-1.5 w-1.5 shrink-0 rounded-full",
								segment.colorClass,
							)}
							aria-hidden
						/>
						{segment.label} — {labelFor(segment.count)}
					</span>
				))}
			</div>
		</div>
	);
}

/**
 * Zero-state flat sparkline (same idea as the risk-averted tracking line when
 * nothing moved): a quiet horizontal run with a terminal dot so "0" reads as
 * healthy silence, not a broken chart.
 */
export function MetricFlatSparkline({
	className,
	tone = "success",
}: {
	className?: string;
	tone?: "success" | "default";
}) {
	const line =
		tone === "success" ? "bg-green" : "bg-[#0f5384]";
	const ring =
		tone === "success" ? "border-green" : "border-[#0f5384]";

	return (
		<div
			className={cn("relative h-3 w-full max-w-[9rem]", className)}
			aria-hidden
		>
			<div
				className={cn(
					"absolute left-0 right-1.5 top-1/2 h-[2px] -translate-y-1/2 rounded-full opacity-80",
					line,
				)}
			/>
			<div
				className={cn(
					"absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 bg-white",
					ring,
				)}
			/>
		</div>
	);
}

/** Small circular progress for rates (e.g. compliance %). */
export function MetricProgressRing({
	percent,
	tone = "danger",
	size = 44,
	stroke = 4,
	className,
}: {
	percent: number;
	tone?: MetricTone;
	size?: number;
	stroke?: number;
	className?: string;
}) {
	const r = (size - stroke) / 2;
	const c = 2 * Math.PI * r;
	const pct = Math.max(0, Math.min(100, percent));
	const offset = c * (1 - pct / 100);
	const strokeColor =
		tone === "danger"
			? "#fe8787"
			: tone === "warning"
				? "#ebc620"
				: tone === "success"
					? "#3dd9b3"
					: "#0f5384";
	const trackColor =
		tone === "danger"
			? "rgba(254, 135, 135, 0.22)"
			: "rgba(15, 83, 132, 0.14)";

	return (
		<svg
			width={size}
			height={size}
			className={cn("-rotate-90 shrink-0", className)}
			aria-hidden
		>
			<circle
				cx={size / 2}
				cy={size / 2}
				r={r}
				fill="none"
				stroke={trackColor}
				strokeWidth={stroke}
			/>
			<circle
				cx={size / 2}
				cy={size / 2}
				r={r}
				fill="none"
				stroke={strokeColor}
				strokeWidth={stroke}
				strokeLinecap="round"
				strokeDasharray={c}
				strokeDashoffset={offset}
			/>
		</svg>
	);
}

export function MetricReviewLink({
	href,
	children,
	className,
}: {
	href: string;
	children: ReactNode;
	className?: string;
}) {
	return (
		<Link
			href={href}
			className={cn(
				"inline-flex items-center gap-0.5 text-xs font-semibold text-red transition-colors duration-200 hover:text-red/80",
				className,
			)}
			onClick={(event) => event.stopPropagation()}
		>
			{children}
			<span aria-hidden>›</span>
		</Link>
	);
}

export function MetricStatCard({
	title,
	value,
	description,
	footer,
	icon,
	iconTone = "default",
	titleTone = "default",
	borderTone = "default",
	dynamicIcon: DynamicIcon,
	dynamicTone = "default",
	valueTone = "default",
	className,
	valueClassName,
	interactive = false,
	onClick,
	headerHref,
	headerHrefLabel,
	headerHrefIcon: HeaderHrefIcon,
}: MetricStatCardProps) {
	const descriptionTone =
		valueTone === "default" ? "text-slate-600" : VALUE_TONE[valueTone];

	return (
		<Card
			className={cn(
				"glass-card h-full",
				borderTone !== "default" && BORDER_TONE[borderTone],
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
			<CardContent className="mt-0! relative flex h-full flex-col items-start px-4 pb-4 pt-6 text-left">
				{headerHref && HeaderHrefIcon ? (
					<Link
						href={headerHref}
						aria-label={headerHrefLabel || `Open ${title}`}
						className="absolute top-4 right-3 z-10 rounded-md p-1 text-[#0f5384] transition-colors duration-200 hover:bg-blue/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
						onClick={(event) => event.stopPropagation()}
					>
						<HeaderHrefIcon className="h-4 w-4" aria-hidden />
					</Link>
				) : null}
				<div className="flex items-center gap-2.5 pr-7">
					<StatCardIcon icon={icon} tone={iconTone} />
					<p
						className={cn(
							"text-base font-semibold leading-snug",
							TITLE_TONE[titleTone],
						)}
					>
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
				{footer ? <div className="mt-auto w-full pt-3">{footer}</div> : null}
			</CardContent>
		</Card>
	);
}
