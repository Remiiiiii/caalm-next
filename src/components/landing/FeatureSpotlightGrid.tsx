"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
	Bell,
	Calendar,
	FileStack,
	KeyRound,
	Mail,
	Search,
} from "lucide-react";
import CountUp from "react-countup";
import { FEATURE_SPOTLIGHT_TILES } from "./landingContent";
import LandingFrostedCard from "./LandingFrostedCard";
import { fadeUp, staggerContainer, viewportOnce } from "./motion";

export default function FeatureSpotlightGrid() {
	const reduceMotion = useReducedMotion();

	return (
		<motion.div
			className="mt-12 sm:mt-16"
			variants={staggerContainer}
			initial="hidden"
			whileInView="visible"
			viewport={viewportOnce}
		>
			<motion.div variants={fadeUp} className="text-center mb-8">
				<h3 className="text-xl sm:text-2xl md:text-3xl sidebar-gradient-text landing-section-title">
					Built for the moments that matter
				</h3>
				<p className="mt-2 text-sm text-slate-600 max-w-xl mx-auto">
					Interactive previews of the workflows teams use every day inside CAALM.
				</p>
			</motion.div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
				{FEATURE_SPOTLIGHT_TILES.map((tile) => (
					<motion.div
						key={tile.id}
						variants={fadeUp}
						whileHover={reduceMotion ? undefined : { y: -4 }}
						transition={{ duration: 0.2 }}
					>
						<LandingFrostedCard className="h-full min-h-[180px]" contentClassName="p-4 sm:p-5">
							{tile.id === "search" && (
								<>
									<p className="text-sm font-semibold sidebar-gradient-text mb-3">
										{tile.title}
									</p>
									<div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-2.5 text-sm text-slate-500">
										<Search className="h-4 w-4 text-[#0f5384]" />
										<span className="relative">
											{tile.subtitle}
											<span
												className="ml-0.5 inline-block h-4 w-0.5 bg-[#0f5384] align-middle animate-pulse"
												aria-hidden
											/>
										</span>
									</div>
								</>
							)}

							{tile.id === "rings" && "metrics" in tile && (
								<>
									<p className="text-sm font-semibold sidebar-gradient-text mb-4">
										{tile.title}
									</p>
									<div className="flex justify-around gap-2">
										{tile.metrics.map((m) => (
											<div key={m.label} className="text-center">
												<div className="mx-auto mb-1 flex h-14 w-14 items-center justify-center rounded-full border-4 border-[#03AFBF]/40 bg-white/60 text-sm font-bold text-slate-800">
													<CountUp
														end={m.value}
														suffix="%"
														duration={1.6}
														enableScrollSpy
														scrollSpyOnce
													/>
												</div>
												<p className="text-[10px] text-slate-500">{m.label}</p>
											</div>
										))}
									</div>
								</>
							)}

							{tile.id === "reports" && (
								<>
									<p className="text-sm font-semibold sidebar-gradient-text mb-3">
										{tile.title}
									</p>
									<motion.div
										className="flex flex-col items-center py-2"
										animate={
											reduceMotion ? undefined : { y: [0, -6, 0] }
										}
										transition={
											reduceMotion
												? undefined
												: { duration: 3.5, repeat: Infinity, ease: "easeInOut" }
										}
									>
										<div className="relative flex h-16 w-20 items-end justify-center">
											<div className="absolute bottom-2 h-12 w-16 rounded-md bg-[#0f5384]/15 border border-[#0f5384]/20" />
											<div className="absolute bottom-4 h-10 w-14 rounded-md bg-white border border-slate-200 shadow-sm flex items-center justify-center">
												<FileStack className="h-5 w-5 text-[#0f5384]" />
											</div>
										</div>
										<p className="mt-2 text-xs text-slate-600 text-center">
											{tile.subtitle}
										</p>
									</motion.div>
								</>
							)}

							{tile.id === "integrations" && (
								<>
									<p className="text-sm font-semibold sidebar-gradient-text mb-3">
										{tile.title}
									</p>
									<div className="relative mx-auto h-24 w-24">
										<motion.div
											className="absolute inset-0"
											initial={false}
											animate={
												reduceMotion ? undefined : { rotate: 360 }
											}
											transition={
												reduceMotion
													? undefined
													: {
															duration: 18,
															repeat: Infinity,
															ease: "linear",
														}
											}
										>
											{[Calendar, Mail, KeyRound].map((Icon, i) => {
												const angle = (i * 120 * Math.PI) / 180;
												const x = Math.round(36 + Math.cos(angle) * 32);
												const y = Math.round(36 + Math.sin(angle) * 32);
												return (
													<span
														key={Icon.displayName ?? i}
														className="absolute flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm"
														style={{ left: `${x}px`, top: `${y}px` }}
													>
														<Icon className="h-3.5 w-3.5 text-[#0f5384]" />
													</span>
												);
											})}
										</motion.div>
										<span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[9px] font-semibold text-slate-600 text-center leading-tight">
											sync
										</span>
									</div>
									<p className="mt-2 text-xs text-slate-600 text-center">
										{tile.subtitle}
									</p>
								</>
							)}

							{tile.id === "ownership" && "chips" in tile && (
								<>
									<p className="text-sm font-semibold sidebar-gradient-text mb-3">
										{tile.title}
									</p>
									<div className="flex flex-wrap gap-2">
										{tile.chips.map((chip, i) => (
											<motion.span
												key={chip}
												className="rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-xs text-slate-700"
												initial={reduceMotion ? false : { opacity: 0, y: 8 }}
												whileInView={{ opacity: 1, y: 0 }}
												viewport={viewportOnce}
												transition={{ delay: i * 0.08 }}
											>
												{chip}
											</motion.span>
										))}
									</div>
								</>
							)}

							{tile.id === "alerts" && "progress" in tile && (
								<>
									<p className="text-sm font-semibold sidebar-gradient-text mb-2">
										{tile.title}
									</p>
									<p className="text-xs text-slate-600 mb-3">{tile.subtitle}</p>
									<div className="flex items-center gap-2 mb-2">
										<Bell className="h-4 w-4 text-[#0f5384]" />
										<span className="text-xs font-medium text-slate-700">
											Escalation coverage
										</span>
									</div>
									<div className="h-2 rounded-full bg-slate-200 overflow-hidden">
										<motion.div
											className="h-full rounded-full bg-gradient-to-r from-[#00C1CB] to-[#0f5384]"
											initial={{ width: 0 }}
											whileInView={{ width: `${tile.progress}%` }}
											viewport={viewportOnce}
											transition={{ duration: 1.2, ease: "easeOut" }}
										/>
									</div>
								</>
							)}
						</LandingFrostedCard>
					</motion.div>
				))}
			</div>
		</motion.div>
	);
}
