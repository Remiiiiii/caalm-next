"use client";

import { AlertTriangle, ChevronRight, RefreshCw, Shield } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RiskTrackingChart } from "@/components/dashboard/RiskTrackingChart";
import type {
	RiskImpactSnapshot,
	RiskImpactTrend,
} from "@/lib/dashboard/risk-impact.types";

const COL_PAD = "flex flex-col justify-start gap-3.5 p-5 sm:p-6";
const COL_RULE =
	"border-b border-slate-300 last:border-b-0 md:[&:nth-child(-n+2)]:border-b md:[&:nth-child(n+3)]:border-b-0 lg:!border-b-0";
const METRIC_ROW =
	"flex items-baseline justify-between gap-3 min-h-11 pb-2.5 border-b border-slate-300 last:border-b-0 last:pb-0";

function arrowTone(direction: RiskImpactTrend["direction"]): string {
	if (direction === "down") return "text-red";
	if (direction === "up" || direction === "new") return "text-green";
	return "text-slate-600";
}

function TrendCopy({
	trend,
	variant,
}: {
	trend: RiskImpactTrend;
	variant: "count" | "yoy";
}) {
	const arrow =
		trend.direction === "down"
			? "↓"
			: trend.direction === "flat"
				? variant === "count"
					? "—"
					: null
				: "↑";
	const prefix =
		variant === "count"
			? trend.direction === "flat"
				? "vs"
				: `vs ${trend.prior ?? 0}`
			: trend.direction === "new"
				? "vs"
				: trend.direction === "flat"
					? "0% vs"
					: `${trend.percent}% vs`;
	const underline = variant === "count" ? "last Q" : trend.vsLabel;

	return (
		<span className="inline-flex items-baseline gap-1 text-xs tabular-nums">
			{arrow ? (
				<span className={`font-medium ${arrowTone(trend.direction)}`}>
					{arrow}
				</span>
			) : null}
			<span className="text-slate-600">
				{prefix} {underline}
			</span>
		</span>
	);
}

function MetricRow({
	label,
	value,
	trend,
}: {
	label: string;
	value: number;
	trend?: RiskImpactTrend | null;
}) {
	const showTrend = Boolean(
		trend && !(value === 0 && trend.direction === "flat"),
	);

	return (
		<div className={METRIC_ROW}>
			<span className="text-xs text-slate-600 leading-snug">{label}</span>
			<span className="flex items-baseline gap-1.5 shrink-0 text-right tabular-nums">
				<span className="text-[13px] font-medium text-slate-700">
					{value.toLocaleString()}
				</span>
				{showTrend && trend ? (
					<TrendCopy trend={trend} variant="count" />
				) : null}
			</span>
		</div>
	);
}

function ColumnRule({ atMdOdd = false }: { atMdOdd?: boolean }) {
	return (
		<div
			aria-hidden
			className={
				atMdOdd
					? "hidden md:block lg:hidden absolute top-[12%] bottom-[12%] right-0 w-px bg-slate-300"
					: "hidden lg:block absolute top-[12%] bottom-[12%] right-0 w-px bg-slate-300"
			}
		/>
	);
}

interface RiskImpactHeroCardProps {
	snapshot: RiskImpactSnapshot | null;
	isLoading?: boolean;
	error?: Error | unknown;
	compact?: boolean;
	onRetry?: () => void;
}

function monitoredStatusClause(
	contractsMonitored: number,
	grantsMonitored: number,
): string {
	const grantLabel =
		grantsMonitored === 1 ? "1 grant" : `${grantsMonitored} grants`;

	if (contractsMonitored === 0 && grantsMonitored === 0) {
		return "There are no contracts currently being monitored";
	}
	if (contractsMonitored === 0) {
		return `There are no contracts; ${grantLabel} ${
			grantsMonitored === 1 ? "is" : "are"
		} currently being monitored`;
	}
	if (contractsMonitored === 1 && grantsMonitored === 0) {
		return "1 contract is currently being monitored";
	}
	if (contractsMonitored === 1) {
		return `1 contract and ${grantLabel} are currently being monitored`;
	}
	if (grantsMonitored === 0) {
		return `${contractsMonitored} contracts are currently being monitored`;
	}
	return `${contractsMonitored} contracts and ${grantLabel} are currently being monitored`;
}

