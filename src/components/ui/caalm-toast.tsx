"use client";

import Image from "next/image";
import { AlertTriangle, Check, Download, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Tone config ─────────────────────────────────────────────────────────────

const TONE_RAIL: Record<Tone, string> = {
	neutral: "#94a3b8",
	info: "#078FAB",
	warning: "#F9AB72",
	error: "#b80000",
	success: "#3DD9B3",
};

const TONE_ICON_BG: Record<Tone, string> = {
	neutral: "rgba(148,163,184,0.12)",
	info: "rgba(7,143,171,0.12)",
	warning: "rgba(249,171,114,0.14)",
	error: "rgba(184,0,0,0.10)",
	success: "rgba(61,217,179,0.12)",
};

/** Duration in ms; Infinity = persists until dismissed */
export const TONE_DURATION: Record<Tone, number> = {
	neutral: 6000,
	info: 6000,
	warning: 8000,
	error: Infinity,
	success: 6000,
};

const TONE_DEFAULT_ICON: Record<Tone, React.ReactNode> = {
	neutral: <Trash2 className="h-4 w-4" />,
	info: <Download className="h-4 w-4" />,
	warning: <AlertTriangle className="h-4 w-4" />,
	error: <AlertTriangle className="h-4 w-4" />,
	success: <Check className="h-4 w-4" />,
};

export type Tone = "neutral" | "info" | "warning" | "error" | "success";
export type WorkingState = "working" | "done" | "failed";

// ─── Shared sub-components ───────────────────────────────────────────────────

function TimerBar({ duration, tone }: { duration: number; tone: Tone }) {
	if (!Number.isFinite(duration)) return null;
	return (
		<div className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden rounded-b-[14px]">
			<div
				className="h-full w-full origin-left"
				style={{
					backgroundColor: TONE_RAIL[tone],
					animation: `caalm-timer ${duration}ms linear forwards`,
					// pause on parent hover — set via group-hover in parent
				}}
				data-timer
			/>
		</div>
	);
}

function WorkingTimerBar({ tone }: { tone: Tone }) {
	return (
		<div className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden rounded-b-[14px] bg-slate-100">
			<div
				className="absolute inset-y-0 left-0 w-1/3"
				style={{
					backgroundColor: TONE_RAIL[tone],
					animation: "caalm-timer-shimmer 1.4s ease-in-out infinite",
				}}
			/>
		</div>
	);
}

function DismissButton({ onDismiss }: { onDismiss: () => void }) {
	return (
		<button
			type="button"
			onClick={onDismiss}
			aria-label="Dismiss"
			className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#078FAB]"
		>
			<X className="h-3.5 w-3.5" />
		</button>
	);
}

function ActionRow({ actions }: { actions: Action[] }) {
	if (!actions.length) return null;
	return (
		<div className="mt-1.5 flex items-center gap-3">
			{actions.map((a) => (
				<button
					key={a.label}
					type="button"
					onClick={a.onClick}
					className="text-[12px] font-semibold text-[#078FAB] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#078FAB]"
				>
					{a.label}
				</button>
			))}
		</div>
	);
}

/** Shared card shell — left rail + shadow + radius + hover-pause for timer */
function ToastCard({
	tone,
	children,
	className,
}: {
	tone: Tone;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"group relative flex w-[360px] min-h-[64px] items-start gap-3 overflow-hidden rounded-[14px] bg-white px-4 py-3.5 pr-8 shadow-[0_4px_24px_rgba(0,0,0,0.10)] [&_[data-timer]]:group-hover:[animation-play-state:paused] [&_[data-timer]]:group-focus-within:[animation-play-state:paused]",
				className,
			)}
			// 3px left rail
			style={{ boxShadow: `inset 3px 0 0 ${TONE_RAIL[tone]}, 0 4px 24px rgba(0,0,0,0.10)` }}
		>
			{children}
		</div>
	);
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Action {
	label: string;
	onClick: () => void;
}

export interface BaseToastProps {
	id: string | number;
	tone?: Tone;
	icon?: React.ReactNode;
	title: string;
	message?: string;
	actions?: Action[];
	/** Raw React node rendered below the message — used when migrating legacy ToastAction elements. */
	renderAction?: React.ReactNode;
	/** Override the auto-dismiss duration (ms). Takes precedence over tone default. */
	duration?: number;
	onDismiss: () => void;
}

export interface AttributionToastProps {
	id: string | number;
	tone?: Tone;
	title: string;
	message?: string;
	actions?: Action[];
	status: "success" | "error";
	onDismiss: () => void;
}

export interface WorkingToastProps {
	id: string | number;
	state: WorkingState;
	title: string;
	message?: string;
	actions?: Action[];
	onDismiss: () => void;
}

// ─── Pattern 0 · Base toast ──────────────────────────────────────────────────

