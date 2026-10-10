"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
	type ComponentType,
	type KeyboardEvent,
	type ReactNode,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
	StatCardIcon,
	type StatCardIconTone,
} from "@/components/ui/stat-card-icon";
import { cn } from "@/lib/utils";

function usePrefersReducedMotion() {
	const [reduced, setReduced] = useState(false);
	useEffect(() => {
		const media = window.matchMedia("(prefers-reduced-motion: reduce)");
		setReduced(media.matches);
		const onChange = () => setReduced(media.matches);
		media.addEventListener("change", onChange);
		return () => media.removeEventListener("change", onChange);
	}, []);
	return reduced;
}

/**
 * Stay idle until enough of the element is in the *main* viewport, then fire once.
 * Bottom rootMargin ignores the lower band so a card peeking under the hero
 * while you read Risk averted does not start count-ups / bars off-screen.
 * (react-countup's enableScrollSpy still starts on mount — gate CountUp with this.)
 */
export function useInViewReady(resetKey: string | number = "in-view") {
	const reduced = usePrefersReducedMotion();
	const ref = useRef<HTMLDivElement | null>(null);
	const [inView, setInView] = useState(false);

	useEffect(() => {
		setInView(false);
	}, [resetKey]);

	useEffect(() => {
		if (reduced) {
			setInView(true);
			return;
		}
		const el = ref.current;
		if (!el) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) {
					setInView(true);
					observer.disconnect();
				}
			},
			// Half the element must sit above the bottom 28% of the viewport.
			{ threshold: 0.5, rootMargin: "0px 0px -28% 0px" },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [reduced, resetKey]);

	return { ref, ready: reduced || inView };
}

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

/** Decorative fill behind metric card content (below the glass cap). */
export type MetricStatBackdrop = "dots" | "radial" | "wave" | "none";

export interface MetricStatCardProps {
	title: string;
	value: ReactNode;
	description?: ReactNode;
	/** Extra content under the description (breakdown bar, sparkline, CTA). */
	footer?: ReactNode;
	icon:
		| LucideIcon
		| ComponentType<{ className?: string; strokeWidth?: number }>;
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
	/** Background motif under the content. Defaults to the fading dot grid. */
	backdrop?: MetricStatBackdrop;
	/** Large faded icon watermark (bottom-right), e.g. Active users card. */
	watermarkIcon?: LucideIcon;
}

/** Soft slate gray for dots / radial / wave (not brand blue). */
const METRIC_BACKDROP_INK = "148, 163, 184";

/** Dot matrix; strongest bottom-right, fades toward top-left. */
function MetricBackdropDots() {
	return (
		<div
			className="pointer-events-none absolute inset-x-0 bottom-0 top-4 z-0"
			aria-hidden
			style={{
				backgroundImage: `radial-gradient(circle, rgba(${METRIC_BACKDROP_INK}, 0.1) 1.25px, transparent 1.75px)`,
				backgroundSize: "16px 16px",
				maskImage:
					"linear-gradient(315deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 48%, transparent 82%)",
				WebkitMaskImage:
					"linear-gradient(315deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 48%, transparent 82%)",
			}}
		/>
	);
}

/** Concentric rings anchored top-right, with a small accent bead on one ring. */
function MetricBackdropRadial() {
	// Accent at ~11 o'clock on the r=72 ring (center 160, 36).
	const cx = 160;
	const cy = 36;
	const accentR = 72;
	const accentAngle = (-120 * Math.PI) / 180;
	const accentX = cx + accentR * Math.cos(accentAngle);
	const accentY = cy + accentR * Math.sin(accentAngle);

	return (
		<div
			className="pointer-events-none absolute inset-x-0 bottom-0 top-4 z-0 overflow-hidden"
			aria-hidden
		>
			<svg
				className="absolute -right-6 -top-8 h-[13.5rem] w-[13.5rem]"
				viewBox="0 0 200 200"
				fill="none"
			>
				{[28, 50, 72, 94, 116].map((r) => (
					<circle
						key={r}
						cx={cx}
						cy={cy}
						r={r}
						stroke={`rgba(${METRIC_BACKDROP_INK}, 0.08)`}
						strokeWidth="1"
					/>
				))}
				<circle
					cx={accentX}
					cy={accentY}
					r="3.5"
					fill={`rgba(${METRIC_BACKDROP_INK}, 0.1)`}
				/>
			</svg>
		</div>
	);
}

