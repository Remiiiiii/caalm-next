"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import Logo from "../Logo";
import SectionDivider from "../SectionDivider";
import SignupSuccessBanner from "../SignupSuccessBanner";
import { TRUSTED_BRAND_LOGOS } from "./landingContent";
import { fadeUp, staggerContainer } from "./motion";
import PillSwing3D from "./PillSwing3D";
import ShimmerBadge from "./ShimmerBadge";

const VIDEO_SRC = "/assets/video/wave.mp4";

/** Crossfade lines under the hero H1 — previous copy + current block */
const HERO_CROSSFADE_LINES = [
	"Centralize contracts, audits, and licenses. Automate renewals, prevent missed deadlines, and protect your organization from compliance risk.",
	"Streamline your compliance and agreement processes with CAALM Solutions.",
	"Caalm eliminates fragmented document storage and manual tracking.",
	"Streamline your entire contract lifecycle with our end-to-end solutions.",
	"Secure your compliance, prevent missed deadlines, and protect your organization from financial and reputational risks.",
] as const;

const CROSSFADE_MS = 5500;
const CROSSFADE_EASE_MS = 1800;

function safePlay(video: HTMLVideoElement | null) {
	if (!video) return;
	const result = video.play();
	if (result !== undefined) {
		result.catch(() => {});
	}
}

