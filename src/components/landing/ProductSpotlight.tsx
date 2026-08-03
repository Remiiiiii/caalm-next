"use client";

import {
	AnimatePresence,
	motion,
	useReducedMotion,
} from "framer-motion";
import {
	BarChart3,
	FileText,
	Search,
	ShieldCheck,
	type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { LicenseIcon } from "./LicenseIcon";

type SpotlightTabId = (typeof SPOTLIGHT_TABS)[number]["id"];

const TAB_ICONS: Record<SpotlightTabId, LucideIcon> = {
	contracts: FileText,
	licenses: LicenseIcon as LucideIcon,
	audits: ShieldCheck,
	analytics: BarChart3,
};

const AUTO_TOUR_MS = 2400;
const INTRO_STORAGE_KEY = "caalm-platform-spotlight-intro";

function SpotlightMockPanel({ activeId }: { activeId: SpotlightTabId }) {
	if (activeId === "contracts") return <ContractsMock />;
	if (activeId === "licenses") return <LicensesMock />;
	if (activeId === "audits") return <AuditsMock />;
	return <AnalyticsMock />;
}

export default function ProductSpotlight() {
	const reduceMotion = useReducedMotion();
	const [activeId, setActiveId] = useState<SpotlightTabId>("contracts");
	const active =
		SPOTLIGHT_TABS.find((t) => t.id === activeId) ?? SPOTLIGHT_TABS[0];
	const paperRef = useRef<HTMLDivElement | null>(null);
	const sectionRef = useRef<HTMLDivElement | null>(null);
	const autoTourTimersRef = useRef<number[]>([]);
	const userInteractedRef = useRef(false);

	const [sectionInView, setSectionInView] = useState(false);

	const clearAutoTour = useCallback(() => {
		for (const id of autoTourTimersRef.current) {
			window.clearTimeout(id);
		}
		autoTourTimersRef.current = [];
	}, []);

	const selectTab = useCallback(
		(id: SpotlightTabId) => {
			userInteractedRef.current = true;
			clearAutoTour();
			try {
				sessionStorage.setItem(INTRO_STORAGE_KEY, "1");
			} catch {
				/* ignore */
			}
			setActiveId(id);
		},
		[clearAutoTour],
	);

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

	useEffect(() => {
		const el = sectionRef.current;
		if (!el) return;
		const io = new IntersectionObserver(
			([entry]) => setSectionInView(entry.isIntersecting),
			{ threshold: 0.35 },
		);
		io.observe(el);
		return () => io.disconnect();
	}, []);

	useEffect(() => {
		if (!sectionInView || reduceMotion || userInteractedRef.current) {
			return;
		}

		let introDone = false;
		try {
			introDone = sessionStorage.getItem(INTRO_STORAGE_KEY) === "1";
		} catch {
			introDone = false;
		}
		if (introDone) return;

		clearAutoTour();
		setActiveId("contracts");

		const schedule = (fn: () => void, ms: number) => {
			const id = window.setTimeout(fn, ms);
			autoTourTimersRef.current.push(id);
		};

		schedule(() => {
			if (userInteractedRef.current) return;
			setActiveId("licenses");
		}, AUTO_TOUR_MS);

		schedule(() => {
			if (userInteractedRef.current) return;
			setActiveId("audits");
		}, AUTO_TOUR_MS * 2);

		schedule(() => {
			if (userInteractedRef.current) return;
			setActiveId("analytics");
		}, AUTO_TOUR_MS * 3);

		schedule(() => {
			if (userInteractedRef.current) return;
			setActiveId("contracts");
			try {
				sessionStorage.setItem(INTRO_STORAGE_KEY, "1");
			} catch {
				/* ignore */
			}
		}, AUTO_TOUR_MS * 4);

		return clearAutoTour;
	}, [sectionInView, reduceMotion, clearAutoTour]);

	const showFullMock =
		activeId === "contracts" ||
		activeId === "licenses" ||
		activeId === "audits" ||
		activeId === "analytics";

	const contentMotion = reduceMotion
		? {}
		: {
				initial: { opacity: 0, y: 14 },
				animate: { opacity: 1, y: 0 },
				exit: { opacity: 0, y: -10 },
				transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
			};

	return (
		<LandingSection id="platform" fadeTop fadeBottom className="bg-white">
			<motion.div
				ref={sectionRef}
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

				<motion.div variants={softRise} className="mb-8 flex flex-col items-center gap-4">
					<div
						className="inline-flex max-w-full flex-wrap items-center justify-center gap-2 sm:gap-3 rounded-full border border-slate-200 bg-slate-100/90 p-1.5 sm:p-2 shadow-sm"
						role="tablist"
						aria-label="Platform areas"
					>
						{SPOTLIGHT_TABS.map((tab) => {
							const Icon = TAB_ICONS[tab.id];
							const isActive = activeId === tab.id;
							return (
								<button
									key={tab.id}
									type="button"
									role="tab"
									aria-selected={isActive}
									onClick={() => selectTab(tab.id)}
									className={cn(
										"rounded-full px-3 py-2 sm:px-4 sm:py-2.5 text-sm font-semibold transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 focus-visible:ring-offset-2",
										isActive
											? "primary-btn shadow-sm text-white"
											: "text-slate-700 shadow-sm hover:text-slate-900 hover:shadow-md",
									)}
								>
									<span className="inline-flex items-center gap-1.5 sm:gap-2">
										<Icon
											className={cn(
												"h-4 w-4 shrink-0",
												isActive ? "text-white" : "text-[#0f5384]",
											)}
											aria-hidden
										/>
										{tab.label}
									</span>
								</button>
							);
						})}
					</div>
					<div
						className="flex items-center justify-center gap-2.5"
						aria-label="Current platform area"
					>
						{SPOTLIGHT_TABS.map((tab) => {
							const isActive = activeId === tab.id;
							return (
								<button
									key={tab.id}
									type="button"
									onClick={() => selectTab(tab.id)}
									aria-label={tab.label}
									aria-current={isActive ? "true" : undefined}
									className={cn(
										"h-2 w-2 shrink-0 rounded-full transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 focus-visible:ring-offset-2",
										isActive
											? "scale-110 bg-[#078FAB] shadow-sm"
											: "bg-slate-300 hover:bg-slate-400",
									)}
								/>
							);
						})}
					</div>
				</motion.div>

				<motion.div variants={softRise}>
					<div ref={paperRef} className="paper-3d">
						<LandingFrostedCard contentClassName="p-4 sm:p-6 md:p-8 overflow-hidden">
							<AnimatePresence mode="wait" initial={false}>
								<motion.div key={activeId} {...contentMotion}>
									{showFullMock ? (
										<SpotlightMockPanel activeId={activeId} />
									) : (
										<>
											<Link
												href="/sign-in"
												className="mb-6 flex items-center gap-3 rounded-full border border-slate-200 bg-white/80 px-4 py-3 text-slate-500 hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200 cursor-pointer"
											>
												<Search className="h-4 w-4 text-[#0f5384]" />
												<span className="text-sm">
													{active.searchPlaceholder}
												</span>
											</Link>

											<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
												{active.kpis.map((kpi) => (
													<div
														key={`${active.id}-${kpi.label}`}
														className="rounded-xl bg-white/70 border border-white/50 shadow-sm p-4"
													>
														<p className="text-sm text-slate-600">
															{kpi.label}
														</p>
														<p className="mt-1 text-2xl sm:text-3xl font-bold text-slate-800">
															<CountUp
																key={`${active.id}-${kpi.label}-count`}
																end={kpi.value}
																decimals={
																	"decimals" in kpi ? kpi.decimals : 0
																}
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
								</motion.div>
							</AnimatePresence>
						</LandingFrostedCard>
					</div>
				</motion.div>

				<FeatureSpotlightGrid />
			</motion.div>
		</LandingSection>
	);
}
