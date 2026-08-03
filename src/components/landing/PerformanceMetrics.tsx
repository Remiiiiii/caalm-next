"use client";

import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import CountUp from "react-countup";
import { Button } from "@/components/ui/button";
import LandingFrostedCard from "./LandingFrostedCard";
import LandingSection from "./LandingSection";
import { PERFORMANCE_METRICS } from "./landingContent";
import { scaleIn, softRise, staggerContainer, viewportOnce } from "./motion";

export default function PerformanceMetrics() {
	return (
		<LandingSection id="performance" className="landing-soft-brand-wash">
			<motion.div
				className="max-w-4xl mx-auto"
				variants={staggerContainer}
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
			>
				<motion.div variants={softRise} className="text-center mb-10 sm:mb-12">
					<div className="mb-4 flex justify-center">
						<div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[#F1F9FF] px-3 py-1 shadow-sm">
							<span className="inline-flex items-center justify-center size-6 rounded-full bg-slate-700/10 ring-1 ring-slate-200">
								<TrendingUp className="h-3.5 w-3.5 text-slate-700" />
							</span>
							<span className="text-slate-700 text-sm">Performance</span>
						</div>
					</div>
					<h2 className="text-2xl sm:text-3xl md:text-[2.75em] sidebar-gradient-text landing-section-title leading-tight">
						Our milestones, your advantage
					</h2>
					<p className="mt-3 text-slate-600 max-w-2xl mx-auto text-sm sm:text-base">
						Measurable outcomes from contracts managed, licenses tracked, and
						audits completed across organizations.
					</p>
				</motion.div>

				<div className="flex flex-wrap justify-center gap-4 sm:gap-5">
					{PERFORMANCE_METRICS.map((metric) => (
						<motion.div key={metric.label} variants={scaleIn}>
							<LandingFrostedCard
								className="w-[12.5rem]"
								contentClassName="px-4 pb-4 pt-7 sm:px-5 sm:pb-5 sm:pt-8 text-center h-full"
							>
								<p className="text-sm font-medium sidebar-gradient-text leading-snug">
									{metric.label}
								</p>
								<div className="flex items-center justify-center text-3xl sm:text-4xl font-bold text-slate-700 pt-2">
									<span>
										<CountUp
											end={metric.value}
											decimals={metric.decimals}
											suffix={metric.suffix}
											duration={2.2}
											enableScrollSpy
											scrollSpyOnce
										/>
									</span>
								</div>
							</LandingFrostedCard>
						</motion.div>
					))}
				</div>

				<motion.div
					variants={softRise}
					className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
				>
					<p className="text-sm sm:text-base text-slate-600 text-center">
						See how CAALM tracks compliance at scale
					</p>
					<a href="#contact">
						<Button className="primary-btn px-4 sm:px-6 cursor-pointer whitespace-nowrap">
							Request a demo
						</Button>
					</a>
				</motion.div>
			</motion.div>
		</LandingSection>
	);
}
