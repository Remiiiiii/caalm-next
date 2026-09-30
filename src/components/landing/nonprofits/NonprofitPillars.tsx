"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
	Check,
	CheckCircle2,
	Clock,
	Download,
	QrCode,
	Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import LandingFrostedCard from "../LandingFrostedCard";
import LandingSection from "../LandingSection";
import { fadeLeft, fadeRight, staggerContainer, viewportOnce } from "../motion";
import { NONPROFIT_PILLARS, type NonprofitPillarId } from "./nonprofitContent";

function SupporterVisual({ reduceMotion }: { reduceMotion: boolean | null }) {
	return (
		<div className="space-y-4">
			<div className="flex items-center gap-3">
				<span className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-[#00C1CB]/25 to-[#162768]/20 text-sm font-semibold text-[#0f5384]">
					AP
				</span>
				<div className="min-w-0 flex-1">
					<p className="font-semibold text-slate-800">Angela &amp; Ray Patel</p>
					<p className="text-xs text-slate-500">
						Household · 2 members · Donor since 2019
					</p>
				</div>
				<span className="inline-block rounded-full border border-blue/20 bg-blue/10 px-2 py-0.5 text-xs font-medium text-blue">
					Upgrade ready
				</span>
			</div>
			<div className="rounded-xl border border-slate-200 bg-white/70 p-3">
				<div className="flex items-center justify-between text-xs">
					<span className="font-medium text-slate-700">Lapse risk</span>
					<span className="inline-block rounded-full border border-orange/20 bg-orange/10 px-2 py-0.5 font-medium text-orange">
						Medium
					</span>
				</div>
				<div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
					<motion.div
						className="h-full rounded-full bg-gradient-to-r from-green via-orange to-red"
						initial={{ width: reduceMotion ? "58%" : "0%" }}
						whileInView={{ width: "58%" }}
						viewport={viewportOnce}
						transition={{ duration: 1.1, delay: 0.3 }}
					/>
				</div>
				<p className="mt-2 text-[11px] text-slate-500">
					Why: last gift 10 months ago, usually gives every 6.
				</p>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<div className="rounded-xl border border-slate-200 bg-white/70 p-3">
					<p className="text-[11px] text-slate-500">Suggested ask</p>
					<p className="mt-0.5 text-xl font-bold text-slate-700 tabular-nums">
						$1,500
					</p>
				</div>
				<div className="rounded-xl border border-[#00C1CB]/30 bg-[#00C1CB]/10 p-3">
					<p className="flex items-center gap-1 text-[11px] font-medium text-[#0E638F]">
						<Sparkles className="h-3 w-3" />
						Next best action
					</p>
					<p className="mt-0.5 text-sm font-semibold text-slate-700">
						Invite to spring gala
					</p>
				</div>
			</div>
		</div>
	);
}

function GivingVisual() {
	const amounts = ["$50", "$100", "$250", "Other"];
	return (
		<div className="relative pb-16">
			<div className="rounded-xl border border-slate-200 bg-white/80 p-4 sm:mr-16">
				<p className="text-xs font-semibold uppercase tracking-wider text-[#0f5384]">
					Give to Harbor Youth Alliance
				</p>
				<div className="mt-3 inline-flex rounded-full border border-slate-200 bg-slate-100 p-0.5 text-xs">
					<span className="rounded-full px-3 py-1 text-slate-500">
						One time
					</span>
					<span className="rounded-full bg-white px-3 py-1 font-medium text-slate-700 shadow-sm">
						Monthly
					</span>
				</div>
				<div className="mt-3 grid grid-cols-4 gap-2">
					{amounts.map((amount) => (
						<span
							key={amount}
							className={cn(
								"rounded-lg border py-2 text-center text-sm font-medium",
								amount === "$100"
									? "border-[#00C1CB] bg-[#00C1CB]/10 text-[#0E638F]"
									: "border-slate-200 bg-white text-slate-600",
							)}
						>
							{amount}
						</span>
					))}
				</div>
				<div className="mt-3 rounded-lg border-[0.25px] border-slate-300 bg-white px-3 py-2 text-xs text-slate-600">
					Fund:{" "}
					<span className="font-medium text-slate-700">
						After-school programs
					</span>
				</div>
				<div className="mt-3 rounded-lg bg-gradient-to-r from-[#00C1CB] to-[#0f5384] py-2 text-center text-sm font-semibold text-white">
					Give $100 monthly
				</div>
			</div>
			<motion.div
				initial={{ opacity: 0, y: 20, rotate: 0 }}
				whileInView={{ opacity: 1, y: 0, rotate: -4 }}
				viewport={viewportOnce}
				transition={{ delay: 0.4, duration: 0.6 }}
				className="absolute -bottom-3 right-0 w-40 rounded-xl border border-slate-200 bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.16)]"
			>
				<div className="flex items-center gap-2">
					<QrCode className="h-9 w-9 text-[#162768]" />
					<div>
						<p className="text-[11px] font-semibold text-slate-700">
							Spring gala
						</p>
						<p className="text-[10px] text-slate-500">General admission</p>
					</div>
				</div>
				<span className="mt-2 inline-flex items-center gap-1 rounded-full border border-green/20 bg-green/10 px-2 py-0.5 text-[10px] font-medium text-green">
					<Check className="h-3 w-3" />
					Checked in
				</span>
			</motion.div>
		</div>
	);
}

function FundsVisual({ reduceMotion }: { reduceMotion: boolean | null }) {
	const lines = [
		{ label: "Program staff", budget: "$120K", percent: 72 },
		{ label: "Supplies", budget: "$18K", percent: 91 },
		{ label: "Evaluation", budget: "$12K", percent: 34 },
	];
	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-2">
				<div>
					<p className="text-sm font-semibold text-slate-800">
						Literacy grant · FY26
					</p>
					<p className="text-xs text-slate-500">With donor restrictions</p>
				</div>
				<span className="inline-block rounded-full border border-blue/20 bg-blue/10 px-2 py-0.5 text-xs font-medium text-blue">
					Fund 4100
				</span>
			</div>
			<div className="space-y-3 rounded-xl border border-slate-200 bg-white/70 p-3">
				{lines.map((line, i) => (
					<div key={line.label}>
						<div className="flex items-center justify-between text-xs">
							<span className="font-medium text-slate-700">{line.label}</span>
							<span className="text-slate-500 tabular-nums">
								{line.percent}% of {line.budget}
							</span>
						</div>
						<div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
							<motion.div
								className={cn(
									"h-full rounded-full",
									line.percent > 85
										? "bg-orange"
										: "bg-gradient-to-r from-[#00C1CB] to-[#0f5384]",
								)}
								initial={{ width: reduceMotion ? `${line.percent}%` : "0%" }}
								whileInView={{ width: `${line.percent}%` }}
								viewport={viewportOnce}
								transition={{ duration: 0.9, delay: 0.2 + i * 0.15 }}
							/>
						</div>
					</div>
				))}
			</div>
			<div className="flex flex-wrap gap-2">
				{["990-worksheet.csv", "journal-export.iif"].map((file) => (
					<span
						key={file}
						className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
					>
						<Download className="h-3.5 w-3.5 text-[#0f5384]" />
						{file}
					</span>
				))}
			</div>
		</div>
	);
}

