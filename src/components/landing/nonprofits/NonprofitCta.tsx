"use client";

import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, HeartHandshake } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import LandingSection from "../LandingSection";
import { scaleIn, viewportOnce } from "../motion";

export default function NonprofitCta() {
	return (
		<LandingSection id="contact" className="landing-soft-brand-wash">
			<motion.div
				className="max-w-4xl mx-auto text-center"
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
				variants={scaleIn}
			>
				<div className="mb-4 flex justify-center">
					<span className="inline-flex items-center justify-center size-12 rounded-2xl bg-white/80 border border-slate-200 shadow-sm">
						<HeartHandshake className="h-6 w-6 text-[#0f5384]" />
					</span>
				</div>
				<h2 className="text-2xl sm:text-3xl md:text-4xl sidebar-gradient-text landing-section-title">
					See your donors and grants side by side
				</h2>
				<p className="mt-3 text-slate-600 text-sm sm:text-base max-w-xl mx-auto">
					Bring a sample donor export and one grant agreement. We&apos;ll show
					you the import dry run, the fund mapping, and your first board-ready
					report.
				</p>
				<div className="mt-6 flex flex-wrap items-center justify-center gap-3">
					<Link href="/request-a-demo">
						<Button className="primary-btn px-4 sm:px-6 cursor-pointer group">
							<CalendarDays className="h-4 w-4" />
							Book a demo
							<ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
						</Button>
					</Link>
					<Link href="/sign-in">
						<Button className="schedule-demo-btn px-4 sm:px-6 cursor-pointer group">
							Start free trial
							<ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
						</Button>
					</Link>
				</div>
			</motion.div>
		</LandingSection>
	);
}
