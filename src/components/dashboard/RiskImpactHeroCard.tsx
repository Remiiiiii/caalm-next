"use client";

import { AlertTriangle, ChevronRight, RefreshCw, Shield } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import type {
	RiskImpactSnapshot,
	RiskImpactSparkPoint,
} from "@/lib/dashboard/risk-impact.types";
import { cn } from "@/lib/utils";

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

function RiskSparkline({
	points,
	className,
}: {
	points: RiskImpactSparkPoint[];
	className?: string;
}) {
	const width = 400;
	const height = 46;
	const padY = 8;
	const values = points.map((p) => p.value);
	const max = Math.max(...values, 1);
	const min = 0;
	const range = Math.max(max - min, 1);

	const coords = points.map((p, i) => {
		const x = points.length <= 1 ? width : (i / (points.length - 1)) * width;
		const y = height - padY - ((p.value - min) / range) * (height - padY * 2);
		return { x, y, label: p.label };
	});

	const pathD =
		coords.length === 0
			? `M0 ${height - padY} L${width} ${height - padY}`
			: coords
					.map(
						(c, i) =>
							`${i === 0 ? "M" : "L"}${c.x.toFixed(1)} ${c.y.toFixed(1)}`,
					)
					.join(" ");

	const last = coords[coords.length - 1];
	const firstLabel = points[0]?.label ?? "";
	const lastLabel = points[points.length - 1]?.label ?? "";

	return (
		<svg
			className={cn("w-full h-12", className)}
			viewBox={`0 0 ${width} ${height}`}
			preserveAspectRatio="none"
			aria-hidden
		>
			<line
				x1="0"
				y1={height - padY}
				x2={width}
				y2={height - padY}
				stroke="#e2e8f0"
				strokeWidth="1"
			/>
			<line
				x1="0"
				y1={height / 2}
				x2={width}
				y2={height / 2}
				stroke="#f1f5f9"
				strokeWidth="1"
				strokeDasharray="2 4"
			/>
			<path
				d={pathD}
				fill="none"
				stroke="#0f5384"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			{last ? <circle cx={last.x} cy={last.y} r="3.5" fill="#03AFBF" /> : null}
			{firstLabel ? (
				<text x="0" y="12" className="fill-slate-400" fontSize="9">
					{firstLabel}
				</text>
			) : null}
			{lastLabel ? (
				<text
					x={width}
					y="12"
					textAnchor="end"
					className="fill-slate-400"
					fontSize="9"
				>
					{lastLabel}
				</text>
			) : null}
		</svg>
	);
}

