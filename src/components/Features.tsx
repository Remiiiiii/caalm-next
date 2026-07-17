"use client";

import { motion } from "framer-motion";
import { CloudCog } from "lucide-react";
import { features } from "../../constants";
import LandingFrostedCard from "./landing/LandingFrostedCard";
import LandingSection from "./landing/LandingSection";
import {
	fadeUp,
	staggerContainer,
	viewportOnce,
} from "./landing/motion";
import SectionDivider2 from "./SectionDivider2";

const Features = () => {
	return (
		<LandingSection id="features" featuresBg>
			<motion.div
				className="max-w-7xl mx-auto"
				variants={staggerContainer}
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
			>
				<motion.div variants={fadeUp} className="text-center mb-10 sm:mb-14">
					<div className="mb-4 flex justify-center">
						<div className="inline-flex mb-2 items-center gap-2 rounded-full border border-slate-200 bg-[#F1F9FF] px-3 py-1 shadow-sm">
							<span className="inline-flex items-center justify-center size-6 rounded-full bg-slate-700/10 ring-1 ring-slate-200">
								<CloudCog className="h-3.5 w-3.5 text-slate-700" />
							</span>
							<span className="text-slate-700 text-sm">
								Effortless automation & deployment
							</span>
						</div>
					</div>
					<h2 className="text-2xl sm:text-3xl md:text-[2.75em] text-center mb-4 leading-tight sidebar-gradient-text landing-section-title">
						Powerful features for complete control
					</h2>
					<p className="text-base sm:text-lg text-slate-700 max-w-2xl sm:max-w-3xl mx-auto">
						Everything you need to streamline compliance, reduce risk, and
						safeguard your organization&apos;s critical agreements.
					</p>
				</motion.div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
					{features.map((feature) => (
						<motion.div key={feature.title} variants={fadeUp}>
							<LandingFrostedCard
								className="h-full"
								contentClassName="p-4 sm:p-6 pt-6"
							>
								<div className="orbit-animated-border w-[70px] h-[70px] mx-auto mb-3">
									<feature.icon className="orbit-3d w-full h-full p-4 rounded-2xl shadow-xl border border-slate-200 text-[#059BB2] ring-2 ring-cyan-100/40" />
								</div>
								<h3 className="text-center text-base sm:text-lg font-semibold sidebar-gradient-text mb-2">
									{feature.title}
								</h3>
								<p className="text-slate-700 text-xs sm:text-sm text-center">
									{feature.description}
								</p>
							</LandingFrostedCard>
						</motion.div>
					))}
				</div>
				<SectionDivider2 />
			</motion.div>
		</LandingSection>
	);
};

export default Features;
