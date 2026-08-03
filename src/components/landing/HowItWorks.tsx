"use client";

import { motion } from "framer-motion";
import { ArrowRight, Workflow } from "lucide-react";
import LandingFrostedCard from "./LandingFrostedCard";
import LandingSection from "./LandingSection";
import { HOW_IT_WORKS_STEPS } from "./landingContent";
import { fadeLeft, fadeUp, staggerSlow, viewportOnce } from "./motion";

export default function HowItWorks() {
	return (
		<LandingSection id="how-it-works" className="landing-soft-brand-wash">
			<motion.div
				className="max-w-6xl mx-auto"
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

				<div className="hidden sm:grid grid-cols-2 gap-6">
					{HOW_IT_WORKS_STEPS.map((item) => (
						<motion.div key={item.step} variants={fadeLeft}>
							<LandingFrostedCard
								className="h-full"
								contentClassName="px-4 pb-4 pt-7 sm:px-6 sm:pb-6 sm:pt-8"
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
								<p className="mt-2 text-sm text-slate-600">
									{item.description}
								</p>
							</LandingFrostedCard>
						</motion.div>
					))}
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
