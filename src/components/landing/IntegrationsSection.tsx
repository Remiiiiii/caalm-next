"use client";

import { motion } from "framer-motion";
import { Plug } from "lucide-react";
import LandingFrostedCard from "./LandingFrostedCard";
import LandingSection from "./LandingSection";
import { INTEGRATIONS } from "./landingContent";
import {
	fadeLeft,
	fadeRight,
	staggerContainer,
	viewportOnce,
} from "./motion";

export default function IntegrationsSection() {
	return (
		<LandingSection id="integrations">
			<motion.div
				className="max-w-6xl mx-auto"
				variants={staggerContainer}
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
			>
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
					<motion.div variants={fadeRight}>
						<div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[#F1F9FF] px-3 py-1 shadow-sm">
							<span className="inline-flex items-center justify-center size-6 rounded-full bg-slate-700/10 ring-1 ring-slate-200">
								<Plug className="h-3.5 w-3.5 text-slate-700" />
							</span>
							<span className="text-slate-700 text-sm">Integration</span>
						</div>
						<h2 className="text-2xl sm:text-3xl md:text-[2.5em] sidebar-gradient-text landing-section-title leading-tight">
							Powerful integrations made simple
						</h2>
						<p className="mt-3 text-slate-600 text-sm sm:text-base max-w-lg">
							Connect calendars, email, storage, and SSO into one compliance
							ecosystem so renewals and audits stay visible across your stack.
						</p>

						<div className="mt-6 flex flex-wrap gap-3">
							<div className="rounded-xl border border-slate-200 bg-[#F1F9FF] px-4 py-3">
								<p className="text-2xl font-bold text-slate-800">2x</p>
								<p className="text-xs text-slate-600">Faster renewals*</p>
							</div>
							<div className="rounded-xl border border-slate-200 bg-[#F1F9FF] px-4 py-3">
								<p className="text-2xl font-bold text-slate-800">4x</p>
								<p className="text-xs text-slate-600">
									Fewer missed deadlines*
								</p>
							</div>
						</div>
						<p className="mt-2 text-xs text-slate-500">
							*Illustrative outcomes based on typical compliance workflows.
						</p>
					</motion.div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						{INTEGRATIONS.map((item) => (
							<motion.div key={item.title} variants={fadeLeft}>
								<LandingFrostedCard
									className="h-full"
									contentClassName="p-4 sm:p-5"
								>
									<div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/40 ring-1 ring-white/60 backdrop-blur-sm">
										<item.icon className="h-5 w-5 text-[#0f5384]" />
									</div>
									<h3 className="text-sm font-semibold sidebar-gradient-text">
										{item.title}
									</h3>
									<p className="mt-1.5 text-xs sm:text-sm text-slate-600">
										{item.description}
									</p>
								</LandingFrostedCard>
							</motion.div>
						))}
					</div>
				</div>
			</motion.div>
		</LandingSection>
	);
}
