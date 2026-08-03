"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, PiggyBank, ShieldCheck } from "lucide-react";
import CountUp from "react-countup";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DepartmentCompliance {
	name: string;
	complianceRate: number;
}

interface AnalyticsReadinessOverviewProps {
	overallComplianceRate: number;
	departments: DepartmentCompliance[];
	/** Share of the total budget already committed (0-100). */
	budgetUtilization?: number;
}

const DEPT_BAR_COLORS = [
	"bg-green",
	"bg-[#0f5384]",
	"bg-[#00C1CB]",
	"bg-orange",
	"bg-[#162768]",
] as const;

function toneFor(percent: number): "green" | "amber" | "red" {
	if (percent >= 85) return "green";
	if (percent >= 70) return "amber";
	return "red";
}

function fillFor(tone: "green" | "amber" | "red"): string {
	return tone === "green"
		? "bg-green"
		: tone === "amber"
			? "bg-orange"
			: "bg-red";
}

function AnimatedPercentBar({
	percent,
	fillClassName,
	trackClassName,
	delay = 0,
	reduceMotion,
}: {
	percent: number;
	fillClassName: string;
	trackClassName?: string;
	delay?: number;
	reduceMotion: boolean | null;
}) {
	return (
		<div
			className={cn(
				"rounded-full bg-slate-200 overflow-hidden",
				trackClassName,
			)}
		>
			<motion.div
				className={cn("h-full rounded-full", fillClassName)}
				initial={{ width: "0%" }}
				whileInView={{ width: `${percent}%` }}
				viewport={{ once: true, amount: 0.4 }}
				transition={
					reduceMotion
						? { duration: 0 }
						: { duration: 1.2, ease: [0.22, 1, 0.36, 1], delay }
				}
				aria-hidden
			/>
		</div>
	);
}

function AnimatedPercentLabel({
	percent,
	className,
	reduceMotion,
	delay = 0,
}: {
	percent: number;
	className?: string;
	reduceMotion: boolean | null;
	delay?: number;
}) {
	if (reduceMotion) {
		return <span className={className}>{percent}%</span>;
	}
	return (
		<span className={className}>
			<CountUp
				end={percent}
				suffix="%"
				duration={1.2}
				delay={delay}
				start={0}
				enableScrollSpy
				scrollSpyOnce
			/>
		</span>
	);
}

export function AnalyticsReadinessSummary({
	overallComplianceRate,
	departments,
	budgetUtilization = 85,
}: AnalyticsReadinessOverviewProps) {
	const reduceMotion = useReducedMotion();

	const onTrackShare =
		departments.length > 0
			? Math.round(
					(departments.filter((d) => d.complianceRate >= 85).length /
						departments.length) *
						100,
				)
			: 0;

	const summaryCards = [
		{
			label: "Overall compliance",
			percent: Math.round(overallComplianceRate),
			caption: "Across all departments",
			icon: ShieldCheck,
		},
		{
			label: "Budget utilization",
			percent: Math.round(budgetUtilization),
			caption: "Committed vs. allocated",
			icon: PiggyBank,
		},
		{
			label: "Departments on track",
			percent: onTrackShare,
			caption: "Meeting the 85% target",
			icon: BadgeCheck,
		},
	];

	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
			{summaryCards.map((card, i) => {
				const tone = toneFor(card.percent);
				const delay = 0.08 + i * 0.1;
				return (
					<Card key={card.label} className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<div className="mb-4 flex items-start justify-between gap-3">
								<div className="flex items-center gap-3 min-w-0">
									<div className="p-2 rounded-lg bg-blue/10 shrink-0">
										<card.icon className="h-5 w-5 text-[#0f5384]" />
									</div>
									<div className="min-w-0">
										<p className="text-sm font-medium sidebar-gradient-text truncate">
											{card.label}
										</p>
										<p className="text-xs text-slate-600">{card.caption}</p>
									</div>
								</div>
								<AnimatedPercentLabel
									percent={card.percent}
									className="text-2xl font-bold text-slate-700 tabular-nums shrink-0"
									reduceMotion={reduceMotion}
									delay={delay}
								/>
							</div>
							<AnimatedPercentBar
								percent={card.percent}
								fillClassName={fillFor(tone)}
								trackClassName="h-2"
								delay={delay}
								reduceMotion={reduceMotion}
							/>
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}

export function DepartmentComplianceCard({
	departments,
}: {
	departments: DepartmentCompliance[];
}) {
	const reduceMotion = useReducedMotion();

	return (
		<Card className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6">
				<div className="mb-4">
					<h3 className="text-sm font-semibold sidebar-gradient-text">
						Department compliance
					</h3>
					<p className="text-xs text-slate-600 mt-1">
						Live compliance rate for each department in the current period.
					</p>
				</div>
				<div className="space-y-3">
					{departments.map((dept, i) => {
						const rate = Math.round(dept.complianceRate);
						const delay = 0.2 + i * 0.08;
						return (
							<div key={dept.name} className="flex items-center gap-3">
								<span className="w-24 sm:w-32 shrink-0 truncate text-xs sm:text-sm text-slate-600">
									{dept.name}
								</span>
								<AnimatedPercentBar
									percent={rate}
									fillClassName={DEPT_BAR_COLORS[i % DEPT_BAR_COLORS.length]}
									trackClassName="h-2 flex-1"
									delay={delay}
									reduceMotion={reduceMotion}
								/>
								<AnimatedPercentLabel
									percent={rate}
									className="w-10 shrink-0 text-right text-xs font-semibold text-slate-700 tabular-nums"
									reduceMotion={reduceMotion}
									delay={delay}
								/>
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
