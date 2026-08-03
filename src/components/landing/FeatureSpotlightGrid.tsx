"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
	Bell,
	Calendar,
	FolderLock,
	KeyRound,
	Mail,
	Sparkles,
	UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import CountUp from "react-countup";
import { cn } from "@/lib/utils";
import LandingFrostedCard from "./LandingFrostedCard";
import { FEATURE_SPOTLIGHT_TILES } from "./landingContent";
import { fadeUp, staggerContainer, viewportOnce } from "./motion";

const RING_COLORS = ["#0f5384", "#03AFBF", "#162768"] as const;
const PARTNER_ICONS = [Calendar, Mail, FolderLock, KeyRound] as const;

const ASK_PROMPTS = [
	"Ask CAALM anything...",
	"Contracts expiring in 30 days?",
	"Which licenses need renewal?",
	"Show open audit findings...",
] as const;

const REPORT_CARDS = [
	{ title: "Compliance Pack", bars: ["w-3/4", "w-1/2"] },
	{ title: "Renewal Summary", bars: ["w-2/3", "w-1/2"] },
	{ title: "Audit Readiness", bars: ["w-3/4", "w-2/5"] },
	{ title: "License Report", bars: ["w-1/2", "w-3/5"] },
] as const;

const ALERT_CARDS = [
	{
		title: "License renewal — 30 days",
		desc: "Professional license expires soon",
		priority: "high",
		priorityClass: "bg-red/10 text-red border-red/20",
	},
	{
		title: "Contract renewal — 60 days",
		desc: "Vendor MSA due for review",
		priority: "medium",
		priorityClass: "bg-orange/15 text-orange border-orange/25",
	},
	{
		title: "Audit reminder — 90 days",
		desc: "Regulatory filing window opens",
		priority: "low",
		priorityClass: "bg-blue/10 text-[#0f5384] border-blue/20",
	},
] as const;

type DeptLayout = "split" | "header" | "grid" | "stack";

const DEPARTMENT_TEMPLATES: {
	name: string;
	layout: DeptLayout;
	owner: string;
	photo: string;
	/** Horizontal nudge in % — negative shifts the photo left inside the circle */
	photoShiftX: number;
	/** Vertical nudge in % — positive shifts the photo down (reveals face higher in frame) */
	photoShiftY: number;
	ownedCount: number;
}[] = [
	{
		name: "Finance",
		layout: "header",
		owner: "Jasmine Cole",
		photo: "/assets/images/dept-owners/dept-owner-finance.png?v=5",
		photoShiftX: 8,
		photoShiftY: 0,
		ownedCount: 42,
	},
	{
		name: "Legal",
		layout: "split",
		owner: "Emma Hernandez",
		photo: "/assets/images/emma-hernandez.jpg",
		photoShiftX: 0,
		photoShiftY: -40,
		ownedCount: 28,
	},
	{
		name: "HR",
		layout: "grid",
		owner: "Robert Hayes",
		photo: "/assets/images/dept-owners/dept-owner-hr.png",
		photoShiftX: 0,
		photoShiftY: 0,
		ownedCount: 19,
	},
	{
		name: "Operations",
		layout: "stack",
		owner: "Chloe Bennett",
		photo: "/assets/images/dept-owners/dept-owner-ops.png",
		photoShiftX: 0,
		photoShiftY: 0,
		ownedCount: 35,
	},
];