function buildTrackingNoteFromSnapshot(snapshot: RiskImpactSnapshot): string {
	const year = new Date(snapshot.computedAt || Date.now()).getFullYear();
	const yearPhrase =
		snapshot.period === "ytd"
			? `in ${year}`
			: snapshot.period === "last30"
				? "in the last 30 days"
				: "in the last 90 days";

	const status = monitoredStatusClause(
		snapshot.monitoring?.contractsMonitored ?? 0,
		snapshot.monitoring?.grantsMonitored ?? 0,
	);

	if (snapshot.primary.amount <= 0) {
		return `This metric activates automatically once CAALM flags a clause, deadline, or funding condition that would have created exposure. ${status}. Nothing at risk has been detected so far ${yearPhrase}.`;
	}

	return `${status}. Risk-averted dollars update as compliance flags, closed gaps, and on-time renewals land ${yearPhrase}.`;
}

export function RiskImpactHeroCard({
	snapshot,
	isLoading,
	error,
	onRetry,
}: RiskImpactHeroCardProps) {
	const breakdownHref = "/analytics/risk-averted";

	if (isLoading && !snapshot) {
		return (
			<Card className="glass-card mb-6 overflow-hidden">
				<div className="glass-card-cap" />
				<CardContent className="p-0">
					<div className="animate-pulse">
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[minmax(13rem,17rem)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
							<div className="p-5 sm:p-6 space-y-3 border-b lg:border-b-0">
								<div className="h-4 w-28 rounded bg-slate-200/80" />
								<div className="h-3 w-36 rounded bg-slate-200/70" />
								<div className="h-10 w-24 rounded bg-slate-200/80" />
								<div className="h-5 w-32 rounded bg-slate-200/60" />
							</div>
							<div className="p-5 sm:p-6 space-y-3 border-b lg:border-b-0">
								<div className="h-11 w-full rounded bg-slate-200/70" />
								<div className="h-11 w-full rounded bg-slate-200/70" />
								<div className="h-11 w-full rounded bg-slate-200/70" />
							</div>
							<div className="p-5 sm:p-6 space-y-3 border-b lg:border-b-0">
								<div className="h-11 w-full rounded bg-slate-200/70" />
								<div className="h-11 w-full rounded bg-slate-200/70" />
								<div className="h-11 w-full rounded bg-slate-200/70" />
							</div>
							<div className="p-5 sm:p-6 space-y-3">
								<div className="h-11 w-full rounded bg-slate-200/70" />
								<div className="h-11 w-full rounded bg-slate-200/70" />
								<div className="h-11 w-full rounded bg-slate-200/70" />
								<div className="h-9 w-36 rounded bg-slate-200/80" />
							</div>
						</div>
						<div className="p-5 sm:p-6 space-y-3 border-t border-slate-200/80">
							<div className="h-3 w-32 rounded bg-slate-200/70" />
							<div className="h-44 w-full rounded bg-slate-200/60" />
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (error && !snapshot) {
		return (
			<Card className="glass-card mb-6 border border-orange/20">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
					<div className="flex items-start gap-3">
						<AlertTriangle className="h-5 w-5 text-orange shrink-0 mt-0.5" />
						<div>
							<p className="text-sm font-medium sidebar-gradient-text">
								Risk impact unavailable
							</p>
							<p className="text-xs text-slate-600 mt-1">
								Live risk-averted data could not load. Try again in a moment.
							</p>
						</div>
					</div>
					{onRetry ? (
						<Button
							type="button"
							variant="outline"
							className="primary-btn px-3 sm:px-4"
							onClick={onRetry}
						>
							<RefreshCw className="h-4 w-4" />
							Retry
						</Button>
					) : null}
				</CardContent>
			</Card>
		);
	}

	if (!snapshot) return null;

	const trackingNote = buildTrackingNoteFromSnapshot(snapshot);
	const periodDisplay = snapshot.periodLabel.toUpperCase();
	const yoyTrend = snapshot.yoyTrend;
	const showYoy =
		yoyTrend &&
		!(snapshot.primary.amount === 0 && yoyTrend.direction === "flat");

	return (
		<Card className="glass-card mb-6 overflow-hidden border border-slate-200/80">
			<div className="glass-card-cap" />
			<CardContent className="p-0">
				<div>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[minmax(13rem,17rem)_minmax(0,1fr)_minmax(0,1fr)_minmax(12rem,1.15fr)] items-start">
						<div className={`relative ${COL_PAD} ${COL_RULE}`}>
							<ColumnRule />
							<ColumnRule atMdOdd />
							<div className="flex items-center gap-2 min-h-11">
								<Shield className="h-3.5 w-3.5 text-[#0f5384] shrink-0" />
								<p className="text-[12.5px] font-semibold text-slate-700">
									Risk averted
								</p>
							</div>
							<p className="text-[10.5px] tracking-wide text-slate-500">
								{periodDisplay}
							</p>
							<p className="text-[2.5rem] leading-none font-semibold text-slate-800 tracking-tight">
								{snapshot.primary.amountFormatted}
							</p>
							{snapshot.secondary.amount > 0 ? (
								<p className="text-xs text-slate-600">
									{snapshot.secondary.label}:{" "}
									<span className="font-semibold text-slate-800">
										{snapshot.secondary.amountFormatted}
									</span>
								</p>
							) : null}
							{showYoy && yoyTrend ? (
								<TrendCopy trend={yoyTrend} variant="yoy" />
							) : null}
						</div>

						<div className={`relative ${COL_PAD} ${COL_RULE}`}>
							<ColumnRule />
							<MetricRow
								label="Compliance flags caught"
								value={snapshot.counts.complianceFlagsCaught}
								trend={snapshot.countTrends?.complianceFlagsCaught}
							/>
							<MetricRow
								label="Audit gaps closed"
								value={snapshot.counts.auditGapsClosed}
								trend={snapshot.countTrends?.auditGapsClosed}
							/>
							<MetricRow
								label="Licenses renewed on time"
								value={snapshot.counts.licensesRenewedOnTime}
								trend={snapshot.countTrends?.licensesRenewedOnTime}
							/>
						</div>

						<div className={`relative ${COL_PAD} ${COL_RULE}`}>
							<ColumnRule />
							<ColumnRule atMdOdd />
							<MetricRow
								label="High-risk contracts"
								value={snapshot.openRisk?.highRisk ?? 0}
							/>
							<MetricRow
								label="Expiring within 90 days"
								value={snapshot.openRisk?.expiring90 ?? 0}
							/>
							<MetricRow
								label="Expired still open"
								value={snapshot.openRisk?.expired ?? 0}
							/>
						</div>

						<div className={`${COL_PAD} min-w-0`}>
							<MetricRow
								label="Contracts monitored"
								value={snapshot.monitoring.contractsMonitored}
							/>
							<MetricRow
								label="Grants monitored"
								value={snapshot.monitoring.grantsMonitored}
							/>
							<MetricRow
								label="Clauses flagged"
								value={snapshot.monitoring.clausesFlagged}
							/>
							<Button
								asChild
								className="primary-btn w-full max-w-full px-3 gap-1.5 text-[12.5px] font-semibold"
								style={{ width: "100%", maxWidth: "100%" }}
							>
								<Link href={breakdownHref} className="block w-full min-w-0">
									View breakdown
									<ChevronRight className="h-3.5 w-3.5" />
								</Link>
							</Button>
						</div>
					</div>

					<div className="w-full min-w-0 border-t border-slate-300 p-5 sm:p-6">
						<RiskTrackingChart
							points={snapshot.sparkline}
							period={snapshot.period}
						>
							<p className="mt-3 text-[12.5px] text-slate-600 leading-relaxed max-w-4xl">
								{trackingNote.split(/(\d+)/).map((part, i) =>
									/^\d+$/.test(part) ? (
										<span key={i} className="font-semibold text-slate-700">
											{part}
										</span>
									) : (
										<span key={i}>{part}</span>
									),
								)}
							</p>
						</RiskTrackingChart>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
