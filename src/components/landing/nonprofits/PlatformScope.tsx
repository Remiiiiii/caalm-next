"use client";

import { motion } from "framer-motion";
import { Layers, Minus, ShieldCheck } from "lucide-react";
import LandingFrostedCard from "../LandingFrostedCard";
import LandingSection from "../LandingSection";
import {
	fadeLeft,
	fadeRight,
	fadeUp,
	scaleIn,
	staggerContainer,
	viewportOnce,
} from "../motion";
import {
	PLATFORM_TIE_INS,
	PRIVACY_POINTS,
	SCOPE_BOUNDARIES,
} from "./nonprofitContent";

export default function PlatformScope() {
	return (
		<LandingSection id="scope" ariaLabelledBy="scope-heading" featuresBg>
			<motion.div
				className="max-w-6xl mx-auto"
				variants={staggerContainer}
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
			>
				<motion.div variants={fadeUp} className="text-center mb-10 sm:mb-12">
					<div className="mb-4 flex justify-center">
						<div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[#F1F9FF] px-3 py-1 shadow-sm">
							<span className="inline-flex items-center justify-center size-6 rounded-full bg-slate-700/10 ring-1 ring-slate-200">
								<Layers className="h-3.5 w-3.5 text-slate-700" />
							</span>
							<span className="text-slate-700 text-sm">Built on CAALM</span>
						</div>
					</div>
					<h2
						id="scope-heading"
						className="text-2xl sm:text-3xl md:text-[2.75em] sidebar-gradient-text landing-section-title leading-tight"
					>
						Same platform, clear limits
					</h2>
					<p className="mt-3 text-slate-600 max-w-3xl mx-auto text-sm sm:text-base">
						The nonprofit suite runs on the contract platform you already know.
						Here&apos;s what it shares, what it leaves to other tools, and how
						it protects supporter data.
					</p>
				</motion.div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{PLATFORM_TIE_INS.map((item) => (
						<motion.div key={item.title} variants={scaleIn}>
							<LandingFrostedCard
								className="h-full"
								contentClassName="p-5 sm:p-6"
							>
								<div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/40 ring-1 ring-white/60 backdrop-blur-sm">
									<item.icon className="h-5 w-5 text-[#0f5384]" />
								</div>
								<h3 className="text-base font-semibold sidebar-gradient-text">
									{item.title}
								</h3>
								<p className="mt-1.5 text-sm text-slate-600">{item.detail}</p>
							</LandingFrostedCard>
						</motion.div>
					))}
				</div>

				<div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
					<motion.div variants={fadeRight}>
						<LandingFrostedCard
							className="h-full"
							contentClassName="p-5 sm:p-6"
						>
							<h3 className="text-base font-semibold sidebar-gradient-text">
								What CAALM leaves to your other tools
							</h3>
							<ul className="mt-4 space-y-3">
								{SCOPE_BOUNDARIES.map((item) => (
									<li
										key={item.label}
										className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5"
									>
										<span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200">
											<Minus className="h-3 w-3 text-slate-500" />
										</span>
										<div>
											<p className="text-sm font-medium text-slate-700">
												{item.label}
											</p>
											<p className="text-xs text-slate-600">{item.note}</p>
										</div>
									</li>
								))}
							</ul>
						</LandingFrostedCard>
					</motion.div>

					<motion.div variants={fadeLeft}>
						<LandingFrostedCard
							className="h-full"
							contentClassName="p-5 sm:p-6"
						>
							<h3 className="flex items-center gap-2 text-base font-semibold">
								<ShieldCheck className="h-4 w-4 text-[#0f5384]" />
								<span className="sidebar-gradient-text">Supporter privacy</span>
							</h3>
							<ul className="mt-4 space-y-3">
								{PRIVACY_POINTS.map((item) => (
									<li
										key={item.title}
										className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5"
									>
										<span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#00C1CB]/15">
											<item.icon className="h-3 w-3 text-[#0E638F]" />
										</span>
										<div>
											<p className="text-sm font-medium text-slate-700">
												{item.title}
											</p>
											<p className="text-xs text-slate-600">{item.detail}</p>
										</div>
									</li>
								))}
							</ul>
						</LandingFrostedCard>
					</motion.div>
				</div>
			</motion.div>
		</LandingSection>
	);
}
