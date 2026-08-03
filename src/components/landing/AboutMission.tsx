"use client";

import { motion } from "framer-motion";
import { Building2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import LandingFrostedCard from "./LandingFrostedCard";
import LandingSection from "./LandingSection";
import { ABOUT_TRUST_BULLETS } from "./landingContent";
import {
	blurIn,
	fadeLeft,
	softRise,
	staggerContainer,
	viewportOnce,
} from "./motion";

export default function AboutMission() {
	return (
		<LandingSection id="about">
			<motion.div
				className="max-w-6xl mx-auto"
				variants={staggerContainer}
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
			>
				<motion.div variants={blurIn} className="text-center mb-10 sm:mb-12">
					<div className="mb-4 flex justify-center">
						<div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[#F1F9FF] px-3 py-1 shadow-sm">
							<span className="inline-flex items-center justify-center size-6 rounded-full bg-slate-700/10 ring-1 ring-slate-200">
								<Building2 className="h-3.5 w-3.5 text-slate-700" />
							</span>
							<span className="text-slate-700 text-sm">About CAALM</span>
						</div>
					</div>
					<h2 className="text-2xl sm:text-3xl md:text-[2.75em] sidebar-gradient-text landing-section-title leading-tight">
						Built for compliance teams who need calm control
					</h2>
					<p className="mt-3 text-slate-600 max-w-2xl mx-auto text-sm sm:text-base">
						We help organizations centralize contracts, licenses, and audits
						with permission-based access, automated alerts, and clear ownership.
					</p>
				</motion.div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
					<motion.div variants={fadeLeft} className="relative">
						<div className="relative overflow-hidden rounded-2xl shadow-xl border border-white/60 w-full aspect-[560/420] bg-slate-100">
							<Image
								src="/assets/video/demo-screenshots/01-dashboard-full.png"
								alt="CAALM dashboard showing contracts, licenses, and compliance overview"
								fill
								className="object-cover object-top"
								sizes="(max-width: 1023px) 100vw, 560px"
							/>
						</div>
					</motion.div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						{ABOUT_TRUST_BULLETS.map((bullet) => (
							<motion.div key={bullet.title} variants={softRise}>
								<LandingFrostedCard
									className="h-full"
									contentClassName="p-4 sm:p-5"
								>
									<div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-700/10">
										<bullet.icon className="h-4 w-4 text-[#0f5384]" />
									</div>
									<h3 className="text-sm font-semibold sidebar-gradient-text">
										{bullet.title}
									</h3>
									<p className="mt-1.5 text-xs sm:text-sm text-slate-600">
										{bullet.description}
									</p>
								</LandingFrostedCard>
							</motion.div>
						))}
					</div>
				</div>

				<motion.div
					variants={softRise}
					className="mt-8 flex flex-wrap justify-center gap-4 text-sm"
				>
					<Link
						href="/privacy"
						className="text-[#0f5384] underline underline-offset-4 hover:opacity-80"
					>
						Privacy policy
					</Link>
					<a
						href="#faq"
						className="text-[#0f5384] underline underline-offset-4 hover:opacity-80"
					>
						Security FAQ
					</a>
				</motion.div>
			</motion.div>
		</LandingSection>
	);
}
