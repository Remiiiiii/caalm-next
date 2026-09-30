"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
	ArrowRight,
	CalendarClock,
	HandHeart,
	HeartHandshake,
	Landmark,
	PiggyBank,
	QrCode,
	Sparkles,
	TrendingUp,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import LandingFrostedCard from "./LandingFrostedCard";
import LandingSection from "./LandingSection";
import { fadeUp, scaleIn, staggerContainer, viewportOnce } from "./motion";

const DONORS = [
	{
		initials: "MR",
		name: "Maria Reyes",
		note: "Gave $2,500 last week",
		action: "Thank-you call",
	},
	{
		initials: "JO",
		name: "James Okafor",
		note: "Monthly donor, 3 years",
		action: "Impact update",
	},
	{
		initials: "LC",
		name: "Lin Chen",
		note: "Lapsed 11 months",
		action: "Renewal ask",
	},
] as const;

const FUND_SPLIT = [
	{ label: "Restricted", percent: 46, className: "bg-[#162768]" },
	{ label: "Temporarily restricted", percent: 22, className: "bg-[#0E638F]" },
	{ label: "Unrestricted", percent: 32, className: "bg-[#00C1CB]" },
] as const;

const SHIFT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
const SHIFT_FILL = [
	[1, 1, 0],
	[1, 1, 1],
	[1, 0, 0],
	[1, 1, 1],
	[0, 1, 0],
] as const;

const CAMPAIGN_PROGRESS = 0.72;
const RING_RADIUS = 34;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function TileHeader({
	icon: Icon,
	eyebrow,
	title,
	inverted = false,
}: {
	icon: typeof HandHeart;
	eyebrow: string;
	title: string;
	inverted?: boolean;
}) {
	return (
		<div className="flex items-start gap-3">
			<span
				className={cn(
					"flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 backdrop-blur-sm",
					inverted
						? "bg-white/10 ring-white/20 text-[#00C1CB]"
						: "bg-white/40 ring-white/60 text-[#0f5384]",
				)}
			>
				<Icon className="h-5 w-5" />
			</span>
			<div>
				<p
					className={cn(
						"text-xs font-semibold uppercase tracking-wider",
						inverted ? "text-[#00C1CB]" : "text-[#0f5384]",
					)}
				>
					{eyebrow}
				</p>
				<h3
					className={cn(
						"mt-0.5 text-base sm:text-lg font-semibold",
						inverted ? "text-white" : "sidebar-gradient-text",
					)}
				>
					{title}
				</h3>
			</div>
		</div>
	);
}

function BentoTile({
	className,
	children,
}: {
	className?: string;
	children: ReactNode;
}) {
	return (
		<motion.div variants={scaleIn} className={className}>
			<LandingFrostedCard
				className="h-full"
				contentClassName="p-5 sm:p-6 flex flex-col"
			>
				{children}
			</LandingFrostedCard>
		</motion.div>
	);
}

