"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight, Workflow } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fireCaalmConfetti } from "@/lib/ui/confetti";
import { cn } from "@/lib/utils";
import LandingFrostedCard from "./LandingFrostedCard";
import LandingSection from "./LandingSection";
import { HOW_IT_WORKS_STEPS } from "./landingContent";
import {
	fadeLeft,
	fadeRight,
	fadeUp,
	staggerSlow,
	viewportOnce,
} from "./motion";

const CAALM_COLORS = {
	teal: "#00C1CB",
	blue: "#0f5384",
	mid: "#0E638F",
	navy: "#162768",
} as const;

const STEP_TIMES = {
	1: 0.7,
	2: 5.4,
	3: 10.4,
	4: 13.8,
} as const;

const SONAR_RING_COUNT = 2;

function TimelineStepNumber({
	step,
	isActive,
	reduceMotion,
}: {
	step: number;
	isActive: boolean;
	reduceMotion: boolean | null;
}) {
	return (
		<div className="absolute left-0 -translate-x-1/2 top-1/2 -translate-y-1/2 z-10 size-10">
			{isActive && !reduceMotion
				? Array.from({ length: SONAR_RING_COUNT }, (_, i) => (
						<motion.span
							key={i}
							className="pointer-events-none absolute inset-0 rounded-full border-2 border-[#00C1CB]"
							initial={{ scale: 0.8, opacity: 0 }}
							animate={{
								scale: 2.0,
								opacity: [0, 0.4, 0],
							}}
							transition={{
								duration: 2.8,
								repeat: Infinity,
								ease: "linear",
								delay: i * 1.4,
							}}
						/>
					))
				: null}
			<motion.div
				initial={false}
				animate={{ scale: isActive && !reduceMotion ? 1.15 : 1 }}
				transition={{ type: "spring", stiffness: 400, damping: 25 }}
				className={cn(
					"relative flex size-10 items-center justify-center rounded-full text-base font-bold transition-colors duration-300",
					isActive
						? "bg-[#0f5384] text-white"
						: "border-2 border-slate-200 bg-slate-50 text-slate-400 shadow-sm",
				)}
			>
				{step}
			</motion.div>
		</div>
	);
}

function HowItWorksStepCard({
	item,
	isActive,
}: {
	item: (typeof HOW_IT_WORKS_STEPS)[number];
	isActive: boolean;
}) {
	const reduceMotion = useReducedMotion();

	return (
		<motion.div
			className={cn(
				"relative w-full origin-center",
				isActive ? "z-[2]" : "z-0 opacity-80",
			)}
			initial={false}
			animate={
				isActive
					? { scale: reduceMotion ? 1 : 1.04, y: reduceMotion ? 0 : -4 }
					: { scale: 1, y: 0 }
			}
			transition={{
				type: "spring",
				stiffness: 420,
				damping: 28,
				mass: 0.7,
			}}
		>
			{/* Teal border glow — sits outside overflow:hidden on .landing-frosted-card */}
			<div
				aria-hidden
				className={cn(
					"pointer-events-none absolute -inset-px rounded-[0.8rem] transition-opacity duration-300",
					"border border-[#00C1CB]",
					"shadow-[0_0_10px_rgba(0,193,203,0.45),0_0_20px_rgba(0,193,203,0.28)]",
					isActive ? "opacity-100" : "opacity-0",
				)}
			/>
			<LandingFrostedCard
				className={cn(
					"relative z-[1] w-full h-full",
					isActive && "!bg-white !border-transparent",
				)}
				contentClassName="px-4 pb-4 pt-5 sm:px-5 sm:pb-5 sm:pt-6"
			>
				<div className="flex items-start gap-3">
					<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#00C1CB]/15 via-[#0E638F]/10 to-[#162768]/10 border border-slate-200">
						<item.icon className="h-4 w-4 text-[#0f5384]" />
					</div>
					<div className="min-w-0 flex-1">
						<p className="text-[10px] font-semibold uppercase tracking-wider text-[#0f5384]">
							Step {item.step}
						</p>
						<h3 className="mt-0.5 text-sm font-semibold sidebar-gradient-text leading-snug">
							{item.title}
						</h3>
						<p className="mt-1.5 text-xs text-slate-600 leading-relaxed line-clamp-3">
							{item.description}
						</p>
					</div>
				</div>
			</LandingFrostedCard>
		</motion.div>
	);
}

const DESKTOP_QUERY = "(min-width: 1024px)";

