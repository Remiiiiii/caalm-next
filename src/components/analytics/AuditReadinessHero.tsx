"use client";

import {
	ArrowRight,
	CalendarRange,
	ClipboardCheck,
	SquareArrowRightExit,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	AUDIT_PERIOD_OPTIONS,
	type AuditPeriod,
	type ComplianceRagStatus,
} from "@/lib/audits/types";
import { cn } from "@/lib/utils";

const RAG_STYLES: Record<
	ComplianceRagStatus,
	{ label: string; badge: string; progress: string }
> = {
	green: {
		label: "On track",
		badge: "bg-green/10 text-green border-green/20",
		progress: "[&>div]:bg-green",
	},
	amber: {
		label: "Needs attention",
		badge: "bg-orange/10 text-orange border-orange/20",
		progress: "[&>div]:bg-orange",
	},
	red: {
		label: "At risk",
		badge: "bg-red/10 text-red border-red/20",
		progress: "[&>div]:bg-red",
	},
};

interface AuditReadinessHeroProps {
	score: number;
	ragStatus: ComplianceRagStatus;
	areasAtRisk?: number;
	upcomingDeadlines?: number;
	isLoading?: boolean;
	/** When provided, the reporting-period panel is merged into the right side of this card. */
	period?: AuditPeriod;
	onPeriodChange?: (period: AuditPeriod) => void;
	lastUpdated?: string;
	onExport?: () => void;
	canExport?: boolean;
}

export function AuditReadinessHero({
	score,
	ragStatus,
	areasAtRisk = 0,
	upcomingDeadlines = 0,
	isLoading,
	period,
	onPeriodChange,
	lastUpdated,
	onExport,
	canExport = false,
}: AuditReadinessHeroProps) {
	const styles = RAG_STYLES[ragStatus];
	const hasPeriodControl = Boolean(onPeriodChange && period);
	const periodLabel = AUDIT_PERIOD_OPTIONS.find(
		(opt) => opt.value === period,
	)?.label;

	if (isLoading) {
		return (
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6">
					<div className="h-24 animate-pulse bg-slate-200/50 rounded-lg" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6">
				<div
					className={cn(
						"flex flex-col gap-6",
						hasPeriodControl
							? "lg:flex-row lg:items-stretch"
							: "xl:flex-row xl:items-center xl:justify-between",
					)}
				>
					{/* Left — Audit readiness */}
					<div
						className={cn(
							"flex flex-col gap-6 min-w-0 flex-1",
							!hasPeriodControl &&
								"xl:flex-row xl:items-center xl:justify-between",
						)}
					>
						<div className="flex items-start gap-4 min-w-0 flex-1">
							<div className="p-3 rounded-xl bg-blue/10 shrink-0">
								<ClipboardCheck className="h-6 w-6 text-[#0f5384]" />
							</div>
							<div className="min-w-0">
								<div className="flex flex-wrap items-center gap-3 mb-2">
									<h2 className="text-xl font-semibold sidebar-gradient-text">
										Audit readiness
									</h2>
									<span
										className={cn(
											"text-xs font-medium px-2 py-0.5 rounded-full border",
											styles.badge,
										)}
									>
										{styles.label}
									</span>
								</div>
								<p className="text-sm text-slate-600 mb-4">
									Overall compliance posture across contracts, licenses, and
									governance controls.
								</p>
								<div className="flex flex-wrap gap-4 text-sm text-slate-600">
									<span>
										<span className="font-semibold text-slate-700">
											{areasAtRisk}
										</span>{" "}
										areas at risk
									</span>
									<span>
										<span className="font-semibold text-slate-700">
											{upcomingDeadlines}
										</span>{" "}
										upcoming deadlines
									</span>
								</div>
							</div>
						</div>

						<div className="flex flex-col gap-3 w-full min-w-0 xl:w-[min(100%,20rem)] shrink-0">
							<div className="flex items-center gap-4">
								<div className="text-left sm:text-right shrink-0">
									<p className="text-4xl font-bold text-slate-700">{score}%</p>
									<p className="text-xs text-slate-600 mt-1">Readiness score</p>
								</div>
								<Progress
									value={score}
									className={cn("h-3 flex-1 min-w-0", styles.progress)}
								/>
							</div>
							<Button
								asChild
								variant="outline"
								className="primary-btn w-full px-3 sm:px-4"
							>
								<Link href="/audits/status">
									<span className="truncate">View compliance status</span>
									<ArrowRight className="h-4 w-4 shrink-0" />
								</Link>
							</Button>
						</div>
					</div>

					{/* Divider + Right — Reporting period */}
					{hasPeriodControl ? (
						<>
							<div
								className="hidden lg:block w-px shrink-0 bg-slate-200/70"
								aria-hidden
							/>
							<div
								className="h-px w-full shrink-0 bg-slate-200/70 lg:hidden"
								aria-hidden
							/>
							<div className="flex w-full min-w-0 flex-col gap-3 lg:w-72 lg:shrink-0">
								<div className="flex items-center gap-2">
									<CalendarRange className="h-4 w-4 shrink-0 text-[#0f5384]" />
									<div className="min-w-0">
										<p className="text-sm font-medium sidebar-gradient-text">
											Reporting period
										</p>
										<p className="text-xs text-slate-600">
											Sets the date range for the readiness score and metrics on
											this page.
										</p>
									</div>
								</div>
								<Select
									value={period}
									onValueChange={(v) => onPeriodChange?.(v as AuditPeriod)}
								>
									<SelectTrigger className="h-9 w-full shad-input">
										<SelectValue placeholder="Period" />
									</SelectTrigger>
									<SelectContent>
										{AUDIT_PERIOD_OPTIONS.map((opt) => (
											<SelectItem key={opt.value} value={opt.value}>
												{opt.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{periodLabel ? (
									<p className="text-xs text-slate-600">
										Showing{" "}
										<span className="font-medium text-slate-700">
											{periodLabel.toLowerCase()}
										</span>
										.
									</p>
								) : null}
								{canExport && onExport ? (
									<Button
										variant="outline"
										className="primary-btn w-full px-3 sm:px-4"
										onClick={onExport}
									>
										<SquareArrowRightExit className="h-4 w-4" />
										Export
									</Button>
								) : null}
								{lastUpdated ? (
									<p className="mt-auto text-xs text-slate-500">
										Last updated{" "}
										{new Date(lastUpdated).toLocaleString(undefined, {
											dateStyle: "medium",
											timeStyle: "short",
										})}
									</p>
								) : null}
							</div>
						</>
					) : null}
				</div>
			</CardContent>
		</Card>
	);
}