export default function NonprofitSuiteSection() {
	const reduceMotion = useReducedMotion();

	return (
		<LandingSection id="nonprofits" ariaLabelledBy="nonprofits-heading">
			<motion.div
				className="max-w-7xl mx-auto"
				variants={staggerContainer}
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
			>
				<motion.div
					variants={fadeUp}
					className="mb-10 sm:mb-12 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6"
				>
					<div>
						<div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[#F1F9FF] px-3 py-1 shadow-sm">
							<span className="inline-flex items-center justify-center size-6 rounded-full bg-slate-700/10 ring-1 ring-slate-200">
								<HeartHandshake className="h-3.5 w-3.5 text-slate-700" />
							</span>
							<span className="text-slate-700 text-sm">For nonprofits</span>
						</div>
						<h2
							id="nonprofits-heading"
							className="text-2xl sm:text-3xl md:text-[2.75em] sidebar-gradient-text landing-section-title leading-tight"
						>
							Donors, funds, and volunteers next to your contracts
						</h2>
					</div>
					<p className="text-slate-600 text-sm sm:text-base max-w-md">
						Run fundraising and grant compliance in the same workspace your
						finance and legal teams already trust. No second system to
						reconcile.
					</p>
				</motion.div>

				<div className="grid grid-cols-1 md:grid-cols-6 gap-5 sm:gap-6">
					<BentoTile className="md:col-span-3 md:row-span-2">
						<TileHeader
							icon={HandHeart}
							eyebrow="Stewardship"
							title="Know who to thank, and when"
						/>
						<p className="mt-2 text-sm text-slate-600">
							Every constituent gets a profile with giving history. The
							stewardship queue suggests the next best action for each donor.
						</p>
						<ul className="mt-5 space-y-3">
							{DONORS.map((donor, i) => (
								<motion.li
									key={donor.name}
									initial={{ opacity: 0, x: -16 }}
									whileInView={{ opacity: 1, x: 0 }}
									viewport={viewportOnce}
									transition={{ delay: 0.2 + i * 0.15, duration: 0.5 }}
									className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5"
								>
									<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#00C1CB]/20 to-[#162768]/15 text-xs font-semibold text-[#0f5384]">
										{donor.initials}
									</span>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium text-slate-700">
											{donor.name}
										</p>
										<p className="truncate text-xs text-slate-500">
											{donor.note}
										</p>
									</div>
									<span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-blue/20 bg-blue/10 px-2 py-0.5 text-xs font-medium text-blue">
										<Sparkles className="h-3 w-3" />
										{donor.action}
									</span>
								</motion.li>
							))}
						</ul>
					</BentoTile>

					<BentoTile className="md:col-span-3">
						<div className="flex items-center justify-between gap-4">
							<div>
								<TileHeader
									icon={PiggyBank}
									eyebrow="Gifts & campaigns"
									title="Every gift, tied to a goal"
								/>
								<p className="mt-2 text-sm text-slate-600 max-w-xs">
									Log gifts and pledges, then watch campaigns fill in real time.
								</p>
							</div>
							<div className="relative size-24 shrink-0">
								<svg
									viewBox="0 0 80 80"
									className="size-full -rotate-90"
									aria-hidden
								>
									<defs>
										<linearGradient
											id="npo-ring-grad"
											x1="0"
											y1="0"
											x2="1"
											y2="1"
										>
											<stop offset="0%" stopColor="#00C1CB" />
											<stop offset="100%" stopColor="#162768" />
										</linearGradient>
									</defs>
									<circle
										cx="40"
										cy="40"
										r={RING_RADIUS}
										fill="none"
										stroke="#e2e8f0"
										strokeWidth="8"
									/>
									<motion.circle
										cx="40"
										cy="40"
										r={RING_RADIUS}
										fill="none"
										stroke="url(#npo-ring-grad)"
										strokeWidth="8"
										strokeLinecap="round"
										strokeDasharray={RING_CIRCUMFERENCE}
										initial={{
											strokeDashoffset: reduceMotion
												? RING_CIRCUMFERENCE * (1 - CAMPAIGN_PROGRESS)
												: RING_CIRCUMFERENCE,
										}}
										whileInView={{
											strokeDashoffset:
												RING_CIRCUMFERENCE * (1 - CAMPAIGN_PROGRESS),
										}}
										viewport={viewportOnce}
										transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
									/>
								</svg>
								<div className="absolute inset-0 flex flex-col items-center justify-center">
									<span className="text-lg font-bold text-slate-700 tabular-nums">
										72%
									</span>
									<span className="text-[10px] text-slate-500">of goal</span>
								</div>
							</div>
						</div>
					</BentoTile>

					<BentoTile className="md:col-span-3">
						<TileHeader
							icon={Landmark}
							eyebrow="Restricted funds"
							title="Spend grant money the way donors intended"
						/>
						<div className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-slate-200">
							{FUND_SPLIT.map((fund, i) => (
								<motion.span
									key={fund.label}
									className={cn("h-full", fund.className)}
									initial={{ width: reduceMotion ? `${fund.percent}%` : "0%" }}
									whileInView={{ width: `${fund.percent}%` }}
									viewport={viewportOnce}
									transition={{ delay: 0.2 + i * 0.2, duration: 0.8 }}
								/>
							))}
						</div>
						<div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
							{FUND_SPLIT.map((fund) => (
								<span
									key={fund.label}
									className="inline-flex items-center gap-1.5 text-xs text-slate-600"
								>
									<span className={cn("size-2 rounded-full", fund.className)} />
									{fund.label} ·{" "}
									<span className="tabular-nums">{fund.percent}%</span>
								</span>
							))}
						</div>
					</BentoTile>

					<BentoTile className="md:col-span-2">
						<TileHeader
							icon={CalendarClock}
							eyebrow="Volunteers"
							title="Shifts that fill themselves"
						/>
						<div className="mt-5 grid grid-cols-5 gap-1.5" aria-hidden>
							{SHIFT_DAYS.map((day, col) => (
								<div key={day} className="flex flex-col items-center gap-1.5">
									<span className="text-[10px] text-slate-500">{day}</span>
									{SHIFT_FILL[col].map((filled, row) => (
										<motion.div
											key={`${day}-${row}`}
											variants={{
												hidden: { opacity: 0, scale: 0.6 },
												visible: {
													opacity: 1,
													scale: 1,
													transition: {
														delay: 0.3 + (col + row) * 0.06,
														duration: 0.3,
													},
												},
											}}
											className={cn(
												"h-5 w-full self-stretch rounded-md border",
												filled
													? "border-[#00C1CB]/30 bg-[#00C1CB]/20"
													: "border-dashed border-slate-300 bg-white/60",
											)}
										/>
									))}
								</div>
							))}
						</div>
					</BentoTile>

					<BentoTile className="md:col-span-2">
						<TileHeader
							icon={QrCode}
							eyebrow="Events & giving"
							title="Check in guests, take gifts online"
						/>
						<div className="mt-5 flex items-end justify-between gap-3">
							<div>
								<p className="text-3xl font-bold text-slate-700 tabular-nums">
									128
								</p>
								<p className="text-xs text-slate-500">
									of 150 guests checked in
								</p>
							</div>
							<span className="inline-block rounded-full border border-green/20 bg-green/10 px-2 py-0.5 text-xs font-medium text-green">
								Donation page live
							</span>
						</div>
					</BentoTile>

					<motion.div variants={scaleIn} className="md:col-span-2">
						<div className="relative h-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#162768] via-[#0f5384] to-[#0E638F] p-5 sm:p-6 shadow-[0_16px_40px_rgba(22,39,104,0.28)]">
							<svg
								className="pointer-events-none absolute -right-10 -bottom-10 size-44 text-white/10"
								viewBox="0 0 100 100"
								aria-hidden
							>
								<circle
									cx="50"
									cy="50"
									r="48"
									fill="none"
									stroke="currentColor"
									strokeWidth="1"
								/>
								<circle
									cx="50"
									cy="50"
									r="34"
									fill="none"
									stroke="currentColor"
									strokeWidth="1"
								/>
								<circle
									cx="50"
									cy="50"
									r="20"
									fill="none"
									stroke="currentColor"
									strokeWidth="1"
								/>
							</svg>
							<TileHeader
								icon={TrendingUp}
								eyebrow="Board & grants"
								title="Keep funders renewing"
								inverted
							/>
							<p className="relative mt-2 text-sm text-white/80">
								Track grant retention risk and map your books to Form 990 before
								the board asks.
							</p>
							<Link
								href="/nonprofits"
								className="relative mt-5 inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-white transition-colors duration-200 hover:text-[#00C1CB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded"
							>
								See the nonprofit suite
								<ArrowRight className="h-4 w-4" />
							</Link>
						</div>
					</motion.div>
				</div>
			</motion.div>
		</LandingSection>
	);
}