function DepartmentLayoutIcon({
	layout,
	tone = "muted",
}: {
	layout: DeptLayout;
	tone?: "muted" | "active";
}) {
	const stroke = tone === "active" ? "#00C1CB" : "#64748b";
	return (
		<svg viewBox="0 0 40 40" className="h-14 w-14" aria-hidden>
			<rect
				x="3"
				y="3"
				width="34"
				height="34"
				rx="8"
				fill="none"
				stroke={stroke}
				strokeWidth="1.75"
			/>
			{layout === "split" && (
				<line
					x1="20"
					y1="8"
					x2="20"
					y2="32"
					stroke={stroke}
					strokeWidth="1.5"
				/>
			)}
			{layout === "header" && (
				<>
					<line
						x1="8"
						y1="14"
						x2="32"
						y2="14"
						stroke={stroke}
						strokeWidth="1.5"
					/>
					<line
						x1="20"
						y1="14"
						x2="20"
						y2="32"
						stroke={stroke}
						strokeWidth="1.5"
					/>
				</>
			)}
			{layout === "grid" && (
				<>
					<line
						x1="20"
						y1="8"
						x2="20"
						y2="32"
						stroke={stroke}
						strokeWidth="1.5"
					/>
					<line
						x1="8"
						y1="20"
						x2="32"
						y2="20"
						stroke={stroke}
						strokeWidth="1.5"
					/>
				</>
			)}
			{layout === "stack" && (
				<>
					<line
						x1="8"
						y1="16"
						x2="20"
						y2="16"
						stroke={stroke}
						strokeWidth="1.5"
					/>
					<line
						x1="8"
						y1="16"
						x2="8"
						y2="32"
						stroke={stroke}
						strokeWidth="1.5"
					/>
					<line
						x1="20"
						y1="8"
						x2="20"
						y2="32"
						stroke={stroke}
						strokeWidth="1.5"
					/>
				</>
			)}
		</svg>
	);
}

