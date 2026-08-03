"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import type React from "react";
import AuthHeadlineTypewriter from "@/components/auth/AuthHeadlineTypewriter";
import AuthTourFanCards from "@/components/auth/AuthTourFanCards";
import CountUp from "@/components/CountUp";
import DemoBanner from "@/components/DemoBanner";
import { TRUSTED_BRAND_LOGOS } from "@/components/landing/landingContent";
import OrbitingBlocks from "@/components/OrbitingBlocks";
import SplineCanvas from "@/components/SplineCanvas";
import { useSplineWatermarkRemoval } from "@/hooks/useSplineWatermarkRemoval";

/**
 * Match SplineCanvas opacity transition (`ease-in-out`).
 * Longer duration + symmetric ease so copy and robot share the same feel.
 */
const AUTH_FADE_DURATION_S = 1.8;
const authEase = {
	duration: AUTH_FADE_DURATION_S,
	ease: [0.42, 0, 0.58, 1] as const, // CSS ease-in-out
};

const authIntroStagger = {
	hidden: {},
	visible: {
		transition: { staggerChildren: 0.22, delayChildren: 0.16 },
	},
};

const authFadeUp = {
	hidden: { opacity: 0, y: 6 },
	visible: { opacity: 1, y: 0, transition: authEase },
};

/** Opacity-only for sidebar-gradient-text */
const authFadeInText = {
	hidden: { opacity: 0 },
	visible: { opacity: 1, transition: authEase },
};

/** Subhead starts ~0.6s; Spline begins mid-cascade so fades overlap gently */
const SPLINE_ENTRANCE_DELAY_MS = 1100;
const SPLINE_FADE_DURATION_MS = Math.round(AUTH_FADE_DURATION_S * 1000);

const layout = ({ children }: { children: React.ReactNode }) => {
	const reduceMotion = useReducedMotion();
	// Remove Spline watermark badges
	useSplineWatermarkRemoval();
	return (
		<div className="flex min-h-screen flex-col bg-slate-50">
			<DemoBanner />
			<div className="relative flex flex-1 min-h-0 overflow-hidden">
				{/* Video (back) */}
				<video
					autoPlay
					loop
					muted
					playsInline
					className="absolute inset-0 z-0 w-full h-full object-cover"
				>
					<source src="/assets/video/wave.mp4" type="video/mp4" />
				</video>

				{/* Soft gradients above video */}
				<div aria-hidden className="absolute inset-0 z-[1] pointer-events-none">
					<div className="absolute -top-16 -left-10 w-[28rem] h-[28rem] rounded-full bg-[#00c1cb]/12 blur-3xl" />
					<div className="absolute -bottom-16 -right-8 w-[32rem] h-[32rem] rounded-full bg-[#0f5384]/10 blur-3xl" />
					<div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] rounded-full bg-[#00c1cb]/8 blur-3xl" />
				</div>

				{/* Landing grid pattern: full page between .mp4 and framed card */}
				<div
					aria-hidden
					className="absolute inset-0 z-[2] pointer-events-none landing-grid-bg-soft"
				/>

				{/* Framed glass card — transparent so matrix reads continuously underneath */}
				<div className="relative z-10 flex flex-1 min-h-0 p-6">
					<div className="relative flex flex-1 min-h-0 w-full overflow-hidden rounded-2xl border border-white/60 bg-transparent shadow-xl shadow-slate-900/10 ring-1 ring-inset ring-white/40">
						{/* Light wash only — keep matrix visible across full card */}
						<div
							aria-hidden
							className="absolute inset-0 z-0 pointer-events-none bg-white/5"
						/>

						{/* Content */}
						<div className="relative z-10 flex w-full min-h-0">
							{/* Left Side - Marketing Content (hidden on small screens) */}
							<section className="hidden lg:flex lg:w-1/2 items-center justify-end pl-6 xl:pl-8">
								<div className="flex flex-col max-w-2xl w-full space-y-5 md:space-y-6 py-6 pr-2 xl:pr-3">
									{/* Logo → headline → subhead stagger; Spline follows */}
									<motion.div
										className="flex flex-col space-y-5 md:space-y-6"
										variants={authIntroStagger}
										initial={reduceMotion ? false : "hidden"}
										animate="visible"
									>
										<motion.div variants={authFadeUp}>
											<Link href="/">
												<div className="flex items-center gap-3">
													<Image
														src="/assets/images/logo.svg"
														alt="CAALM Logo"
														width={48}
														height={48}
														className="h-auto w-12"
													/>
													<span className="text-2xl font-bold text-light-100">
														CAALM
													</span>
												</div>
											</Link>
										</motion.div>

										{/* Opacity-only: sidebar-gradient-text breaks with transforms */}
										<motion.h1
											variants={authFadeInText}
											className="text-2xl md:text-3xl font-semibold mb-1 leading-tight sidebar-gradient-text max-w-xl"
										>
											Reduce compliance risk with centralized ownership of
											contracts, audits & licenses
										</motion.h1>

										{/* Tour-matched headlines — typewriter cycle */}
										<motion.div
											variants={authFadeUp}
											className="mt-1 max-w-xl w-full"
										>
											<AuthHeadlineTypewriter />
										</motion.div>
									</motion.div>

									{/* Fan stack (behind) + Spline + orbiting icons */}
									<div className="relative w-full h-[420px] xl:h-[460px]">
										<AuthTourFanCards />
										<OrbitingBlocks />

										<SplineCanvas
											scene="/scene.splinecode"
											className="w-full h-full relative z-10"
											delayMs={reduceMotion ? 0 : SPLINE_ENTRANCE_DELAY_MS}
											durationMs={reduceMotion ? 0 : SPLINE_FADE_DURATION_MS}
										/>
									</div>

									{/* Trusted brand logos + social proof */}
									<div className="mt-2">
										<div className="flex flex-wrap items-center justify-start gap-x-6 gap-y-3 pb-4 opacity-70">
											{TRUSTED_BRAND_LOGOS.map((logo) => (
												<div
													key={logo.alt}
													className="flex shrink-0 items-center"
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
										<div className="flex items-center gap-3 border-t border-slate-200/70 pt-4">
											<div className="flex -space-x-2">
												<Image
													src="/assets/images/1.png"
													alt="avatar"
													width={32}
													height={32}
													className="h-auto w-8 rounded-full border-2 border-white shadow-lg"
												/>
												<Image
													src="/assets/images/2.png"
													alt="avatar"
													width={32}
													height={32}
													className="h-auto w-8 rounded-full border-2 border-white shadow-lg"
												/>
												<Image
													src="/assets/images/3.png"
													alt="avatar"
													width={32}
													height={32}
													className="h-auto w-8 rounded-full border-2 border-white shadow-lg"
												/>
												<Image
													src="/assets/images/5.png"
													alt="avatar"
													width={32}
													height={32}
													className="h-auto w-8 rounded-full border-2 border-white shadow-lg"
												/>
											</div>
											<span className="text-sm text-slate-600">
												Trusted by <CountUp />+ innovators worldwide
											</span>
										</div>
									</div>
								</div>
							</section>
							<section className="flex flex-1 flex-col items-center lg:items-start lg:justify-center p-4 sm:p-6 lg:pl-3 lg:pr-8 xl:pr-10 py-8 bg-transparent">
								<div className="mb-6 lg:hidden">
									<Image
										src="/assets/images/logo.svg"
										alt="logo"
										width={50}
										height={50}
										className="h-auto w-[50px]"
									/>
								</div>
								{children}
							</section>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default layout;
