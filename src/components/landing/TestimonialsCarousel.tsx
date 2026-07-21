"use client";

import { motion } from "framer-motion";
import { BadgeCheck } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import LandingFrostedCard from "./LandingFrostedCard";
import LandingSection from "./LandingSection";
import { TESTIMONIALS } from "./landingContent";
import { fadeUp, staggerContainer, viewportOnce } from "./motion";

const MARQUEE_ITEMS = TESTIMONIALS.slice(1);
const CARD_COUNT = MARQUEE_ITEMS.length;
/** Duration in seconds for one full loop */
const LOOP_SECONDS = 40;

export default function TestimonialsCarousel() {
	const [current, setCurrent] = useState(0);
	const featured = TESTIMONIALS[0];
	const looped = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

	useEffect(() => {
		const intervalMs = (LOOP_SECONDS * 1000) / CARD_COUNT;
		const id = window.setInterval(() => {
			setCurrent((prev) => (prev + 1) % CARD_COUNT);
		}, intervalMs);
		return () => window.clearInterval(id);
	}, []);

	return (
		<LandingSection
			id="feedback"
			ariaLabelledBy="feedback-heading"
			fadeTop={false}
			fadeBottom={false}
			bleed={
				<>
					<div className="relative overflow-x-hidden overflow-y-visible py-2">
						<div
							className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-24 sm:w-40 md:w-52"
							style={{
								background:
									"linear-gradient(to right, #fff 0%, #fff 35%, rgba(255,255,255,0.85) 55%, transparent 100%)",
							}}
							aria-hidden
						/>
						<div
							className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-24 sm:w-40 md:w-32"
							style={{
								background:
									"linear-gradient(to left, #fff 0%, #fff 35%, rgba(255,255,255,0.85) 55%, transparent 100%)",
							}}
							aria-hidden
						/>
						<div
							className="flex w-max flex-row gap-4 animate-marquee hover::paused"
							style={{ animationDuration: `${LOOP_SECONDS}s` }}
						>
							{looped.map((t, i) => (
								<article
									key={`${t.name}-${i}`}
									className="w-[min(280px,85vw)] sm:w-[300px] shrink-0 landing-frosted-card landing-frosted-card-marquee"
								>
									<div className="glass-card-cap" />
									<div className="relative z-[1] h-full p-5 flex flex-col justify-between min-h-[200px]">
										<p className="text-slate-700 text-sm leading-relaxed">
											<span
												className="sidebar-gradient-text text-xl align-top mr-1"
												aria-hidden
											>
												&ldquo;
											</span>
											{t.quote}
											<span
												className="sidebar-gradient-text text-xl align-top ml-1"
												aria-hidden
											>
												&rdquo;
											</span>
										</p>
										<div className="mt-4 flex items-center gap-3">
											<Image
												src={t.image}
												alt={t.name}
												width={36}
												height={36}
												className="rounded-full ring-1 ring-slate-200"
											/>
											<div>
												<p className="text-sm font-semibold text-slate-800">
													{t.name}
												</p>
												<p className="text-xs text-slate-500">{t.role}</p>
											</div>
										</div>
									</div>
								</article>
							))}
						</div>
					</div>

					<div
						className="mt-4 flex justify-center gap-2 px-4"
						role="tablist"
						aria-label="Testimonial slides"
					>
						{MARQUEE_ITEMS.map((t, i) => (
							<button
								key={t.name}
								type="button"
								aria-label={`Slide ${i + 1}`}
								aria-current={current === i}
								onClick={() => setCurrent(i)}
								className={cn(
									"h-2 rounded-full transition-all duration-200 cursor-pointer",
									current === i
										? "bg-[#0f5384] w-5"
										: "bg-slate-300 hover:bg-slate-400 w-2",
								)}
							/>
						))}
					</div>
				</>
			}
		>
			<motion.div
				className="max-w-6xl mx-auto"
				variants={staggerContainer}
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
			>
				<motion.div variants={fadeUp} className="mb-6 flex justify-center">
					<div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[#F1F9FF] px-3 py-1 shadow-sm">
						<span className="inline-flex items-center justify-center size-6 rounded-full bg-slate-700/10 ring-1 ring-slate-200">
							<BadgeCheck className="h-3.5 w-3.5 text-slate-700" />
						</span>
						<span className="text-slate-700 text-sm">Client insights</span>
					</div>
				</motion.div>

				<motion.h2
					id="feedback-heading"
					variants={fadeUp}
					className="text-center text-2xl sm:text-3xl md:text-[2.75em] sidebar-gradient-text landing-section-title leading-tight"
				>
					What our clients say
				</motion.h2>
				<motion.p
					variants={fadeUp}
					className="mt-3 text-center text-slate-600 text-sm sm:text-base max-w-2xl mx-auto"
				>
					Hear how teams keep contracts, licenses, and audits on track with
					CAALM.
				</motion.p>

				<motion.div variants={fadeUp} className="mt-10">
					<LandingFrostedCard contentClassName="p-6 sm:p-8">
						<p className="text-lg sm:text-xl text-slate-800 leading-relaxed">
							<span className="sidebar-gradient-text text-2xl mr-1" aria-hidden>
								&ldquo;
							</span>
							{featured.quote}
							<span className="sidebar-gradient-text text-2xl ml-1" aria-hidden>
								&rdquo;
							</span>
						</p>
						<div className="mt-5 flex items-center gap-3">
							<Image
								src={featured.image}
								alt={featured.name}
								width={44}
								height={44}
								className="rounded-full ring-1 ring-slate-200"
							/>
							<div>
								<p className="text-sm font-semibold text-slate-800">
									{featured.name}
								</p>
								<p className="text-xs text-slate-500">{featured.role}</p>
							</div>
						</div>
					</LandingFrostedCard>
				</motion.div>
			</motion.div>
		</LandingSection>
	);
}
