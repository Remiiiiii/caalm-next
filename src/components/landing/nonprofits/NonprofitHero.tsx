"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
	ArrowRight,
	CalendarDays,
	HeartHandshake,
	TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import LandingFrostedCard from "../LandingFrostedCard";
import LandingSection from "../LandingSection";
import { fadeInText, fadeLeft, fadeUp, staggerContainer } from "../motion";

const HERO_STATS = [
	{ label: "YTD raised", value: "$1.24M", change: "+18%" },
	{ label: "Donor retention", value: "64%", change: "+6 pts" },
	{ label: "New donors", value: "312", change: "+41" },
] as const;

const MONTHLY_GIVING = [
	28, 34, 31, 42, 38, 51, 47, 58, 55, 66, 72, 84,
] as const;

function GivingSparkline({ reduceMotion }: { reduceMotion: boolean | null }) {
	const max = Math.max(...MONTHLY_GIVING);
	const points = MONTHLY_GIVING.map((value, i) => {
		const x = (i / (MONTHLY_GIVING.length - 1)) * 300;
		const y = 90 - (value / max) * 80;
		return `${x.toFixed(1)},${y.toFixed(1)}`;
	});
	const line = `M${points.join(" L")}`;
	const area = `${line} L300,100 L0,100 Z`;
	return (
		<svg viewBox="0 0 300 100" className="h-auto w-full" aria-hidden>
			<defs>
				<linearGradient id="npo-hero-area" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#00C1CB" stopOpacity="0.35" />
					<stop offset="100%" stopColor="#00C1CB" stopOpacity="0" />
				</linearGradient>
				<linearGradient id="npo-hero-line" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0%" stopColor="#00C1CB" />
					<stop offset="100%" stopColor="#162768" />
				</linearGradient>
			</defs>
			<motion.path
				d={area}
				fill="url(#npo-hero-area)"
				initial={{ opacity: reduceMotion ? 1 : 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 1, duration: 0.8 }}
			/>
			<motion.path
				d={line}
				fill="none"
				stroke="url(#npo-hero-line)"
				strokeWidth="3"
				strokeLinecap="round"
				strokeLinejoin="round"
				initial={{ pathLength: reduceMotion ? 1 : 0 }}
				animate={{ pathLength: 1 }}
				transition={{ delay: 0.4, duration: 1.4, ease: "easeInOut" }}
			/>
		</svg>
	);
}

export default function NonprofitHero() {
	const reduceMotion = useReducedMotion();

	return (
		<LandingSection
			id="nonprofit-hero"
			fadeTop={false}
			className="pt-28 sm:pt-32 md:pt-36"
		>
			<motion.div
				className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center"
				variants={staggerContainer}
				initial="hidden"
				animate="visible"
			>
				<div className="text-center lg:text-left">
					<motion.div
						variants={fadeUp}
						className="mb-5 flex justify-center lg:justify-start"
					>
						<div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[#F1F9FF] px-3 py-1 shadow-sm">
							<span className="inline-flex items-center justify-center size-6 rounded-full bg-slate-700/10 ring-1 ring-slate-200">
								<HeartHandshake className="h-3.5 w-3.5 text-slate-700" />
							</span>
							<span className="text-slate-700 text-sm">
								CAALM for nonprofits
							</span>
						</div>
					</motion.div>
					<motion.h1
						variants={fadeInText}
						className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] leading-[1.25] landing-section-title sidebar-gradient-text"
					>
						Fundraising, grants, and contracts in one workspace
					</motion.h1>
					<motion.p
						variants={fadeUp}
						className="mt-5 text-slate-600 text-base sm:text-lg max-w-xl mx-auto lg:mx-0"
					>
						Track donors, gifts, restricted funds, volunteers, and events next
						to the grant agreements that pay for your programs. Your finance,
						development, and program teams work from the same records.
					</motion.p>
					<motion.div
						variants={fadeUp}
						className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-3"
					>
						<Link href="/request-a-demo">
							<Button className="primary-btn px-4 sm:px-6 cursor-pointer group">
								<CalendarDays className="h-4 w-4" />
								Book a demo
								<ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
							</Button>
						</Link>
						<Link href="/#pricing">
							<Button className="schedule-demo-btn px-4 sm:px-6 cursor-pointer">
								See pricing
							</Button>
						</Link>
					</motion.div>
				</div>

				<motion.div variants={fadeLeft} className="relative">
					<div
						className="pointer-events-none absolute -inset-8 rounded-[2.5rem] bg-gradient-to-br from-[#00C1CB]/20 via-transparent to-[#162768]/15 blur-3xl"
						aria-hidden
					/>
					<LandingFrostedCard
						className="relative"
						contentClassName="p-5 sm:p-7"
					>
						<div className="flex items-center justify-between gap-3">
							<div>
								<p className="text-xs font-semibold uppercase tracking-wider text-[#0f5384]">
									Development dashboard
								</p>
								<p className="mt-0.5 text-sm text-slate-600">
									Fiscal year to date
								</p>
							</div>
							<span className="inline-flex items-center gap-1 rounded-full border border-green/20 bg-green/10 px-2 py-0.5 text-xs font-medium text-green">
								<TrendingUp className="h-3 w-3" />
								On pace
							</span>
						</div>
						<div className="mt-5 grid grid-cols-3 gap-3">
							{HERO_STATS.map((stat, i) => (
								<motion.div
									key={stat.label}
									initial={{ opacity: 0, y: 12 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.3 + i * 0.12, duration: 0.5 }}
									className="rounded-xl border border-slate-200 bg-white/70 p-3"
								>
									<p className="text-[11px] text-slate-500">{stat.label}</p>
									<p className="mt-1 text-lg sm:text-xl font-bold text-slate-700 tabular-nums">
										{stat.value}
									</p>
									<p className="text-[11px] font-medium text-green tabular-nums">
										{stat.change}
									</p>
								</motion.div>
							))}
						</div>
						<div className="mt-4 rounded-xl border border-slate-200 bg-white/60 p-3">
							<div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
								<span>Monthly giving</span>
								<span>Jul to Jun</span>
							</div>
							<GivingSparkline reduceMotion={reduceMotion} />
						</div>
					</LandingFrostedCard>
				</motion.div>
			</motion.div>
		</LandingSection>
	);
}