function VolunteersVisual() {
	const logs = [
		{ name: "Priya S.", hours: "3.0 h", approved: true },
		{ name: "Marcus L.", hours: "2.5 h", approved: true },
		{ name: "Elena V.", hours: "4.0 h", approved: false },
	];
	return (
		<div className="space-y-4">
			<div className="rounded-xl border border-slate-200 bg-white/80 p-4">
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="text-sm font-semibold text-slate-800">
							Saturday food pantry
						</p>
						<p className="text-xs text-slate-500">
							9:00 AM to 12:00 PM · Tagged to Food Security grant
						</p>
					</div>
					<span className="inline-block shrink-0 rounded-full border border-orange/20 bg-orange/10 px-2 py-0.5 text-xs font-medium text-orange">
						3 waitlisted
					</span>
				</div>
				<div className="mt-3 flex gap-1.5" aria-hidden>
					{Array.from({ length: 8 }, (_, i) => (
						<span
							key={i}
							className="h-6 flex-1 rounded-md border border-[#00C1CB]/30 bg-[#00C1CB]/20"
						/>
					))}
				</div>
				<p className="mt-2 text-[11px] text-slate-500">8 of 8 spots filled</p>
			</div>
			<ul className="space-y-2">
				{logs.map((log) => (
					<li
						key={log.name}
						className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs"
					>
						<span className="font-medium text-slate-700">{log.name}</span>
						<span className="text-slate-500 tabular-nums">{log.hours}</span>
						{log.approved ? (
							<span className="inline-flex items-center gap-1 text-green">
								<CheckCircle2 className="h-3.5 w-3.5" />
								Approved
							</span>
						) : (
							<span className="inline-flex items-center gap-1 text-orange">
								<Clock className="h-3.5 w-3.5" />
								Pending
							</span>
						)}
					</li>
				))}
			</ul>
		</div>
	);
}

