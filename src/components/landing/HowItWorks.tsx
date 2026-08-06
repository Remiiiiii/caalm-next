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

const STEP_TIMES = {
	1: 0.7,
	2: 5.4,
	3: 10.4,
	4: 13.8,
} as const;

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
				contentClassName="px-4 pb-4 pt-6 sm:px-5 sm:pb-5 sm:pt-7"
			>
				<div className="flex items-start gap-3">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00C1CB]/15 via-[#0E638F]/10 to-[#162768]/10 border border-slate-200">
						<item.icon className="h-5 w-5 text-[#0f5384]" />
					</div>
					<div className="min-w-0 flex-1">
						<p className="text-xs font-semibold uppercase tracking-wider text-[#0f5384]">
							Step {item.step}
						</p>
						<h3 className="mt-1 text-sm font-semibold sidebar-gradient-text sm:text-base leading-snug">
							{item.title}
						</h3>
						<p className="mt-2 text-sm text-slate-600 leading-relaxed line-clamp-3">
							{item.description}
						</p>
					</div>
				</div>
			</LandingFrostedCard>
		</motion.div>
	);
}

function HowItWorksStepList({ activeStep }: { activeStep: number }) {
	return (
		<div
			className="flex w-full flex-col gap-4"
			aria-live="polite"
			aria-atomic="true"
			aria-label={`Step ${activeStep} of ${HOW_IT_WORKS_STEPS.length}`}
		>
			{HOW_IT_WORKS_STEPS.map((item) => (
				<motion.div
					key={item.step}
					variants={fadeLeft}
					className="overflow-visible"
				>
					<HowItWorksStepCard item={item} isActive={item.step === activeStep} />
				</motion.div>
			))}
		</div>
	);
}

export default function HowItWorks() {
	const videoRef = useRef<HTMLVideoElement>(null);
	const columnRef = useRef<HTMLDivElement>(null);
	const sectionRef = useRef<HTMLDivElement>(null);
	const isInView = useInView(sectionRef, { margin: "-20% 0px" });
	const [activeStep, setActiveStep] = useState<number>(1);
	const [videoSize, setVideoSize] = useState<{ h: number; w: number } | null>(
		null,
	);
	const confettiPlayedRef = useRef(false);
	const step4CardRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (activeStep !== 4 || confettiPlayedRef.current) return;
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
	}, [activeStep]);

	useEffect(() => {
		const column = columnRef.current;
		if (!column || typeof ResizeObserver === "undefined") return;

		const update = () => {
			const h = column.getBoundingClientRect().height;
			if (h <= 0) return;
			setVideoSize({ h, w: h * (16 / 9) });
		};

		update();
		const ro = new ResizeObserver(update);
		ro.observe(column);
		return () => ro.disconnect();
	}, []);

	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		if (isInView) {
			video.play().catch(() => {});
		} else {
			video.pause();
		}
	}, [isInView]);

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

				{/*
				  Desktop: video height = 2 cards + gap (measured). Width = height × 16/9.
				  Order: 1 TL, 2 TR, 3 BL, 4 BR (2↔3 swapped from sequential sides).
				*/}
				<div
					className="hidden lg:flex lg:items-stretch lg:justify-center gap-5 xl:gap-7"
					aria-live="polite"
					aria-atomic="true"
					aria-label={`Step ${activeStep} of ${HOW_IT_WORKS_STEPS.length}`}
				>
					<div
						ref={columnRef}
						className="flex min-w-0 w-[min(100%,20rem)] xl:w-[min(100%,22rem)] shrink-0 flex-col justify-between gap-5 xl:gap-6"
					>
						<motion.div variants={fadeRight} className="overflow-visible">
							<HowItWorksStepCard
								item={HOW_IT_WORKS_STEPS[0]}
								isActive={activeStep === 1}
							/>
						</motion.div>
						<motion.div variants={fadeRight} className="overflow-visible">
							<HowItWorksStepCard
								item={HOW_IT_WORKS_STEPS[2]}
								isActive={activeStep === 3}
							/>
						</motion.div>
					</div>

					<motion.div
						variants={fadeUp}
						className="relative shrink-0 overflow-hidden rounded-lg border border-white/70 bg-white/60 shadow-[0_12px_40px_rgba(15,23,42,0.18)] backdrop-blur-md"
						style={
							videoSize
								? { height: videoSize.h, width: videoSize.w }
								: { width: "36rem", aspectRatio: "16 / 9" }
						}
					>
						<video
							ref={videoRef}
							src="/assets/video/onboarding-steps.mp4"
							muted
							playsInline
							loop
							onTimeUpdate={handleTimeUpdate}
							className="absolute inset-0 h-full w-full object-contain object-center brightness-[1.09] contrast-[1.04]"
							aria-label="CAALM onboarding steps demo"
						/>
					</motion.div>

					<div className="flex min-w-0 w-[min(100%,20rem)] xl:w-[min(100%,22rem)] shrink-0 flex-col justify-between gap-5 xl:gap-6">
						<motion.div variants={fadeLeft} className="overflow-visible">
							<HowItWorksStepCard
								item={HOW_IT_WORKS_STEPS[1]}
								isActive={activeStep === 2}
							/>
						</motion.div>
						<motion.div
							ref={step4CardRef}
							variants={fadeLeft}
							className="overflow-visible"
						>
							<HowItWorksStepCard
								item={HOW_IT_WORKS_STEPS[3]}
								isActive={activeStep === 4}
							/>
						</motion.div>
					</div>
				</div>

				<div className="lg:hidden">
					<div className="hidden sm:block">
						<HowItWorksStepList activeStep={activeStep} />
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
								className="relative"
							>
								<div className="absolute -left-6 top-5 h-3 w-3 rounded-full bg-[#0f5384] ring-4 ring-white" />
								<LandingFrostedCard contentClassName="px-4 pb-4 pt-7">
									<p className="text-xs font-semibold uppercase tracking-wider text-[#0f5384]">
										Step {item.step}
									</p>
									<h3 className="mt-1 text-base font-semibold sidebar-gradient-text">
										{item.title}
									</h3>
									<p className="mt-2 text-sm text-slate-600 line-clamp-3">
										{item.description}
									</p>
								</LandingFrostedCard>
							</motion.div>
						))}
					</div>
				</div>

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