function LogoMarquee() {
	const logos = [
		...TRUSTED_BRAND_LOGOS,
		...TRUSTED_BRAND_LOGOS,
		...TRUSTED_BRAND_LOGOS,
	];
	return (
		<div className="relative w-full overflow-hidden py-2">
			<div className="relative mx-auto w-full max-w-3xl overflow-hidden">
				<div
					className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 z-10"
					style={{
						background:
							"linear-gradient(to right, rgba(255,255,255,0.95) 0%, transparent 100%)",
					}}
				/>
				<div
					className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 z-10"
					style={{
						background:
							"linear-gradient(to left, rgba(255,255,255,0.95) 0%, transparent 100%)",
					}}
				/>
				<div
					className="flex w-max flex-row gap-8 animate-marquee whitespace-nowrap"
					style={{ animationDuration: "32s" }}
				>
					{logos.map((logo, i) => (
						<div
							key={`${logo.alt}-${i}`}
							className="flex shrink-0 items-center gap-2 opacity-70"
						>
							<Image
								src={logo.src}
								alt={logo.alt}
								width={120}
								height={28}
								className="h-6 w-auto"
							/>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

export default function LandingHero() {
	const reduceMotion = useReducedMotion();
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const [crossfadeIndex, setCrossfadeIndex] = useState(0);

	useEffect(() => {
		if (reduceMotion) return;
		const interval = window.setInterval(() => {
			setCrossfadeIndex((prev) => (prev + 1) % HERO_CROSSFADE_LINES.length);
		}, CROSSFADE_MS);
		return () => window.clearInterval(interval);
	}, [reduceMotion]);

	useEffect(() => {
		if (reduceMotion) return;
		const video = videoRef.current;
		if (!video) return;

		// Force muted before play — required for autoplay policies
		video.muted = true;
		video.defaultMuted = true;
		video.playsInline = true;
		// Native loop is unreliable on large MP4s in Chromium; also set in JS
		video.loop = true;

		safePlay(video);

		const restartLoop = () => {
			try {
				video.currentTime = 0;
			} catch {
				/* seek can fail mid-decode on large files */
			}
			safePlay(video);
		};

		const onEnded = () => restartLoop();

		const onVisibility = () => {
			if (document.visibilityState === "visible") safePlay(video);
		};

		// If the browser pauses without ending (decode stall), nudge playback
		const onPause = () => {
			if (
				document.visibilityState !== "visible" ||
				video.seeking ||
				reduceMotion
			) {
				return;
			}
			// Near EOF without firing ended — restart; otherwise resume
			if (video.duration && video.currentTime >= video.duration - 0.35) {
				restartLoop();
			} else if (video.paused) {
				safePlay(video);
			}
		};

		video.addEventListener("ended", onEnded);
		video.addEventListener("pause", onPause);
		document.addEventListener("visibilitychange", onVisibility);

		return () => {
			video.removeEventListener("ended", onEnded);
			video.removeEventListener("pause", onPause);
			document.removeEventListener("visibilitychange", onVisibility);
		};
	}, [reduceMotion]);

	return (
		<section className="relative flex flex-col items-center justify-center pt-24 pb-16 overflow-hidden">
			{!reduceMotion ? (
				<video
					ref={videoRef}
					src={VIDEO_SRC}
					autoPlay
					muted
					loop
					playsInline
					preload="auto"
					onEnded={(e) => {
						const video = e.currentTarget;
						video.currentTime = 0;
						safePlay(video);
					}}
					className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
					aria-hidden
				/>
			) : null}

			<div
				className="absolute inset-0 z-10 pointer-events-none landing-grid-bg-soft"
				aria-hidden
			/>

			<div className="relative z-20 w-full mt-2">
				<SectionDivider />
			</div>

			<Suspense fallback={<div />}>
				<SignupSuccessBanner />
			</Suspense>

			<div className="relative z-20 w-full mt-6 md:mt-8">
				<LogoMarquee />
			</div>

			{/* Logo — reserve height; .logo is absolute and would otherwise collapse layout */}
			<div className="relative z-20 w-full mb-12 md:mt-4">
				<div className="relative mx-auto h-[140px] w-[140px]">
					<Logo />
				</div>
			</div>

			{/* Intro tagline — separate flow block below logo */}
			<div className="relative z-20 w-full px-4 sm:px-6 mb-12 md:mb-16">
				<motion.div
					className="mx-auto max-w-4xl text-center"
					variants={staggerContainer}
					initial="hidden"
					animate="visible"
				>
					<motion.h2
						variants={fadeUp}
						className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] font-semibold tracking-tight leading-[1.2] sidebar-gradient-text"
					>
						<span className="block">
							Centralize Contracts Audits and Licenses
						</span>
						<span className="block mt-1">Powered by AI</span>
					</motion.h2>
					<motion.p
						variants={fadeUp}
						className="mt-4 sm:mt-5 text-sm sm:text-base text-slate-600 max-w-xl mx-auto"
					>
						Your journey to data management and compliance starts here
					</motion.p>
				</motion.div>
			</div>

			<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 relative z-20">
				<div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
					<motion.div
						className="flex flex-col gap-4"
						variants={staggerContainer}
						initial="hidden"
						animate="visible"
					>
						<motion.div variants={fadeUp} className="self-center lg:self-start">
							<ShimmerBadge>
								<div className="flex -space-x-2">
									{[1, 2, 3, 4, 5].map((n) => (
										<Image
											key={n}
											src={`/assets/images/${n}.png`}
											alt=""
											width={24}
											height={24}
											className="h-6 w-6 rounded-full border-2 border-white"
											aria-hidden
										/>
									))}
								</div>
								<span className="text-slate-700 text-sm font-medium relative z-1">
									500+ compliance teams
								</span>
							</ShimmerBadge>
						</motion.div>

						<motion.h1
							variants={fadeUp}
							className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] text-center lg:text-left leading-[1.2] sidebar-gradient-text landing-section-title"
						>
							Simplify compliance with{" "}
							<PillSwing3D className="sidebar-gradient-text text-[0.85em] font-extrabold">
								AI-powered
							</PillSwing3D>{" "}
							contract control
						</motion.h1>

						<motion.div
							variants={fadeUp}
							className="relative mt-1 mb-1 min-h-[4.5rem] sm:min-h-[5rem] max-w-xl mx-auto lg:mx-0 w-full"
							aria-live="polite"
							aria-atomic="true"
						>
							{reduceMotion ? (
								<p className="text-base sm:text-lg text-slate-600 text-center lg:text-left">
									{HERO_CROSSFADE_LINES[0]}
								</p>
							) : (
								HERO_CROSSFADE_LINES.map((line, i) => (
									<p
										key={line}
										className={`absolute inset-0 text-base sm:text-lg text-slate-600 text-center lg:text-left transition-opacity ease-in-out ${
											crossfadeIndex === i
												? "opacity-100"
												: "opacity-0 pointer-events-none"
										}`}
										style={{ transitionDuration: `${CROSSFADE_EASE_MS}ms` }}
									>
										{line}
									</p>
								))
							)}
						</motion.div>

						<motion.div
							variants={fadeUp}
							className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mt-2"
						>
							<Link href="/sign-in">
								<Button className="primary-btn px-4 sm:px-6 cursor-pointer group">
									Get Started
									<ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
								</Button>
							</Link>
							<a href="#contact">
								<Button className="schedule-demo-btn px-4 sm:px-6 cursor-pointer group">
									Schedule Demo
									<ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
								</Button>
							</a>
						</motion.div>

						<motion.div
							variants={fadeUp}
							className="flex items-center justify-center lg:justify-start gap-2 mt-2"
						>
							<span className="text-yellow-500 text-lg" aria-hidden>
								★★★★★
							</span>
							<span className="text-slate-700 font-semibold text-sm">
								4.9/5
							</span>
							<span className="text-slate-500 text-sm">based on reviews</span>
						</motion.div>

						<motion.div
							variants={fadeUp}
							className="mt-4 max-w-md mx-auto lg:mx-0 rounded-xl bg-white/80 p-4 shadow-[0_1px_2px_0_rgba(15,23,42,0.06)]"
						>
							<p className="text-slate-800 text-base italic">
								&ldquo;I use Caalm every day to keep all our contracts and
								compliance documents organized. It&rsquo;s so helpful, our team
								never misses a deadline or audit anymore!&rdquo;
							</p>
							<div className="mt-2 flex items-center gap-2">
								<Image
									src="/assets/images/review-avatar.jpg"
									alt="Priya Sharma"
									width={32}
									height={32}
									className="h-8 w-8 rounded-full"
									loading="lazy"
									sizes="32px"
								/>
								<div>
									<p className="text-sm font-semibold text-slate-800">
										Priya Sharma
									</p>
									<p className="text-xs text-slate-500">
										Director of Human Resources at Growthspark
									</p>
								</div>
							</div>
						</motion.div>
					</motion.div>

					<motion.div
						className="relative flex items-center justify-center"
						initial={reduceMotion ? false : { opacity: 0, y: 32 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
					>
						<motion.div
							animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
							transition={
								reduceMotion
									? undefined
									: { duration: 4, repeat: Infinity, ease: "easeInOut" }
							}
							className="relative w-full max-w-[440px]"
						>
							<div
								className="relative rounded-2xl shadow-xl border border-white/60 w-full aspect-square bg-transparent"
								aria-hidden
							/>
						</motion.div>
					</motion.div>
				</div>
			</div>

			<div className="section-fade-bottom" aria-hidden />
		</section>
	);
}