export function RiskImpactHeroCard({
	snapshot,
	isLoading,
	error,
	onRetry,
}: RiskImpactHeroCardProps) {
	const { permissions } = usePermissions();
	const canViewAudit = permissions.includes(PERMISSIONS.AUDIT.VIEW);
	const breakdownHref = canViewAudit ? "/audits" : "/analytics";

	if (isLoading && !snapshot) {
		return (
			<Card className="glass-card mb-6 overflow-hidden">
				<div className="glass-card-cap" />
				<CardContent className="p-0">
					<div className="grid grid-cols-1 lg:grid-cols-[minmax(0,17rem)_1fr_minmax(0,16rem)] animate-pulse">
						<div className="p-5 sm:p-6 space-y-3 border-b lg:border-b-0 lg:border-r border-slate-200/80">
							<div className="h-4 w-28 rounded bg-slate-200/80" />
							<div className="h-3 w-36 rounded bg-slate-200/70" />
							<div className="h-10 w-24 rounded bg-slate-200/80" />
							<div className="h-3 w-full rounded bg-slate-200/60" />
						</div>
						<div className="p-5 sm:p-6 space-y-3 border-b lg:border-b-0 lg:border-r border-slate-200/80">
							<div className="h-3 w-32 rounded bg-slate-200/70" />
							<div className="h-12 w-full rounded bg-slate-200/60" />
							<div className="h-3 w-full rounded bg-slate-200/60" />
							<div className="h-3 w-4/5 rounded bg-slate-200/50" />
						</div>
						<div className="p-5 sm:p-6 space-y-3">
							<div className="h-4 w-full rounded bg-slate-200/70" />
							<div className="h-4 w-full rounded bg-slate-200/70" />
							<div className="h-4 w-full rounded bg-slate-200/70" />
							<div className="h-9 w-36 rounded bg-slate-200/80" />
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

	const hasRiskEvents = snapshot.primary.amount > 0;
	const subtext = hasRiskEvents
		? snapshot.narrative
		: "No contract or grant risk events have been logged yet this year.";
	const trackingNote = buildTrackingNoteFromSnapshot(snapshot);

	const periodDisplay = snapshot.periodLabel.toUpperCase();

	return (
		<Card className="glass-card mb-6 overflow-hidden border border-slate-200/80">
			<div className="glass-card-cap" />
			<CardContent className="p-0">
				<div className="grid grid-cols-1 lg:grid-cols-[minmax(0,17.5rem)_minmax(0,1fr)_minmax(0,16.5rem)]">
					{/* Primary stat */}
					<div className="relative flex flex-col justify-center gap-2 p-5 sm:p-6 border-b border-slate-300 lg:border-b-0">
						<div
							aria-hidden
							className="hidden lg:block absolute top-[18%] bottom-[18%] right-0 w-px bg-slate-300"
						/>
						<div className="flex items-center gap-2">
							<Shield className="h-3.5 w-3.5 text-[#0f5384] shrink-0" />
							<p className="text-[12.5px] font-semibold text-slate-700">
								Risk averted
							</p>
						</div>
						<p className="font-mono text-[10.5px] tracking-wide text-slate-500">
							{periodDisplay}
						</p>
						<p className="text-[2.5rem] leading-none font-semibold text-slate-800 tracking-tight pt-1">
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
						<p className="text-xs text-slate-600 leading-relaxed max-w-60">
							{subtext}
						</p>
					</div>

					{/* Tracking context + sparkline */}
					<div className="relative flex flex-col justify-center gap-3.5 p-5 sm:p-6 border-b border-slate-300 lg:border-b-0 min-w-0">
						<div
							aria-hidden
							className="hidden lg:block absolute top-[18%] bottom-[18%] right-0 w-px bg-slate-300"
						/>
						<p className="text-[11px] font-bold tracking-[0.08em] uppercase text-slate-700">
							Tracking status
						</p>
						<RiskSparkline points={snapshot.sparkline} />
						<p className="text-[12.5px] text-slate-600 leading-relaxed max-w-xl">
							{trackingNote.split(/(\d+)/).map((part, i) =>
								/^\d+$/.test(part) ? (
									<span key={i} className="font-semibold text-slate-900">
										{part}
									</span>
								) : (
									<span key={i}>{part}</span>
								),
							)}
						</p>
					</div>

					{/* Breakdown + CTA */}
					<div className="flex flex-col justify-center gap-3.5 p-5 sm:p-6">
						<div className="flex items-baseline justify-between gap-3 pb-2.5 border-b border-slate-300">
							<span className="text-xs text-slate-600">
								Contracts monitored
							</span>
							<span className="font-mono text-[13px] font-medium text-slate-900">
								{snapshot.monitoring.contractsMonitored.toLocaleString()}
							</span>
						</div>
						<div className="flex items-baseline justify-between gap-3 pb-2.5 border-b border-slate-300">
							<span className="text-xs text-slate-600">Grants monitored</span>
							<span className="font-mono text-[13px] font-medium text-slate-900">
								{snapshot.monitoring.grantsMonitored.toLocaleString()}
							</span>
						</div>
						<div className="flex items-baseline justify-between gap-3">
							<span className="text-xs text-slate-600">Clauses flagged</span>
							<span className="font-mono text-[13px] font-medium text-slate-900">
								{snapshot.monitoring.clausesFlagged.toLocaleString()}
							</span>
						</div>
						<Link href={breakdownHref} className="mt-1.5 self-start">
							<Button
								type="button"
								className="primary-btn h-9 px-4 gap-1.5 text-[12.5px] font-semibold"
							>
								View breakdown
								<ChevronRight className="h-3.5 w-3.5" />
							</Button>
						</Link>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
