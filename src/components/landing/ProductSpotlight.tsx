"use client";

import { motion } from "framer-motion";
import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import CountUp from "react-countup";
import { cn } from "@/lib/utils";
import FeatureSpotlightGrid from "./FeatureSpotlightGrid";
import LandingFrostedCard from "./LandingFrostedCard";
import LandingSection from "./LandingSection";
import { SPOTLIGHT_TABS } from "./landingContent";
import { fadeIn, softRise, staggerContainer, viewportOnce } from "./motion";
import AnalyticsMock from "./spotlight/AnalyticsMock";
import AuditsMock from "./spotlight/AuditsMock";
import ContractsMock from "./spotlight/ContractsMock";
import LicensesMock from "./spotlight/LicensesMock";

export default function ProductSpotlight() {
	const [activeId, setActiveId] =
		useState<(typeof SPOTLIGHT_TABS)[number]["id"]>("contracts");
	const active =
		SPOTLIGHT_TABS.find((t) => t.id === activeId) ?? SPOTLIGHT_TABS[0];
	const paperRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const el = paperRef.current;
		if (!el) return;
		const io = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					el.classList.add("is-visible");
				} else {
					el.classList.remove("is-visible");
				}
			},
			{ threshold: 0.25 },
		);
		io.observe(el);
		return () => io.disconnect();
	}, []);

	const showFullMock =
		activeId === "contracts" ||
		activeId === "licenses" ||
		activeId === "audits" ||
		activeId === "analytics";

	return (
		<LandingSection id="platform" fadeTop fadeBottom className="bg-white">
			<motion.div
				className="max-w-6xl mx-auto"
				variants={staggerContainer}
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
			>
				<motion.div variants={fadeIn} className="text-center mb-8 sm:mb-10">
					<div className="mb-4 flex justify-center">
						<div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[#F1F9FF] px-3 py-1 shadow-sm">
							<span className="inline-flex items-center justify-center size-6 rounded-full bg-slate-700/10 ring-1 ring-slate-200">
								<Search className="h-3.5 w-3.5 text-slate-700" />
							</span>
							<span className="text-slate-700 text-sm">Platform overview</span>
						</div>
					</div>
					<h2 className="text-2xl sm:text-3xl md:text-[2.75em] sidebar-gradient-text landing-section-title leading-tight">
						See CAALM in action
					</h2>
					<p className="mt-3 text-slate-600 max-w-2xl mx-auto text-sm sm:text-base">
						Switch between contracts, licenses, audits, and analytics. The same
						live oversight your teams use every day.
					</p>
				</motion.div>

				<motion.div
					variants={softRise}
					className="flex flex-wrap justify-center gap-2 mb-8"
					role="tablist"
					aria-label="Platform areas"
				>
					{SPOTLIGHT_TABS.map((tab) => (
						<button
							key={tab.id}
							type="button"
							role="tab"
							aria-selected={activeId === tab.id}
							onClick={() => setActiveId(tab.id)}
							className={cn(
								"px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
								activeId === tab.id
									? "primary-btn text-white"
									: "bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300",
							)}
						>
							{tab.label}
						</button>
					))}
				</motion.div>

				<motion.div variants={softRise}>
					<div ref={paperRef} className="paper-3d">
						<LandingFrostedCard contentClassName="p-4 sm:p-6 md:p-8">
							{showFullMock ? (
								activeId === "contracts" ? (
									<ContractsMock key="contracts" />
								) : activeId === "licenses" ? (
									<LicensesMock key="licenses" />
								) : activeId === "audits" ? (
									<AuditsMock key="audits" />
								) : (
									<AnalyticsMock key="analytics" />
								)
							) : (
								<>
									<Link
										href="/sign-in"
										className="mb-6 flex items-center gap-3 rounded-full border border-slate-200 bg-white/80 px-4 py-3 text-slate-500 hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200 cursor-pointer"
									>
										<Search className="h-4 w-4 text-[#0f5384]" />
										<span className="text-sm">{active.searchPlaceholder}</span>
									</Link>

									<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
										{active.kpis.map((kpi) => (
											<div
												key={`${active.id}-${kpi.label}`}
												className="rounded-xl bg-white/70 border border-white/50 shadow-sm p-4"
											>
												<p className="text-sm text-slate-600">{kpi.label}</p>
												<p className="mt-1 text-2xl sm:text-3xl font-bold text-slate-800">
													<CountUp
														key={`${active.id}-${kpi.label}-count`}
														end={kpi.value}
														decimals={"decimals" in kpi ? kpi.decimals : 0}
														prefix={"prefix" in kpi ? kpi.prefix : ""}
														suffix={kpi.suffix}
														duration={1.4}
													/>
												</p>
											</div>
										))}
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
										{active.stats.map((stat) => (
											<div
												key={`${active.id}-${stat.label}`}
												className="rounded-lg bg-white/60 border border-slate-100 p-3 sm:p-4"
											>
												<p className="text-xs sm:text-sm text-slate-600">
													{stat.label}
												</p>
												<p className="mt-1 text-xl sm:text-2xl font-bold text-slate-800">
													{stat.value}
												</p>
											</div>
										))}
									</div>
								</>
							)}
						</LandingFrostedCard>
					</div>
				</motion.div>

				<FeatureSpotlightGrid />
			</motion.div>
		</LandingSection>
	);
}