export default function HowItWorks() {
	const reduceMotion = useReducedMotion();
	const videoRef = useRef<HTMLVideoElement>(null);
	const sectionRef = useRef<HTMLDivElement>(null);
	const isInView = useInView(sectionRef, { margin: "-20% 0px" });
	const [activeStep, setActiveStep] = useState<number>(1);
	const [isDesktop, setIsDesktop] = useState(false);
	const confettiPlayedRef = useRef(false);
	const step4CardRef = useRef<HTMLDivElement>(null);

	const rightColRef = useRef<HTMLDivElement>(null);
	const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
	const [stepOffsets, setStepOffsets] = useState<number[]>([0, 0, 0, 0]);

	useEffect(() => {
		const mediaQuery = window.matchMedia(DESKTOP_QUERY);
		const update = () => setIsDesktop(mediaQuery.matches);
		update();
		mediaQuery.addEventListener("change", update);
		return () => mediaQuery.removeEventListener("change", update);
	}, []);

	useEffect(() => {
		if (!isDesktop || activeStep !== 4 || confettiPlayedRef.current) return;
		confettiPlayedRef.current = true;

		const card = step4CardRef.current;
		let origin = { x: 0.78, y: 0.45 };
		if (card) {
			const rect = card.getBoundingClientRect();
			origin = {
				x: (rect.left + rect.width / 2) / window.innerWidth,
				y: (rect.top + rect.height / 2) / window.innerHeight,
			};
		}

		fireCaalmConfetti({ count: 90, origin });
	}, [activeStep, isDesktop]);

	useEffect(() => {
		if (!isDesktop || !rightColRef.current) return;

		const ro = new ResizeObserver(() => {
			const videoEl = videoRef.current;
			const videoHeight = videoEl?.parentElement?.offsetHeight || 288;

			const offsets = stepRefs.current.map((el) => {
				if (!el) return 0;
				// Align the center of the video with the center of the card
				return el.offsetTop + el.offsetHeight / 2 - videoHeight / 2;
			});
			setStepOffsets(offsets);
		});

		ro.observe(rightColRef.current);
		stepRefs.current.forEach((el) => {
			if (el) ro.observe(el);
		});

		return () => ro.disconnect();
	}, [isDesktop]);

	useEffect(() => {
		if (!isDesktop) return;
		const video = videoRef.current;
		if (!video) return;

		if (isInView) {
			video.play().catch(() => {});
		} else {
			video.pause();
		}
	}, [isInView, isDesktop]);

	const handleTimeUpdate = () => {
		const video = videoRef.current;
		if (!video) return;

		const t = video.currentTime;
		if (t >= STEP_TIMES[4]) setActiveStep(4);
		else if (t >= STEP_TIMES[3]) setActiveStep(3);
		else if (t >= STEP_TIMES[2]) setActiveStep(2);
		else setActiveStep(1);
	};

	return (
		<LandingSection id="how-it-works" className="landing-soft-brand-wash">
			<motion.div
				ref={sectionRef}
				className="max-w-7xl mx-auto"
				variants={staggerSlow}
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
			>
				<motion.div variants={fadeUp} className="text-center mb-10 sm:mb-12">
					<div className="mb-4 flex justify-center">
						<div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[#F1F9FF] px-3 py-1 shadow-sm">
							<span className="inline-flex items-center justify-center size-6 rounded-full bg-slate-700/10 ring-1 ring-slate-200">
								<Workflow className="h-3.5 w-3.5 text-slate-700" />
							</span>
							<span className="text-slate-700 text-sm">How it works</span>
						</div>
					</div>
					<h2 className="text-2xl sm:text-3xl md:text-[2.75em] sidebar-gradient-text landing-section-title leading-tight">
						Explore our simple process
					</h2>
					<p className="mt-3 text-slate-600 max-w-3xl mx-auto text-sm sm:text-base">
						Start with ease and keep compliance under control with clear
						ownership at every step.
					</p>
				</motion.div>

				{isDesktop ? (
					<div className="flex items-start justify-between gap-12 xl:gap-20 w-full max-w-[70rem] mx-auto pt-8 lg:pt-16 pb-12 lg:pb-32">
						{/* Left: Video */}
						<div className="w-[45%] flex justify-end shrink-0 relative">
							<motion.div
								variants={fadeRight}
								initial="hidden"
								whileInView="visible"
								viewport={viewportOnce}
								animate={{ y: stepOffsets[activeStep - 1] || 0 }}
								transition={
									reduceMotion
										? { duration: 0 }
										: { type: "spring", stiffness: 120, damping: 20 }
								}
								className="w-full max-w-[26rem] relative z-10"
							>
								<div className="overflow-hidden rounded-2xl border border-white/70 bg-white/60 shadow-[0_12px_40px_rgba(15,23,42,0.18)] backdrop-blur-md relative z-10">
									<video
										ref={videoRef}
										src="/assets/video/onboarding-steps.mp4"
										muted
										playsInline
										loop
										onTimeUpdate={handleTimeUpdate}
										className="w-full h-auto aspect-video object-contain object-center brightness-[1.09] contrast-[1.04]"
										aria-label="CAALM onboarding steps demo"
									/>
								</div>
							</motion.div>
						</div>

						{/* Right: Timeline + Cards */}
						<div className="flex-1 relative max-w-[28rem]" ref={rightColRef}>
							{/* Vertical line connecting the steps */}
							<div className="absolute left-0 top-6 bottom-6 w-[2px] bg-slate-300" />

							<div className="flex flex-col gap-6 xl:gap-8 w-full">
								{HOW_IT_WORKS_STEPS.map((item, index) => {
									const isActive = activeStep === item.step;
									return (
										<div
											key={item.step}
											className="relative pl-12 sm:pl-14 md:pl-20 w-full"
											ref={(el) => {
												stepRefs.current[index] = el;
											}}
										>
											<TimelineStepNumber
												step={item.step}
												isActive={isActive}
												reduceMotion={reduceMotion}
											/>

											{/* Right line (connects circle to card) - Static base */}
											<div className="absolute top-1/2 -translate-y-1/2 border-t-[2px] border-solid border-slate-300 -z-10 left-6 w-6 sm:w-8 md:w-14" />

											{/* Right dotted line (connects circle to card) - Active glow animated like 'Integrate' */}
											<svg
												className={cn(
													"absolute top-1/2 -translate-y-1/2 -z-10 transition-opacity duration-300 left-6 w-6 sm:w-8 md:w-14 h-1",
													isActive ? "opacity-100" : "opacity-0",
												)}
												aria-hidden
											>
												<motion.path
													d="M0 2 L200 2"
													fill="none"
													stroke={CAALM_COLORS.teal}
													strokeWidth="2"
													strokeDasharray="4 5"
													animate={
														isActive && !reduceMotion
															? { strokeDashoffset: [0, -18] }
															: undefined
													}
													transition={{
														duration: 2.2,
														repeat: Infinity,
														ease: "linear",
													}}
												/>
											</svg>

											{/* Card wrapper */}
											<motion.div
												variants={fadeLeft}
												initial="hidden"
												whileInView="visible"
												viewport={viewportOnce}
												className="w-full"
												ref={item.step === 4 ? step4CardRef : undefined}
											>
												<HowItWorksStepCard item={item} isActive={isActive} />
											</motion.div>
										</div>
									);
								})}
							</div>
						</div>
					</div>
				) : (
					/* Below lg: cards only — original 4×1 timeline on phones; 2×2 from sm up. */
					<>
						<div className="hidden sm:grid grid-cols-2 gap-6">
							{HOW_IT_WORKS_STEPS.map((item) => (
								<motion.div
									key={item.step}
									variants={fadeLeft}
									initial="hidden"
									whileInView="visible"
									viewport={viewportOnce}
								>
									<LandingFrostedCard
										className="h-full"
										contentClassName="p-4 sm:p-6"
									>
										<div className="flex items-start gap-4">
											<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00C1CB]/15 via-[#0E638F]/10 to-[#162768]/10 border border-slate-200">
												<item.icon className="h-6 w-6 text-[#0f5384]" />
											</div>
											<div>
												<p className="text-xs font-semibold uppercase tracking-wider text-[#0f5384]">
													Step {item.step}
												</p>
												<h3 className="mt-1 text-lg font-semibold sidebar-gradient-text">
													{item.title}
												</h3>
												<p className="mt-2 text-sm text-slate-600">
													{item.description}
												</p>
											</div>
										</div>
									</LandingFrostedCard>
								</motion.div>
							))}
						</div>

						<div className="sm:hidden relative space-y-4 pl-6">
							<div
								className="absolute left-2 top-2 bottom-2 w-px bg-slate-200"
								aria-hidden
							/>
							{HOW_IT_WORKS_STEPS.map((item) => (
								<motion.div
									key={item.step}
									variants={fadeLeft}
									initial="hidden"
									whileInView="visible"
									viewport={viewportOnce}
									className="relative"
								>
									<div className="absolute -left-6 top-5 h-3 w-3 rounded-full bg-[#0f5384] ring-4 ring-white" />
									<LandingFrostedCard contentClassName="p-4">
										<p className="text-xs font-semibold uppercase tracking-wider text-[#0f5384]">
											Step {item.step}
										</p>
										<h3 className="mt-1 text-base font-semibold sidebar-gradient-text">
											{item.title}
										</h3>
										<p className="mt-2 text-sm text-slate-600">
											{item.description}
										</p>
									</LandingFrostedCard>
								</motion.div>
							))}
						</div>
					</>
				)}

				<motion.div variants={fadeUp} className="mt-10 flex justify-center">
					<a
						href="#contact"
						className="group inline-flex items-center gap-2 primary-btn px-4 sm:px-6 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-all duration-200"
					>
						See it in action
						<ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
					</a>
				</motion.div>
			</motion.div>
		</LandingSection>
	);
}