function DepartmentOwnershipTemplates({
	reduceMotion,
}: {
	reduceMotion: boolean | null;
}) {
	const itemWidth = 92;
	const count = DEPARTMENT_TEMPLATES.length;
	// Start on the middle copy so neighbors exist on both sides
	const [step, setStep] = useState(count);
	const [instant, setInstant] = useState(false);
	const active = ((step % count) + count) % count;

	useEffect(() => {
		if (reduceMotion) return;

		let cancelled = false;
		let pauseTimer: number | undefined;
		let slideTimer: number | undefined;

		const cycle = () => {
			pauseTimer = window.setTimeout(() => {
				if (cancelled) return;
				setInstant(false);
				setStep((s) => s + 1);
				slideTimer = window.setTimeout(() => {
					if (cancelled) return;
					setStep((s) => {
						if (s >= count * 2) {
							window.requestAnimationFrame(() => {
								setInstant(true);
								setStep(s - count);
							});
						}
						return s;
					});
					cycle();
				}, 550);
			}, 4000);
		};

		cycle();

		return () => {
			cancelled = true;
			if (pauseTimer) window.clearTimeout(pauseTimer);
			if (slideTimer) window.clearTimeout(slideTimer);
		};
	}, [reduceMotion, count]);

	useEffect(() => {
		if (!instant) return;
		const id = window.requestAnimationFrame(() => setInstant(false));
		return () => window.cancelAnimationFrame(id);
	}, [instant]);

	const track = [
		...DEPARTMENT_TEMPLATES,
		...DEPARTMENT_TEMPLATES,
		...DEPARTMENT_TEMPLATES,
	];
	const trackX = -step * itemWidth;
	const activeDept = DEPARTMENT_TEMPLATES[active];

	return (
		<div className="relative z-[1] flex flex-1 flex-col items-center justify-center gap-2.5 py-1">
			<div className="relative flex h-[88px] w-full max-w-[280px] items-center justify-center overflow-hidden">
				<div
					className="pointer-events-none absolute inset-y-0 left-0 z-20 w-8 bg-gradient-to-r from-white/90 to-transparent"
					aria-hidden
				/>
				<div
					className="pointer-events-none absolute inset-y-0 right-0 z-20 w-8 bg-gradient-to-l from-white/90 to-transparent"
					aria-hidden
				/>

				{/* Static dashed focus frame */}
				<div
					className="pointer-events-none absolute left-1/2 top-1/2 z-30 h-[72px] w-[72px] -translate-x-1/2 -translate-y-1/2"
					aria-hidden
				>
					<svg
						className="absolute inset-0 h-full w-full overflow-visible"
						viewBox="0 0 56 56"
					>
						<defs>
							<filter
								id="dept-dash-glow"
								x="-80%"
								y="-80%"
								width="260%"
								height="260%"
							>
								<feGaussianBlur stdDeviation="3.5" result="blur" />
								<feMerge>
									<feMergeNode in="blur" />
									<feMergeNode in="SourceGraphic" />
								</feMerge>
							</filter>
						</defs>
						<rect
							x="2"
							y="2"
							width="52"
							height="52"
							rx="12"
							fill="none"
							stroke="#00C1CB"
							strokeWidth="1.35"
							strokeDasharray="4 3.5"
							filter="url(#dept-dash-glow)"
						/>
					</svg>
				</div>

				{reduceMotion ? (
					<div className="relative z-10 flex items-center justify-center">
						<DepartmentLayoutIcon
							layout={DEPARTMENT_TEMPLATES[0].layout}
							tone="active"
						/>
					</div>
				) : (
					<motion.div
						className="absolute left-1/2 top-1/2 z-10 flex -translate-y-1/2"
						style={{ marginLeft: -itemWidth / 2 }}
						animate={{ x: trackX }}
						transition={
							instant
								? { duration: 0 }
								: { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
						}
						initial={false}
					>
						{track.map((dept, i) => {
							const isCenter = i === step;
							return (
								<div
									key={`${dept.name}-${i}`}
									className="flex shrink-0 items-center justify-center"
									style={{ width: itemWidth }}
								>
									<DepartmentLayoutIcon
										layout={dept.layout}
										tone={isCenter ? "active" : "muted"}
									/>
								</div>
							);
						})}
					</motion.div>
				)}
			</div>

			{/* Owner accountability strip — syncs with active department */}
			<motion.div
				key={activeDept.name}
				className="flex w-full max-w-[260px] items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white/90 px-2.5 py-2 shadow-sm"
				initial={reduceMotion ? false : { opacity: 0, y: 6 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3 }}
			>
				<div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-[#00C1CB]/35">
					{/* eslint-disable-next-line @next/next/no-img-element -- need object-position crop control */}
					<img
						src={activeDept.photo}
						alt={activeDept.owner}
						className="h-full w-full object-cover"
						style={{
							objectPosition: `${50 + activeDept.photoShiftX}% ${35 + activeDept.photoShiftY}%`,
						}}
					/>
				</div>
				<div className="min-w-0 flex-1">
					<p className="truncate text-[11px] font-semibold text-slate-800">
						{activeDept.name}
					</p>
					<p className="flex items-center gap-1 truncate text-[10px] text-slate-500">
						<UserRound className="h-3 w-3 shrink-0 text-[#00C1CB]" />
						<span className="truncate">Owned by {activeDept.owner}</span>
					</p>
				</div>
				<div className="shrink-0 rounded-full border border-[#00C1CB]/30 bg-[#00C1CB]/10 px-2 py-0.5 text-center">
					<p className="text-[11px] font-bold leading-none text-[#0f5384]">
						{activeDept.ownedCount}
					</p>
					<p className="mt-0.5 text-[8px] leading-none text-slate-500">owned</p>
				</div>
			</motion.div>
		</div>
	);
}

const REPORT_CYCLE_MS = 3200;
const ALERT_PHASE_OFFSET_MS = 1600;

function CustomReportsFolder({
	reduceMotion,
}: {
	reduceMotion: boolean | null;
}) {
	const [reportIndex, setReportIndex] = useState(0);
	const active = REPORT_CARDS[reportIndex];

	useEffect(() => {
		if (reduceMotion) return;
		const id = window.setInterval(() => {
			setReportIndex((i) => (i + 1) % REPORT_CARDS.length);
		}, REPORT_CYCLE_MS);
		return () => window.clearInterval(id);
	}, [reduceMotion]);

	/** Fan out of the Files pocket: rise + horizontal spread */
	const sheets = [
		{ peekY: -42, peekX: -18, rotate: -8, delay: 0 },
		{ peekY: -54, peekX: 0, rotate: 2, delay: 0.12 },
		{ peekY: -66, peekX: 18, rotate: 8, delay: 0.24 },
	] as const;
	const tuckedY = 22;
	const cycleS = REPORT_CYCLE_MS / 1000;

	return (
		<div className="relative z-[1] flex flex-1 flex-col items-center justify-center py-1">
			<div className="relative flex h-[150px] w-full max-w-[180px] items-end justify-center overflow-visible">
				<motion.div
					className="pointer-events-none absolute bottom-2 left-1/2 h-16 w-36 -translate-x-1/2 rounded-full blur-xl"
					style={{
						background:
							"radial-gradient(circle, rgba(0, 193, 203, 0.55), transparent 70%)",
					}}
					animate={
						reduceMotion
							? undefined
							: { opacity: [0.4, 0.75, 0.4], scale: [0.95, 1.05, 0.95] }
					}
					transition={
						reduceMotion
							? undefined
							: { duration: 3, repeat: Infinity, ease: "easeInOut" }
					}
					aria-hidden
				/>

				{/* Folder back (pocket) */}
				<div
					className="absolute bottom-7 left-1/2 z-0 h-[52px] w-[148px] -translate-x-1/2 rounded-t-lg bg-[#7ed8e8]"
					aria-hidden
				/>

				{/* Sheets: centered wrapper + numeric spread (avoids % x keyframe bugs) */}
				{sheets.map((sheet, i) => {
					const isFront = i === sheets.length - 1;
					return (
						<div
							key={`report-anchor-${i}`}
							className="absolute bottom-9 left-1/2 z-[1] -translate-x-1/2"
							style={{ zIndex: i + 1 }}
						>
							<motion.div
								className="w-[118px] origin-bottom rounded-md border border-slate-100 bg-white p-2.5 shadow-[0_8px_20px_-6px_rgba(15,83,132,0.28)]"
								initial={
									reduceMotion
										? false
										: { x: 0, y: tuckedY, rotate: 0, opacity: 0.5 }
								}
								animate={
									reduceMotion
										? {
												x: sheet.peekX,
												y: sheet.peekY,
												rotate: sheet.rotate,
												opacity: 1,
											}
										: {
												x: [0, sheet.peekX, sheet.peekX, 0],
												y: [tuckedY, sheet.peekY, sheet.peekY, tuckedY],
												rotate: [0, sheet.rotate, sheet.rotate, 0],
												opacity: [0.5, 1, 1, 0.5],
											}
								}
								transition={
									reduceMotion
										? { duration: 0 }
										: {
												duration: cycleS,
												times: [0, 0.3, 0.7, 1],
												repeat: Infinity,
												ease: "easeInOut",
												delay: sheet.delay,
											}
								}
							>
								{isFront ? (
									<>
										<p className="truncate text-[10px] font-semibold text-[#0f5384]">
											{active.title}
										</p>
										<div className="mt-1.5 flex items-start gap-2">
											<div className="flex flex-1 flex-col gap-1 pt-0.5">
												{active.bars.map((w) => (
													<div
														key={w}
														className={cn("h-1.5 rounded-full bg-[#d7e8f0]", w)}
													/>
												))}
											</div>
											<div className="h-7 w-7 shrink-0 rounded-md bg-[#e8f4f8]" />
										</div>
									</>
								) : (
									<div className="space-y-1.5 pt-1">
										<div className="h-1.5 w-2/3 rounded-full bg-[#e8eef3]" />
										<div className="h-1.5 w-1/2 rounded-full bg-[#e8eef3]" />
									</div>
								)}
							</motion.div>
						</div>
					);
				})}

				{/* Folder front — covers sheet bottoms so they emerge from Files */}
				<div className="relative z-20 h-[58px] w-[152px] overflow-hidden rounded-lg bg-[#00C1CB] shadow-[0_10px_24px_-8px_rgba(0,193,203,0.55)]">
					<div className="absolute inset-x-0 top-0 h-2 bg-[#0f5384]/15" />
					<span className="absolute inset-x-0 bottom-3 text-center text-xs font-bold tracking-wide text-white">
						Files
					</span>
				</div>
			</div>
		</div>
	);
}

function RenewalAlertsStack({
	reduceMotion,
}: {
	reduceMotion: boolean | null;
}) {
	const [alertIndex, setAlertIndex] = useState(0);
	const active = ALERT_CARDS[alertIndex];
	const phaseOffsetS = ALERT_PHASE_OFFSET_MS / 1000;
	const cycleS = REPORT_CYCLE_MS / 1000;

	useEffect(() => {
		if (reduceMotion) return;
		let intervalId: number | undefined;
		const startId = window.setTimeout(() => {
			setAlertIndex((i) => (i + 1) % ALERT_CARDS.length);
			intervalId = window.setInterval(() => {
				setAlertIndex((i) => (i + 1) % ALERT_CARDS.length);
			}, REPORT_CYCLE_MS);
		}, ALERT_PHASE_OFFSET_MS);
		return () => {
			window.clearTimeout(startId);
			if (intervalId) window.clearInterval(intervalId);
		};
	}, [reduceMotion]);

	/** Fan out from behind the bell: rise + horizontal spread */
	const sheets = [
		{ peekY: -44, peekX: -20, rotate: -7, delay: phaseOffsetS },
		{ peekY: -56, peekX: 0, rotate: 1.5, delay: phaseOffsetS + 0.12 },
		{ peekY: -68, peekX: 20, rotate: 7, delay: phaseOffsetS + 0.24 },
	] as const;
	const tuckedY = 10;

	return (
		<div className="relative z-[1] flex flex-1 flex-col items-center justify-center py-1">
			<div className="relative flex h-[150px] w-full max-w-[200px] items-end justify-center overflow-visible pb-1">
				<motion.div
					className="pointer-events-none absolute bottom-4 left-1/2 h-20 w-28 -translate-x-1/2 rounded-full blur-xl"
					style={{
						background:
							"radial-gradient(circle, rgba(0, 193, 203, 0.55), transparent 70%)",
					}}
					animate={
						reduceMotion
							? undefined
							: { opacity: [0.35, 0.75, 0.35], scale: [0.95, 1.08, 0.95] }
					}
					transition={
						reduceMotion
							? undefined
							: {
									duration: 3,
									repeat: Infinity,
									ease: "easeInOut",
									delay: phaseOffsetS,
								}
					}
					aria-hidden
				/>

				{sheets.map((sheet, i) => {
					const isFront = i === sheets.length - 1;
					return (
						<div
							key={`alert-anchor-${i}`}
							className="absolute bottom-10 left-1/2 -translate-x-1/2"
							style={{ zIndex: i + 1 }}
						>
							<motion.div
								className="w-[156px] origin-bottom rounded-lg border border-slate-200/80 bg-white p-2 shadow-[0_8px_20px_-6px_rgba(15,83,132,0.28)]"
								initial={
									reduceMotion
										? false
										: { x: 0, y: tuckedY, rotate: 0, opacity: 0.4 }
								}
								animate={
									reduceMotion
										? {
												x: sheet.peekX,
												y: sheet.peekY,
												rotate: sheet.rotate,
												opacity: 1,
											}
										: {
												x: [0, sheet.peekX, sheet.peekX, 0],
												y: [tuckedY, sheet.peekY, sheet.peekY, tuckedY],
												rotate: [0, sheet.rotate, sheet.rotate, 0],
												opacity: [0.4, 1, 1, 0.4],
											}
								}
								transition={
									reduceMotion
										? { duration: 0 }
										: {
												duration: cycleS,
												times: [0, 0.3, 0.7, 1],
												repeat: Infinity,
												ease: "easeInOut",
												delay: sheet.delay,
											}
								}
							>
								{isFront ? (
									<div className="flex items-start gap-1.5">
										<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#e8f4f8]">
											<Bell className="h-3.5 w-3.5 text-[#0f5384]" />
										</div>
										<div className="min-w-0 flex-1">
											<p className="truncate text-[9px] font-semibold leading-tight text-slate-800">
												{active.title}
											</p>
											<p className="mt-0.5 truncate text-[8px] leading-tight text-slate-500">
												{active.desc}
											</p>
											<div className="mt-1 flex items-center gap-1">
												<span
													className={cn(
														"rounded-full border px-1.5 py-px text-[7px] font-medium capitalize",
														active.priorityClass,
													)}
												>
													{active.priority}
												</span>
												<span className="h-1.5 w-1.5 rounded-full bg-[#00C1CB]" />
											</div>
										</div>
									</div>
								) : (
									<div className="flex items-start gap-1.5">
										<div className="h-7 w-7 shrink-0 rounded-md bg-[#eef2f6]" />
										<div className="flex flex-1 flex-col gap-1 pt-1">
											<div className="h-1.5 w-4/5 rounded-full bg-[#e8eef3]" />
											<div className="h-1.5 w-1/2 rounded-full bg-[#e8eef3]" />
										</div>
									</div>
								)}
							</motion.div>
						</div>
					);
				})}

				{/* Bell in front — cards fan out from behind its upper half */}
				<motion.div
					className="relative z-30 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#00C1CB]/35 bg-[#e8f4f8] shadow-[0_10px_24px_-8px_rgba(0,193,203,0.45)]"
					animate={reduceMotion ? undefined : { rotate: [0, -8, 8, -6, 6, 0] }}
					transition={
						reduceMotion
							? undefined
							: {
									duration: 0.7,
									repeat: Infinity,
									repeatDelay: 2.5,
									ease: "easeInOut",
									delay: phaseOffsetS,
								}
					}
				>
					<Bell className="h-7 w-7 text-[#00C1CB]" />
					<span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#00C1CB] px-1 text-[9px] font-bold text-white shadow-sm">
						3
					</span>
				</motion.div>
			</div>
		</div>
	);
}

function AskCaalmAnythingPill({
	reduceMotion,
}: {
	reduceMotion: boolean | null;
}) {
	const [promptIndex, setPromptIndex] = useState(0);
	const [displayText, setDisplayText] = useState(
		reduceMotion ? ASK_PROMPTS[0] : "",
	);
	const [phase, setPhase] = useState<"typing" | "hold" | "deleting">("typing");

	useEffect(() => {
		if (reduceMotion) {
			setDisplayText(ASK_PROMPTS[0]);
			return;
		}

		const full = ASK_PROMPTS[promptIndex];

		if (phase === "typing") {
			if (displayText.length < full.length) {
				const t = window.setTimeout(() => {
					setDisplayText(full.slice(0, displayText.length + 1));
				}, 38);
				return () => window.clearTimeout(t);
			}
			const t = window.setTimeout(() => setPhase("hold"), 1600);
			return () => window.clearTimeout(t);
		}

		if (phase === "hold") {
			const t = window.setTimeout(() => setPhase("deleting"), 400);
			return () => window.clearTimeout(t);
		}

		if (displayText.length > 0) {
			const t = window.setTimeout(() => {
				setDisplayText((prev) => prev.slice(0, -1));
			}, 22);
			return () => window.clearTimeout(t);
		}

		const t = window.setTimeout(() => {
			setPromptIndex((i) => (i + 1) % ASK_PROMPTS.length);
			setPhase("typing");
		}, 280);
		return () => window.clearTimeout(t);
	}, [displayText, phase, promptIndex, reduceMotion]);

	return (
		<div className="relative z-[1] flex flex-1 items-center justify-center py-4">
			<div className="relative flex w-full max-w-[300px] items-center justify-center">
				{!reduceMotion &&
					[0, 1, 2].map((i) => (
						<motion.div
							key={i}
							className="pointer-events-none absolute rounded-full border border-[#03AFBF]/25"
							style={{ width: 220, height: 56 }}
							initial={{ scale: 0.92, opacity: 0 }}
							animate={{
								scale: [0.92, 1.45],
								opacity: [0.45, 0],
							}}
							transition={{
								duration: 2.8,
								repeat: Infinity,
								ease: "easeOut",
								delay: i * 0.9,
							}}
							aria-hidden
						/>
					))}

				<motion.div
					className="pointer-events-none absolute -inset-6 rounded-full blur-xl"
					style={{
						background:
							"radial-gradient(circle, rgba(0, 193, 203, 0.45) 0%, rgba(15, 83, 132, 0.18) 45%, transparent 70%)",
					}}
					animate={
						reduceMotion
							? undefined
							: { opacity: [0.35, 0.7, 0.35], scale: [0.95, 1.05, 0.95] }
					}
					transition={
						reduceMotion
							? undefined
							: { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
					}
					aria-hidden
				/>

				<div className="relative w-full overflow-hidden rounded-full border border-white/90 bg-white px-5 py-3.5 shadow-[0_12px_28px_-8px_rgba(15,83,132,0.28)]">
					{!reduceMotion && (
						<motion.div
							className="pointer-events-none absolute inset-y-0 w-1/3 skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent"
							animate={{ left: ["-40%", "120%"] }}
							transition={{
								duration: 2.4,
								repeat: Infinity,
								ease: "easeInOut",
								repeatDelay: 2.2,
							}}
							aria-hidden
						/>
					)}

					<div className="relative z-[1] flex items-center justify-center gap-2.5">
						<span className="min-w-0 truncate text-center text-sm font-medium text-[#5a6d85]">
							{displayText}
							{!reduceMotion && (
								<span
									className="ml-0.5 inline-block h-4 w-0.5 bg-[#0f5384] align-middle animate-caret-blink"
									aria-hidden
								/>
							)}
						</span>
						<motion.span
							className="inline-flex shrink-0 text-[#0f5384]"
							animate={
								reduceMotion
									? undefined
									: { opacity: [0.55, 1, 0.55], scale: [0.92, 1.08, 0.92] }
							}
							transition={
								reduceMotion
									? undefined
									: { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
							}
							aria-hidden
						>
							<Sparkles className="h-4 w-4" />
						</motion.span>
					</div>
				</div>
			</div>
		</div>
	);
}

function ComplianceRing({
	value,
	label,
	color,
	reduceMotion,
}: {
	value: number;
	label: string;
	color: string;
	reduceMotion: boolean | null;
}) {
	const size = 68;
	const stroke = 6;
	const r = (size - stroke) / 2;
	const target = value / 100;
	const [countKey, setCountKey] = useState(0);

	useEffect(() => {
		if (reduceMotion) return;
		const id = window.setInterval(() => {
			setCountKey((k) => k + 1);
		}, 4200);
		return () => window.clearInterval(id);
	}, [reduceMotion]);

	return (
		<div className="text-center">
			<div className="relative mx-auto mb-1.5 h-[68px] w-[68px]">
				<svg width={size} height={size} className="-rotate-90" aria-hidden>
					<circle
						cx={size / 2}
						cy={size / 2}
						r={r}
						fill="none"
						stroke="rgba(15, 83, 132, 0.14)"
						strokeWidth={stroke}
						strokeLinecap="round"
					/>
					<motion.circle
						key={countKey}
						cx={size / 2}
						cy={size / 2}
						r={r}
						fill="none"
						stroke={color}
						strokeWidth={stroke}
						strokeLinecap="round"
						initial={reduceMotion ? false : { pathLength: 0 }}
						animate={{ pathLength: target }}
						transition={
							reduceMotion
								? { duration: 0 }
								: { duration: 1.4, ease: "easeOut" }
						}
					/>
				</svg>
				<span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-800">
					{reduceMotion ? (
						<>{value}%</>
					) : (
						<CountUp
							key={countKey}
							end={value}
							suffix="%"
							duration={1.5}
							start={0}
						/>
					)}
				</span>
			</div>
			<p className="text-[10px] text-slate-500">{label}</p>
		</div>
	);
}

function BentoDottedBackdrop({ className }: { className?: string }) {
	return (
		<div
			className={cn(
				"pointer-events-none absolute inset-0 opacity-[0.35]",
				className,
			)}
			aria-hidden
			style={{
				backgroundImage:
					"radial-gradient(circle, rgba(15, 83, 132, 0.22) 1px, transparent 1px)",
				backgroundSize: "14px 14px",
				maskImage:
					"radial-gradient(50% 50%, rgb(0, 0, 0) 55%, rgba(0, 0, 0, 0) 100%)",
				WebkitMaskImage:
					"radial-gradient(50% 50%, rgb(0, 0, 0) 55%, rgba(0, 0, 0, 0) 100%)",
			}}
		/>
	);
}

export default function FeatureSpotlightGrid() {
	const reduceMotion = useReducedMotion();

	return (
		<motion.div
			className="mt-12 sm:mt-16"
			variants={staggerContainer}
			initial="hidden"
			whileInView="visible"
			viewport={viewportOnce}
			id="feature-spotlight"
		>
			<motion.div variants={fadeUp} className="text-center mb-8">
				<h3 className="text-xl sm:text-2xl md:text-3xl sidebar-gradient-text landing-section-title">
					Powerful workflows that make sense
				</h3>
				<p className="mt-2 text-sm text-slate-600 max-w-xl mx-auto">
					Interactive previews of search, compliance, reports, and renewals
					inside CAALM.
				</p>
			</motion.div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
				{FEATURE_SPOTLIGHT_TILES.map((tile) => (
					<motion.div
						key={tile.id}
						variants={fadeUp}
						whileHover={reduceMotion ? undefined : { y: -4 }}
						transition={{ duration: 0.2 }}
					>
						<LandingFrostedCard
							className={cn(
								"h-full min-h-[200px]",
								(tile.id === "reports" || tile.id === "alerts") &&
									"!overflow-visible",
							)}
							contentClassName="relative flex h-full min-h-[200px] flex-col overflow-visible p-4 sm:p-5"
						>
							{tile.id !== "alerts" && <BentoDottedBackdrop />}

							{tile.id === "search" && (
								<>
									<p className="relative z-[1] text-sm font-semibold sidebar-gradient-text">
										{tile.title}
									</p>
									<AskCaalmAnythingPill reduceMotion={reduceMotion} />
								</>
							)}

							{tile.id === "rings" && "metrics" in tile && (
								<>
									<p className="relative z-[1] text-sm font-semibold sidebar-gradient-text mb-4">
										{tile.title}
									</p>
									<div className="relative z-[1] flex flex-1 items-center justify-around gap-2 pb-2">
										{tile.metrics.map((m, i) => (
											<ComplianceRing
												key={m.label}
												value={m.value}
												label={m.label}
												color={RING_COLORS[i % RING_COLORS.length]}
												reduceMotion={reduceMotion}
											/>
										))}
									</div>
								</>
							)}

							{tile.id === "reports" && (
								<>
									<p className="relative z-[1] text-sm font-semibold sidebar-gradient-text mb-1">
										{tile.title}
									</p>
									<CustomReportsFolder reduceMotion={reduceMotion} />
									<p className="relative z-[1] text-xs text-slate-600 text-center">
										{tile.subtitle}
									</p>
								</>
							)}

							{tile.id === "integrations" && (
								<>
									<p className="relative z-[1] text-sm font-semibold sidebar-gradient-text mb-3">
										{tile.title}
									</p>
									<div className="relative z-[1] mx-auto flex h-[180px] w-full max-w-[180px] items-center justify-center overflow-visible">
										{!reduceMotion && (
											<div className="absolute inset-[10%] animate-spin-slow opacity-70 [animation-direction:reverse]">
												<svg
													className="h-full w-full"
													viewBox="0 0 100 100"
													aria-hidden
												>
													<path
														id="caalm-partner-curve"
														d="M 18,50 a 32,32 0 1,1 64,0 a 32,32 0 1,1 -64,0"
														fill="transparent"
													/>
													<text className="fill-[#0f5384] text-[6.5px] font-semibold tracking-[0.1em] uppercase">
														<textPath href="#caalm-partner-curve">
															✦ CONNECTED ✦ CALENDAR EMAIL STORAGE SSO
														</textPath>
													</text>
												</svg>
											</div>
										)}

										<motion.div
											className="absolute inset-0"
											animate={reduceMotion ? undefined : { rotate: 360 }}
											transition={
												reduceMotion
													? undefined
													: { duration: 18, repeat: Infinity, ease: "linear" }
											}
										>
											{PARTNER_ICONS.map((Icon, i) => {
												const angle = (i * 90 * Math.PI) / 180;
												const radius = 42;
												const x = 50 + Math.cos(angle) * radius;
												const y = 50 + Math.sin(angle) * radius;
												return (
													<span
														key={Icon.displayName ?? i}
														className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm"
														style={{ left: `${x}%`, top: `${y}%` }}
													>
														<Icon className="h-3.5 w-3.5 text-[#0f5384]" />
													</span>
												);
											})}
										</motion.div>

										<span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] font-semibold text-slate-600 shadow-md">
											sync
										</span>
									</div>
									<p className="relative z-[1] mt-2 text-xs text-slate-600 text-center">
										{tile.subtitle}
									</p>
								</>
							)}

							{tile.id === "ownership" && (
								<>
									<p className="relative z-[1] text-sm font-semibold sidebar-gradient-text mb-1">
										{tile.title}
									</p>
									<DepartmentOwnershipTemplates reduceMotion={reduceMotion} />
								</>
							)}

							{tile.id === "alerts" && (
								<>
									<p className="relative z-[1] text-sm font-semibold sidebar-gradient-text mb-1">
										{tile.title}
									</p>
									<RenewalAlertsStack reduceMotion={reduceMotion} />
									<p className="relative z-[1] text-xs text-slate-600 text-center">
										{tile.subtitle}
									</p>
								</>
							)}
						</LandingFrostedCard>
					</motion.div>
				))}
			</div>
		</motion.div>
	);
}