function PillarVisual({
	id,
	reduceMotion,
}: {
	id: NonprofitPillarId;
	reduceMotion: boolean | null;
}) {
	if (id === "supporters")
		return <SupporterVisual reduceMotion={reduceMotion} />;
	if (id === "giving") return <GivingVisual />;
	if (id === "funds") return <FundsVisual reduceMotion={reduceMotion} />;
	return <VolunteersVisual />;
}

export default function NonprofitPillars() {
	const reduceMotion = useReducedMotion();

	return (
		<>
			{NONPROFIT_PILLARS.map((pillar, index) => {
				const visualFirst = index % 2 === 1;
				return (
					<LandingSection
						key={pillar.id}
						id={pillar.id}
						ariaLabelledBy={`${pillar.id}-heading`}
						className={index % 2 === 1 ? "landing-soft-brand-wash" : undefined}
					>
						<motion.div
							className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center"
							variants={staggerContainer}
							initial="hidden"
							whileInView="visible"
							viewport={viewportOnce}
						>
							<motion.div
								variants={visualFirst ? fadeLeft : fadeRight}
								className={cn(visualFirst && "lg:order-2")}
							>
								<div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[#F1F9FF] px-3 py-1 shadow-sm">
									<span className="inline-flex items-center justify-center size-6 rounded-full bg-slate-700/10 ring-1 ring-slate-200">
										<pillar.icon className="h-3.5 w-3.5 text-slate-700" />
									</span>
									<span className="text-slate-700 text-sm">
										{pillar.eyebrow}
									</span>
								</div>
								<h2
									id={`${pillar.id}-heading`}
									className="text-2xl sm:text-3xl md:text-[2.5em] sidebar-gradient-text landing-section-title leading-tight"
								>
									{pillar.title}
								</h2>
								<p className="mt-3 text-slate-600 text-sm sm:text-base max-w-lg">
									{pillar.description}
								</p>
								<ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
									{pillar.bullets.map((bullet) => (
										<li
											key={bullet}
											className="flex items-start gap-2 text-sm text-slate-700"
										>
											<span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#00C1CB]/15">
												<Check className="h-3 w-3 text-[#0E638F]" />
											</span>
											{bullet}
										</li>
									))}
								</ul>
							</motion.div>

							<motion.div
								variants={visualFirst ? fadeRight : fadeLeft}
								className={cn("relative", visualFirst && "lg:order-1")}
							>
								<div
									className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-[#00C1CB]/15 via-transparent to-[#162768]/10 blur-2xl"
									aria-hidden
								/>
								<LandingFrostedCard
									className="relative"
									contentClassName="p-5 sm:p-7"
								>
									<PillarVisual id={pillar.id} reduceMotion={reduceMotion} />
								</LandingFrostedCard>
							</motion.div>
						</motion.div>
					</LandingSection>
				);
			})}
		</>
	);
}