export function BaseToast({
	tone = "neutral",
	icon,
	title,
	message,
	actions = [],
	renderAction,
	duration: durationOverride,
	onDismiss,
}: BaseToastProps) {
	const duration = durationOverride ?? TONE_DURATION[tone];
	const role = tone === "error" ? "alert" : "status";

	return (
		<ToastCard tone={tone}>
			<div role={role} className="contents">
				{/* icon circle */}
				<div
					className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
					style={{ background: TONE_ICON_BG[tone], color: TONE_RAIL[tone] }}
				>
					{icon ?? TONE_DEFAULT_ICON[tone]}
				</div>

				{/* content */}
				<div className="min-w-0 flex-1">
					<p className="text-[13px] font-semibold leading-snug text-slate-900">{title}</p>
					{message && (
						<p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{message}</p>
					)}
					{renderAction ? (
						<div className="mt-1.5">{renderAction}</div>
					) : (
						<ActionRow actions={actions} />
					)}
				</div>
			</div>

			<DismissButton onDismiss={onDismiss} />
			<TimerBar duration={duration} tone={tone} />
		</ToastCard>
	);
}

// ─── Pattern 1 · Attribution tile (assistant result) ─────────────────────────

export function AttributionToast({
	tone,
	title,
	message,
	actions = [],
	status,
	onDismiss,
}: AttributionToastProps) {
	const resolvedTone: Tone = tone ?? (status === "success" ? "success" : "error");
	const duration = TONE_DURATION[resolvedTone];

	return (
		<ToastCard tone={resolvedTone}>
			<div role="status" className="contents">
				{/* robot tile with badge */}
				<div className="relative mt-0.5 shrink-0">
					<div
						className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200/80"
						style={{
							background:
								"linear-gradient(135deg, #e8f4fd 0%, #d6eaf8 50%, #cce5f6 100%)",
						}}
					>
						<Image
							src="/assets/images/toast-bot.png"
							alt=""
							width={34}
							height={34}
							className="object-contain"
						/>
					</div>
					{/* status badge */}
					<div
						className="absolute -bottom-1.5 -right-1.5 flex h-[19px] w-[19px] items-center justify-center rounded-md border-2 border-white"
						style={{ background: status === "success" ? "#3DD9B3" : "#b80000" }}
					>
						{status === "success" ? (
							<Check className="h-2.5 w-2.5 stroke-[3.2] text-white" />
						) : (
							<AlertTriangle className="h-2.5 w-2.5 stroke-[3.2] text-white" />
						)}
					</div>
				</div>

				{/* content */}
				<div className="min-w-0 flex-1">
					<p className="font-mono text-[10px] text-slate-400">
						CAALM Assistant · on your request
					</p>
					<p className="text-[13px] font-semibold leading-snug text-slate-900">{title}</p>
					{message && (
						<p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{message}</p>
					)}
					<ActionRow actions={actions} />
				</div>
			</div>

			<DismissButton onDismiss={onDismiss} />
			<TimerBar duration={duration} tone={resolvedTone} />
		</ToastCard>
	);
}

// ─── Pattern 4 · Working → done ring ─────────────────────────────────────────

function AgentRing({ state }: { state: WorkingState }) {
	const ringColor =
		state === "working" ? undefined : state === "done" ? "#3DD9B3" : "#b80000";

	return (
		<div className="relative mt-0.5 h-[46px] w-[46px] shrink-0">
			{/* ring layer */}
			<div
				className={cn(
					"absolute inset-0 rounded-full",
					state === "working" && "animate-[caalm-ring-spin_1.2s_linear_infinite]",
				)}
				style={{
					background:
						state === "working"
							? "conic-gradient(#078FAB 0deg 270deg, #e2e8f0 270deg)"
							: ringColor,
					// 3px annular mask
					WebkitMaskImage:
						"radial-gradient(circle at center, transparent 20px, black 20px)",
					maskImage: "radial-gradient(circle at center, transparent 20px, black 20px)",
				}}
			/>
			{/* core circle */}
			<div className="absolute inset-[5px] flex items-center justify-center rounded-full border border-slate-200 bg-white">
				<Image
					src="/assets/images/toast-bot.png"
					alt=""
					width={26}
					height={26}
					className="object-contain"
				/>
			</div>
			{/* status badge — only when settled */}
			{state !== "working" && (
				<div
					className="absolute -bottom-1.5 -right-1.5 flex h-[19px] w-[19px] items-center justify-center rounded-full border-2 border-white"
					style={{ background: state === "done" ? "#3DD9B3" : "#b80000" }}
				>
					{state === "done" ? (
						<Check className="h-2.5 w-2.5 stroke-[3.2] text-white" />
					) : (
						<AlertTriangle className="h-2.5 w-2.5 stroke-[3.2] text-white" />
					)}
				</div>
			)}
		</div>
	);
}

export function WorkingToast({
	state,
	title,
	message,
	actions = [],
	onDismiss,
}: WorkingToastProps) {
	const tone: Tone = state === "failed" ? "error" : state === "done" ? "success" : "info";
	const duration = state === "done" ? 6000 : state === "failed" ? Infinity : Infinity;

	return (
		<ToastCard tone={tone}>
			<div role="status" className="contents">
				<AgentRing state={state} />

				<div className="min-w-0 flex-1">
					<p className="font-mono text-[10px] text-slate-400">CAALM Assistant</p>
					<p className="text-[13px] font-semibold leading-snug text-slate-900">{title}</p>
					{message && (
						<p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{message}</p>
					)}
					<ActionRow actions={actions} />
				</div>
			</div>

			{state !== "working" && <DismissButton onDismiss={onDismiss} />}

			{state === "working" ? (
				<WorkingTimerBar tone={tone} />
			) : (
				<TimerBar duration={duration} tone={tone} />
			)}
		</ToastCard>
	);
}
