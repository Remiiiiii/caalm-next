"use client";

import {
	type ButtonHTMLAttributes,
	type ReactNode,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { cn } from "@/lib/utils";

type BadgeElement = HTMLDivElement | HTMLButtonElement;

interface ShimmerBadgeProps {
	children: ReactNode;
	className?: string;
	innerClassName?: string;
	/** `always` matches the landing badge; `hover` runs the sweep only while hovered. */
	animateOn?: "always" | "hover";
	as?: "div" | "button";
	type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
	onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
	"aria-label"?: string;
	disabled?: boolean;
}

interface BadgeSize {
	w: number;
	h: number;
}

/** Upper & lower border paths from left mid → right mid (through top / bottom). */
function borderPaths(w: number, h: number) {
	const r = h / 2;
	const midY = h / 2;

	const upper = `M 0 ${midY} A ${r} ${r} 0 0 1 ${r} 0 L ${w - r} 0 A ${r} ${r} 0 0 1 ${w} ${midY}`;
	const lower = `M 0 ${midY} A ${r} ${r} 0 0 0 ${r} ${h} L ${w - r} ${h} A ${r} ${r} 0 0 0 ${w} ${midY}`;

	return { upper, lower };
}

/** 4s travel (L→R→L) + 8s pause — keep in sync with --badge-sweep-* in CSS */
const SWEEP_TRAVEL_S = 4;
const SWEEP_PAUSE_S = 8;
const SWEEP_TOTAL_S = SWEEP_TRAVEL_S + SWEEP_PAUSE_S;
const SWEEP_HALF = SWEEP_TRAVEL_S / 2 / SWEEP_TOTAL_S;
const SWEEP_FULL = SWEEP_TRAVEL_S / SWEEP_TOTAL_S;

export default function ShimmerBadge({
	children,
	className,
	innerClassName,
	animateOn = "always",
	as = "div",
	type = "button",
	onClick,
	"aria-label": ariaLabel,
	disabled,
}: ShimmerBadgeProps) {
	const ref = useRef<BadgeElement | null>(null);
	const rawId = useId().replace(/:/g, "");
	const glowId = `badge-sweep-glow-${rawId}`;
	const blurId = `badge-sweep-blur-${rawId}`;
	const [size, setSize] = useState<BadgeSize>({ w: 0, h: 0 });
	const [hovered, setHovered] = useState(false);
	const showSweep = animateOn === "always" || hovered;

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		const update = () => {
			const rect = el.getBoundingClientRect();
			setSize({ w: rect.width, h: rect.height });
		};
		update();

		const ro = new ResizeObserver(update);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	const paths = size.w > 0 && size.h > 0 ? borderPaths(size.w, size.h) : null;

	const sharedClassName = cn(
		"relative inline-flex rounded-full shadow-md",
		animateOn === "always" && "badge-border-light p-px",
		animateOn === "hover" &&
			cn(
				"border border-white/40 bg-transparent p-0 shadow-sm backdrop-blur-md transition-colors duration-200",
				hovered && "badge-border-light border-0 p-px shadow-md",
			),
		as === "button" &&
			"cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 disabled:cursor-not-allowed disabled:opacity-50",
		className,
	);

	const content = (
		<>
			{showSweep && paths ? (
				<svg
					key={`${size.w}-${size.h}-${hovered ? "on" : "off"}`}
					className="badge-sweep-layer pointer-events-none absolute inset-0 z-0 overflow-visible"
					width={size.w}
					height={size.h}
					aria-hidden
				>
					<defs>
						<radialGradient id={glowId} cx="50%" cy="50%" r="50%">
							<stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
							<stop offset="30%" stopColor="#ffffff" stopOpacity="0.75" />
							<stop offset="65%" stopColor="#ffffff" stopOpacity="0.2" />
							<stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
						</radialGradient>
						{/* Soft radial bloom around each orb */}
						<filter id={blurId} x="-120%" y="-120%" width="340%" height="340%">
							<feGaussianBlur
								in="SourceGraphic"
								stdDeviation="3"
								result="soft"
							/>
							<feMerge>
								<feMergeNode in="soft" />
								<feMergeNode in="SourceGraphic" />
							</feMerge>
						</filter>
					</defs>

					{[paths.upper, paths.lower].map((d, i) => (
						<g key={i} filter={`url(#${blurId})`}>
							{/*
							 * Hide after one L→R→L revolution so orbs don't sit
							 * visible at the left midpoint during the pause.
							 */}
							<animate
								attributeName="opacity"
								dur={`${SWEEP_TOTAL_S}s`}
								repeatCount="indefinite"
								calcMode="linear"
								keyTimes={`0;0.02;${SWEEP_FULL};${SWEEP_FULL + 0.01};1`}
								values="0;1;1;0;0"
							/>
							{/* Outer bloom */}
							<circle
								className="badge-sweep-orb"
								r="16"
								fill={`url(#${glowId})`}
								opacity={0.55}
							>
								<animateMotion
									dur={`${SWEEP_TOTAL_S}s`}
									repeatCount="indefinite"
									path={d}
									keyPoints="0;1;0;0"
									keyTimes={`0;${SWEEP_HALF};${SWEEP_FULL};1`}
									calcMode="linear"
								/>
							</circle>
							{/* Core highlight */}
							<circle
								className="badge-sweep-orb"
								r="6"
								fill={`url(#${glowId})`}
							>
								<animateMotion
									dur={`${SWEEP_TOTAL_S}s`}
									repeatCount="indefinite"
									path={d}
									keyPoints="0;1;0;0"
									keyTimes={`0;${SWEEP_HALF};${SWEEP_FULL};1`}
									calcMode="linear"
								/>
							</circle>
						</g>
					))}
				</svg>
			) : null}

			<span
				className={cn(
					"relative z-[1] inline-flex items-center gap-2 rounded-full px-3 py-1.5",
					animateOn === "always" &&
						"badge-border-light-inner bg-[#F1F9FF]/95 backdrop-blur-sm",
					animateOn === "hover" && "bg-white",
					innerClassName,
				)}
			>
				{children}
			</span>
		</>
	);

	const hoverHandlers =
		animateOn === "hover"
			? {
					onMouseEnter: () => setHovered(true),
					onMouseLeave: () => setHovered(false),
					onFocus: () => setHovered(true),
					onBlur: () => setHovered(false),
				}
			: {};

	if (as === "button") {
		return (
			<button
				ref={ref as React.RefObject<HTMLButtonElement | null>}
				type={type}
				onClick={onClick}
				aria-label={ariaLabel}
				disabled={disabled}
				className={sharedClassName}
				{...hoverHandlers}
			>
				{content}
			</button>
		);
	}

	return (
		<div
			ref={ref as React.RefObject<HTMLDivElement | null>}
			className={sharedClassName}
			{...hoverHandlers}
		>
			{content}
		</div>
	);
}
