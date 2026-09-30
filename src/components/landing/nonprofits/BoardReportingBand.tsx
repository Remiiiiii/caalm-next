"use client";

import { motion } from "framer-motion";
import { FileBarChart2, Presentation } from "lucide-react";
import LandingSection from "../LandingSection";
import {
	fadeLeft,
	fadeRight,
	scaleIn,
	staggerContainer,
	viewportOnce,
} from "../motion";
import { BOARD_REPORT_ITEMS } from "./nonprofitContent";

const PAGE_STACK = [
	{ title: "Board pack · Q3", rotate: -8, offset: 0 },
	{ title: "Funder snapshot", rotate: -2, offset: 1 },
	{ title: "Campaign ROI", rotate: 5, offset: 2 },
] as const;

export default function BoardReportingBand() {
	return (
		<LandingSection id="reporting" ariaLabelledBy="reporting-heading">
			<motion.div
				className="relative max-w-7xl mx-auto overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#162768] via-[#0f5384] to-[#0E638F] px-6 py-10 sm:px-10 sm:py-14 lg:px-14 shadow-[0_24px_60px_rgba(22,39,104,0.3)]"
				variants={staggerContainer}
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
			>
				<svg
					className="pointer-events-none absolute -left-24 -top-24 size-80 text-white/[0.07]"
					viewBox="0 0 100 100"
					aria-hidden
				>
					<circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" />
					<circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" />
					<circle cx="50" cy="50" r="24" fill="none" stroke="currentColor" />
				</svg>

				<div className="relative grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-10 lg:gap-14 items-center">
					<motion.div variants={fadeRight}>
						<div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1">
							<span className="inline-flex items-center justify-center size-6 rounded-full bg-white/10 ring-1 ring-white/20">
								<Presentation className="h-3.5 w-3.5 text-[#00C1CB]" />
							</span>
							<span className="text-white/90 text-sm">
								Impact & board reporting
							</span>
						</div>
						<h2
							id="reporting-heading"
							className="text-2xl sm:text-3xl md:text-[2.5em] font-semibold leading-tight text-white"
						>
							Walk into the board meeting with the numbers already done
						</h2>
						<p className="mt-3 max-w-xl text-sm sm:text-base text-white/75">
							Reports pull from the same gifts, grants, and spend your team
							records every day. No end-of-quarter export marathon.
						</p>
						<dl className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
							{BOARD_REPORT_ITEMS.map((item) => (
								<motion.div
									key={item.title}
									variants={scaleIn}
									className="rounded-2xl border border-white/15 bg-white/[0.08] p-4 backdrop-blur-sm transition-colors duration-200 hover:bg-white/[0.12]"
								>
									<dt className="text-sm font-semibold text-white">
										{item.title}
									</dt>
									<dd className="mt-1 text-xs sm:text-sm text-white/70">
										{item.detail}
									</dd>
								</motion.div>
							))}
						</dl>
					</motion.div>

					<motion.div
						variants={fadeLeft}
						className="relative mx-auto h-72 w-full max-w-xs"
						aria-hidden
					>
						{PAGE_STACK.map((page) => (
							<motion.div
								key={page.title}
								initial={{ opacity: 0, y: 40, rotate: 0 }}
								whileInView={{
									opacity: 1,
									y: page.offset * 14,
									rotate: page.rotate,
								}}
								viewport={viewportOnce}
								transition={{
									delay: 0.3 + page.offset * 0.15,
									duration: 0.7,
									ease: [0.22, 1, 0.36, 1],
								}}
								className="absolute inset-x-4 top-0 rounded-2xl bg-white p-5 shadow-[0_18px_40px_rgba(0,0,0,0.25)]"
							>
								<div className="flex items-center gap-2">
									<FileBarChart2 className="h-4 w-4 text-[#0f5384]" />
									<p className="text-xs font-semibold text-slate-700">
										{page.title}
									</p>
								</div>
								<div className="mt-4 flex h-24 items-end gap-2">
									{[40, 62, 55, 78, 90].map((h, i) => (
										<span
											key={`${page.title}-${i}`}
											className="flex-1 rounded-t-md bg-gradient-to-t from-[#0f5384] to-[#00C1CB]"
											style={{ height: `${h}%` }}
										/>
									))}
								</div>
								<div className="mt-4 space-y-1.5">
									<div className="h-1.5 w-4/5 rounded-full bg-slate-200" />
									<div className="h-1.5 w-3/5 rounded-full bg-slate-200" />
								</div>
							</motion.div>
						))}
					</motion.div>
				</div>
			</motion.div>
		</LandingSection>
	);
}