/** Soft brand-blue wave from bottom-left toward top-right. */
function MetricBackdropWave() {
	return (
		<div
			className="pointer-events-none absolute inset-x-0 bottom-0 top-4 z-0 overflow-hidden"
			aria-hidden
		>
			<svg
				className="absolute inset-0 h-full w-full"
				viewBox="0 0 400 240"
				preserveAspectRatio="none"
			>
				<path
					d="M-30 210 C 40 150, 90 230, 160 150 S 260 40, 330 20 S 400 -10, 450 -20 L 450 80 C 390 90, 340 140, 280 155 S 160 200, 90 185 S 10 200, -30 230 Z"
					fill={`rgba(${METRIC_BACKDROP_INK}, 0.06)`}
				/>
				<path
					d="M-40 230 C 50 170, 110 240, 190 165 S 300 55, 380 35 L 420 55 C 340 90, 280 170, 200 185 S 70 210, -40 245 Z"
					fill={`rgba(${METRIC_BACKDROP_INK}, 0.04)`}
				/>
			</svg>
		</div>
	);
}

function MetricBackdrop({ variant }: { variant: MetricStatBackdrop }) {
	if (variant === "none") return null;
	if (variant === "radial") return <MetricBackdropRadial />;
	if (variant === "wave") return <MetricBackdropWave />;
	return <MetricBackdropDots />;
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
	/** Legend labels use slate-500 (same family as the title divider). */
	legendMuted = false,
}: {
	segments: MetricSegment[];
	className?: string;
	/** Optional legend formatter (e.g. dollars). Defaults to the raw count. */
	formatValue?: (count: number) => string;
	legendMuted?: boolean;
}) {
	const total = segments.reduce((sum, s) => sum + Math.max(0, s.count), 0);
	const visible = segments.filter((s) => s.count > 0);
	const labelFor = (count: number) =>
		formatValue ? formatValue(count) : String(count);
	const resetKey = segments.map((s) => `${s.key}:${s.count}`).join("|");
	const { ref, ready } = useInViewReady(resetKey);

	return (
		<div ref={ref} className={cn("w-full space-y-2", className)}>
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
								"h-full min-w-0 transition-[width] duration-[1200ms] ease-out",
								segment.colorClass,
							)}
							style={{
								width: ready ? `${(segment.count / total) * 100}%` : "0%",
							}}
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
							legendMuted ? "text-slate-500" : segment.textClass,
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
	const line = tone === "success" ? "bg-green" : "bg-[#0f5384]";
	const ring = tone === "success" ? "border-green" : "border-[#0f5384]";

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
	const { ref, ready } = useInViewReady(pct);
	const offset = ready ? c * (1 - pct / 100) : c;
	const strokeColor =
		tone === "danger"
			? "#fe8787"
			: tone === "warning"
				? "#ebc620"
				: tone === "success"
					? "#3dd9b3"
					: "#0f5384";
	const trackColor =
		tone === "danger" ? "rgba(254, 135, 135, 0.22)" : "rgba(15, 83, 132, 0.14)";

	return (
		<div ref={ref} className={cn("inline-flex shrink-0", className)}>
			<svg width={size} height={size} className="-rotate-90" aria-hidden>
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
					style={{
						transition: "stroke-dashoffset 1.2s ease-out",
					}}
				/>
			</svg>
		</div>
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
	backdrop = "dots",
	watermarkIcon: WatermarkIcon,
}: MetricStatCardProps) {
	const descriptionTone =
		valueTone === "default" ? "text-slate-600" : VALUE_TONE[valueTone];
	const watermarkGradId = useId().replace(/:/g, "");

	return (
		<Card
			className={cn(
				"glass-card relative h-full overflow-hidden",
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
			<MetricBackdrop variant={backdrop} />
			{WatermarkIcon ? (
				<div
					className="pointer-events-none absolute -bottom-6 -right-6 z-0 h-44 w-44 -rotate-45"
					aria-hidden
				>
					<svg width="0" height="0" className="absolute">
						<defs>
							<linearGradient
								id={watermarkGradId}
								x1="0%"
								y1="0%"
								x2="100%"
								y2="100%"
							>
								<stop offset="0%" stopColor="#078FAB" stopOpacity="0.22" />
								<stop offset="55%" stopColor="#0f5384" stopOpacity="0.1" />
								<stop offset="100%" stopColor="#078FAB" stopOpacity="0.04" />
							</linearGradient>
						</defs>
					</svg>
					<WatermarkIcon
						className="h-full w-full"
						strokeWidth={1.75}
						stroke={`url(#${watermarkGradId})`}
						fill="none"
					/>
				</div>
			) : null}
			<CardContent className="relative z-10 mt-4 flex h-full flex-col items-start px-4 pb-6 pt-6 text-left">
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
				<div className="flex w-full items-center gap-2.5 border-b border-slate-200 pb-3 pr-7">
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
						"flex items-center gap-2 pt-3 text-3xl font-bold tabular-nums",
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
				{/* Keep footer under the value — do not mt-auto (that pinned it to the card bottom). */}
				{footer ? <div className="w-full pt-3">{footer}</div> : null}
			</CardContent>
		</Card>
	);
}
