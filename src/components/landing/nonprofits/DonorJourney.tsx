"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Route } from "lucide-react";
import LandingSection from "../LandingSection";
import { fadeUp, staggerSlow, viewportOnce } from "../motion";
import { DONOR_JOURNEY_STEPS, NONPROFIT_JUMP_LINKS } from "./nonprofitContent";

export default function DonorJourney() {
	const reduceMotion = useReducedMotion();
	const lastIndex = DONOR_JOURNEY_STEPS.length - 1;

	return (
		<LandingSection
			id="journey"
			ariaLabelledBy="journey-heading"
			className="landing-soft-brand-wash"
		>
			<motion.div
				className="max-w-7xl mx-auto"
				variants={staggerSlow}
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
			>
				<motion.nav
					variants={fadeUp}
					aria-label="Nonprofit suite sections"
					className="-mx-4 mb-14 overflow-x-auto px-4 sm:mx-0 sm:px-0"
				>
					<ul className="flex w-max sm:w-auto sm:flex-wrap sm:justify-center gap-2">
						{NONPROFIT_JUMP_LINKS.map((link) => (
							<li key={link.href}>
								<a
									href={link.href}
									className="inline-flex cursor-pointer items-center rounded-full border border-slate-200 bg-white/70 px-3.5 py-1.5 text-sm text-slate-700 shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
								>
									{link.label}
								</a>
							</li>
						))}
					</ul>
				</motion.nav>

				<motion.div variants={fadeUp} className="text-center mb-12">
					<div className="mb-4 flex justify-center">
						<div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[#F1F9FF] px-3 py-1 shadow-sm">
							<span className="inline-flex items-center justify-center size-6 rounded-full bg-slate-700/10 ring-1 ring-slate-200">
								<Route className="h-3.5 w-3.5 text-slate-700" />
							</span>
							<span className="text-slate-700 text-sm">Donor journey</span>
						</div>
					</div>
					<h2
						id="journey-heading"
						className="text-2xl sm:text-3xl md:text-[2.75em] sidebar-gradient-text landing-section-title leading-tight"
					>
						One guest, six steps, zero spreadsheets
					</h2>
					<p className="mt-3 text-slate-600 max-w-3xl mx-auto text-sm sm:text-base">
						Follow a first-time guest from ticket to renewal. Each hand-off
						happens inside CAALM, so nobody retypes a name or chases a receipt.
					</p>
				</motion.div>

				<div className="relative">
					<div
						className="absolute left-5 top-5 bottom-5 w-[2px] bg-slate-200 lg:left-[8.33%] lg:right-[8.33%] lg:top-5 lg:bottom-auto lg:h-[2px] lg:w-auto"
						aria-hidden
					/>
					<motion.div
						className="absolute left-5 top-5 w-[2px] origin-top bg-gradient-to-b from-[#00C1CB] to-[#162768] lg:hidden"
						style={{ bottom: "1.25rem" }}
						initial={{ scaleY: reduceMotion ? 1 : 0 }}
						whileInView={{ scaleY: 1 }}
						viewport={viewportOnce}
						transition={{ duration: 1.6, ease: "easeInOut" }}
						aria-hidden
					/>
					<motion.div
						className="absolute top-5 hidden h-[2px] origin-left bg-gradient-to-r from-[#00C1CB] to-[#162768] lg:block"
						style={{ left: "8.33%", right: "8.33%" }}
						initial={{ scaleX: reduceMotion ? 1 : 0 }}
						whileInView={{ scaleX: 1 }}
						viewport={viewportOnce}
						transition={{ duration: 1.6, ease: "easeInOut" }}
						aria-hidden
					/>
					{reduceMotion ? null : (
						<motion.span
							className="absolute top-[14px] hidden size-3 -translate-x-1/2 rounded-full bg-white ring-4 ring-[#00C1CB] shadow-[0_0_16px_rgba(0,193,203,0.7)] lg:block"
							initial={{ left: "8.33%" }}
							animate={{ left: ["8.33%", "91.67%"] }}
							transition={{
								duration: 7,
								repeat: Infinity,
								repeatDelay: 1.2,
								ease: "easeInOut",
							}}
							aria-hidden
						/>
					)}

					<ol className="relative grid grid-cols-1 gap-8 lg:grid-cols-6 lg:gap-4">
						{DONOR_JOURNEY_STEPS.map((step, i) => (
							<motion.li
								key={step.title}
								variants={fadeUp}
								className="relative flex gap-4 pl-0 lg:flex-col lg:items-center lg:text-center"
							>
								<span
									className={
										i === lastIndex
											? "relative z-[1] flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#00C1CB] to-[#162768] text-white shadow-md"
											: "relative z-[1] flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-[#0f5384] shadow-sm"
									}
								>
									<step.icon className="h-4 w-4" />
								</span>
								<div className="lg:mt-4">
									<p className="text-xs font-semibold uppercase tracking-wider text-[#0f5384]">
										Step {i + 1}
									</p>
									<h3 className="mt-1 text-sm sm:text-base font-semibold text-slate-800">
										{step.title}
									</h3>
									<p className="mt-1 text-xs sm:text-sm text-slate-600">
										{step.detail}
									</p>
								</div>
							</motion.li>
						))}
					</ol>
				</div>
			</motion.div>
		</LandingSection>
	);
}
