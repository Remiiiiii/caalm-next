"use client";

import { useReducedMotion } from "framer-motion";
import {
	AlertCircle,
	AlertTriangle,
	Briefcase,
	Download,
	ExternalLink,
	Flag,
	RefreshCw,
	ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import CountUp from "react-countup";
import { AnalyticsPageShell } from "@/components/analytics/AnalyticsPageShell";
import { RiskTrackingChart } from "@/components/dashboard/RiskTrackingChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageIndex } from "@/components/ui/page-index";
import { SearchField } from "@/components/ui/search-field";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { StatCardIcon } from "@/components/ui/stat-card-icon";
import { useToast } from "@/hooks/use-toast";
import { useRiskImpactDashboard } from "@/hooks/useRiskImpactDashboard";
import type {
	RiskImpactEvent,
	RiskImpactEventKind,
	RiskImpactPeriod,
} from "@/lib/dashboard/risk-impact.types";
import {
	formatRiskUsdExact,
	honestYoyLabel,
	KIND_LABELS,
	sumCountedEventDollars,
} from "@/lib/dashboard/risk-impact-events";
import { formatCountDelta } from "@/lib/dashboard/risk-impact-trends";

const PAGE_SIZE = 20;
const KIND_BADGE: Record<RiskImpactEventKind, string> = {
	flag: "bg-orange/10 text-orange border-orange/20",
	gap: "bg-green/10 text-green border-green/20",
	renewal: "bg-blue/10 text-blue border-blue/20",
};

function formatEventDate(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "—";
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function kindMatches(
	event: RiskImpactEvent,
	filter: "all" | RiskImpactEventKind,
): boolean {
	return filter === "all" || event.kind === filter;
}

function mutedZeroClass(
	value: number,
	base = "text-slate-700",
	muted = "text-slate-400",
): string {
	return value === 0 ? muted : base;
}

/** Dollar count-up — same pattern as LicensesMetricsBar; respects reduced motion. */
function AnimatedUsd({
	amount,
	className,
	duration = 1.2,
}: {
	amount: number;
	className?: string;
	duration?: number;
}) {
	const reduceMotion = useReducedMotion();
	const end = Math.max(0, Math.round(amount));

	if (reduceMotion) {
		return <span className={className}>{formatRiskUsdExact(end)}</span>;
	}

	return (
		<span className={className}>
			<CountUp
				key={end}
				end={end}
				duration={duration}
				prefix="$"
				separator=","
				preserveValue
			/>
		</span>
	);
}

export function RiskAvertedDetailPage() {
	const [period, setPeriod] = useState<RiskImpactPeriod>("ytd");
	const [kindFilter, setKindFilter] = useState<"all" | RiskImpactEventKind>(
		"all",
	);
	const [query, setQuery] = useState("");
	const [page, setPage] = useState(1);
	const [exporting, setExporting] = useState(false);
	const { toast } = useToast();
	const { snapshot, error, isLoading, refresh } = useRiskImpactDashboard({
		period,
	});

	const events = snapshot?.events ?? [];
	const filtered = useMemo(() => {
		const needle = query.trim().toLowerCase();
		return [...events]
			.filter((event) => kindMatches(event, kindFilter))
			.filter((event) => {
				if (!needle) return true;
				return (
					event.recordName.toLowerCase().includes(needle) ||
					event.source.toLowerCase().includes(needle)
				);
			})
			.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
	}, [events, kindFilter, query]);

	const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
	const countedDollars = sumCountedEventDollars(events);
	const countedEventCount = events.filter(
		(event) => event.countedTowardTotal,
	).length;
	const livePoints = snapshot?.liveSparkline?.length
		? snapshot.liveSparkline
		: [];

	const kindCounts = useMemo(() => {
		const counts = { all: events.length, flag: 0, gap: 0, renewal: 0 };
		for (const event of events) {
			counts[event.kind] += 1;
		}
		return counts;
	}, [events]);

	const yoyLabel = honestYoyLabel(snapshot?.yoyTrend ?? null);

	const downloadPdf = useCallback(async () => {
		setExporting(true);
		try {
			// Always export the selected Month / Quarter / Year window.
			const res = await fetch("/api/dashboard/risk-impact/export", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ period }),
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error || "Export failed");
			}
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `caalm-risk-averted-${period}.pdf`;
			link.click();
			URL.revokeObjectURL(url);
		} catch (downloadError) {
			toast({
				title: "Export failed",
				description:
					downloadError instanceof Error ? downloadError.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setExporting(false);
		}
	}, [period, toast]);

	if (error && !snapshot) {
		return (
			<AnalyticsPageShell title="Risk averted">
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6 flex flex-col items-center text-center gap-3">
						<AlertCircle className="h-8 w-8 text-red" />
						<p className="text-slate-700">Unable to load risk averted.</p>
						<Button
							type="button"
							className="primary-btn px-3 sm:px-4"
							onClick={() => refresh()}
						>
							<RefreshCw className="h-4 w-4" />
							Retry
						</Button>
					</CardContent>
				</Card>
			</AnalyticsPageShell>
		);
	}

	return (
		<AnalyticsPageShell
			title="Risk averted"
			subtitle="Board-ready register of flags, closed gaps, and on-time renewals that built the dollar figure. Open exposure stays separate so the number is not mixed with work that is still outstanding."
			actions={
				<div className="flex items-center gap-3">
					<SegmentedToggle
						value={period}
						onChange={(next) => {
							setPeriod(next);
							setPage(1);
							setKindFilter("all");
						}}
						ariaLabel="Board snapshot window"
						tabs={[
							{ value: "month", label: "Month" },
							{ value: "quarter", label: "Quarter" },
							{ value: "ytd", label: "Year" },
						]}
					/>
					<Button
						type="button"
						className="btn-primary px-3 sm:px-4"
						disabled={exporting || isLoading}
						onClick={() => void downloadPdf()}
					>
						<Download className="h-4 w-4" />
						{exporting ? "Preparing PDF…" : "Download PDF"}
					</Button>
				</div>
			}
		>
			{isLoading && !snapshot ? (
				<div className="space-y-6">
					{[1, 2, 3].map((key) => (
						<Card key={key} className="glass-card">
							<div className="glass-card-cap" />
							<CardContent className="p-4 sm:p-6">
								<div className="h-24 rounded-md bg-slate-200/60 animate-pulse" />
							</CardContent>
						</Card>
					))}
				</div>
			) : snapshot ? (
				<>
					{/* Live chart first — trend before the dollar breakdown */}
					<Card className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<RiskTrackingChart
								title="Live event activity"
								points={livePoints}
								period={snapshot.period}
							>
								<p className="mt-3 text-center text-[12.5px] text-slate-600 leading-relaxed mx-auto max-w-5xl">
									This chart is live events only. Empty weeks stay empty. Demo
									dates used on the dashboard sparkline are not included here
									and do not change the dollar figure.
								</p>
							</RiskTrackingChart>
						</CardContent>
					</Card>

					{/* Hero + action exposure + portfolio */}
					<div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] gap-6">
						<Card className="glass-card">
							<div className="glass-card-cap" />
							<CardContent className="p-4 sm:p-6">
								<div className="flex w-full items-center gap-2.5 border-b border-slate-200 pb-3">
									<StatCardIcon icon={ShieldCheck} tone="success" />
									<p className="text-sm font-medium sidebar-gradient-text">
										Risk averted · {snapshot.periodLabel}
									</p>
								</div>
								<AnimatedUsd
									amount={snapshot.primary.amount}
									className="block pt-3 text-3xl font-bold text-slate-700 tabular-nums tracking-tight"
								/>
								<p className="mt-2 text-xs text-slate-600">
									{countedEventCount} counted event
									{countedEventCount === 1 ? "" : "s"} · unique records only,
									duplicates are listed but not added twice.
								</p>
								<span className="mt-3 inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
									{yoyLabel}
								</span>
							</CardContent>
						</Card>

						{/*
						  Amber badge surface (bg-orange/10 + border-orange/20).
						  Body copy stays slate so orange-on-orange does not tank contrast.
						*/}
						<div className="rounded-lg border border-orange/20 bg-orange/10 overflow-hidden">
							<div className="p-4 sm:p-6">
								<div className="flex w-full items-center justify-between gap-3 border-b border-orange/20 pb-3 mb-3">
									<div className="flex items-center gap-2.5 min-w-0">
										<StatCardIcon icon={AlertTriangle} tone="warning" />
										<p className="text-sm font-medium text-orange uppercase tracking-wide">
											Still-open exposure
										</p>
									</div>
									<Link
										href="/contracts"
										className="inline-flex items-center gap-1 text-xs font-medium text-[#0f5384] hover:underline transition-colors duration-200 shrink-0"
									>
										View contracts
										<ExternalLink className="h-3 w-3" />
									</Link>
								</div>
								<RecapRow
									label="High risk"
									value={snapshot.openRisk.highRisk}
									muteZero
									tone="warning"
								/>
								<RecapRow
									label="Expiring in 90 days"
									value={snapshot.openRisk.expiring90}
									muteZero
									tone="warning"
								/>
								<RecapRow
									label="Expired, still open"
									value={snapshot.openRisk.expired}
									muteZero
									tone="warning"
								/>
							</div>
						</div>

						<Card className="glass-card">
							<div className="glass-card-cap" />
							<CardContent className="p-4 sm:p-6">
								<div className="flex w-full items-center gap-2.5 border-b border-slate-200 pb-3">
									<StatCardIcon icon={Briefcase} />
									<p className="text-sm font-medium sidebar-gradient-text">
										Portfolio protected
									</p>
								</div>
								<AnimatedUsd
									amount={snapshot.secondary.amount}
									className={`block pt-3 text-3xl font-bold tabular-nums tracking-tight ${mutedZeroClass(snapshot.secondary.amount)}`}
								/>
								<p className="mt-2 text-xs text-slate-600">
									Face value under active monitoring.
									{snapshot.secondary.amount <= 0
										? " No contract values recorded yet."
										: null}
								</p>
							</CardContent>
						</Card>
					</div>

					{/* Breakdown + inventory */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<Card className="glass-card">
							<div className="glass-card-cap" />
							<CardContent className="p-4 sm:p-6">
								<div className="flex items-center justify-between gap-3 mb-4">
									<p className="text-sm font-medium sidebar-gradient-text">
										What built the number
									</p>
									<span className="text-xs text-slate-500">
										Click a row to filter the register
									</span>
								</div>
								<RecapRow
									label="Flags caught"
									value={snapshot.counts.complianceFlagsCaught}
									delta={formatCountDelta(
										snapshot.countTrends.complianceFlagsCaught,
									)}
									onClick={() => {
										setKindFilter("flag");
										setPage(1);
									}}
								/>
								<RecapRow
									label="Gaps closed"
									value={snapshot.counts.auditGapsClosed}
									delta={formatCountDelta(snapshot.countTrends.auditGapsClosed)}
									onClick={() => {
										setKindFilter("gap");
										setPage(1);
									}}
								/>
								<RecapRow
									label="Licenses renewed on time"
									value={snapshot.counts.licensesRenewedOnTime}
									delta={formatCountDelta(
										snapshot.countTrends.licensesRenewedOnTime,
									)}
									onClick={() => {
										setKindFilter("renewal");
										setPage(1);
									}}
								/>
							</CardContent>
						</Card>

						<Card className="glass-card">
							<div className="glass-card-cap" />
							<CardContent className="p-4 sm:p-6">
								<p className="text-sm font-medium sidebar-gradient-text mb-4">
									Inventory monitored
								</p>
								<RecapRow
									label="Contracts monitored"
									value={snapshot.monitoring.contractsMonitored}
									muteZero
								/>
								<RecapRow
									label="Grants monitored"
									value={snapshot.monitoring.grantsMonitored}
									muteZero
								/>
								<RecapRow
									label="Clauses flagged"
									value={snapshot.monitoring.clausesFlagged}
									muteZero
								/>
							</CardContent>
						</Card>
					</div>

					{/* Event register */}
					<Card className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<p className="text-sm font-medium sidebar-gradient-text mb-3">
								Event register
							</p>
							<div className="flex items-center justify-between gap-3 mb-4">
								<SearchField
									value={query}
									onChange={(event) => {
										setQuery(event.target.value);
										setPage(1);
									}}
									placeholder="Search record or source"
									containerClassName="flex-1 min-w-0 max-w-xl"
								/>
								<SegmentedToggle
									value={kindFilter}
									onChange={(next) => {
										setKindFilter(next);
										setPage(1);
									}}
									ariaLabel="Event kind"
									className="shrink-0"
									tabs={[
										{ value: "all", label: "All", count: kindCounts.all },
										{ value: "flag", label: "Flags", count: kindCounts.flag },
										{ value: "gap", label: "Gaps", count: kindCounts.gap },
										{
											value: "renewal",
											label: "Renewals",
											count: kindCounts.renewal,
										},
									]}
								/>
							</div>

							{pageRows.length === 0 ? (
								<div className="flex flex-col items-center text-center gap-2 py-10">
									<Flag className="h-8 w-8 text-slate-400" />
									<p className="text-slate-700">
										No live events match this window and filter.
									</p>
									<p className="text-xs text-slate-600">
										The dollar figure stays $0 until a flag, closed gap, or
										on-time renewal lands.
									</p>
								</div>
							) : (
								<div className="overflow-x-auto">
									<table className="w-full text-left text-sm">
										<thead>
											<tr className="border-b border-slate-200 text-xs text-slate-600 uppercase tracking-wide">
												<th className="py-2 pr-3 font-medium">Date</th>
												<th className="py-2 pr-3 font-medium">Kind</th>
												<th className="py-2 pr-3 font-medium">Record</th>
												<th className="py-2 pr-3 font-medium">Source</th>
												<th className="py-2 pr-3 font-medium text-right">
													Dollars
												</th>
												<th className="py-2 font-medium">Status</th>
											</tr>
										</thead>
										<tbody>
											{pageRows.map((event) => {
												const dollars = event.dollars || 0;
												return (
													<tr
														key={event.id}
														className="border-b border-slate-200 last:border-b-0"
													>
														<td className="py-3 pr-3 text-slate-700 tabular-nums whitespace-nowrap">
															{formatEventDate(event.date)}
														</td>
														<td className="py-3 pr-3">
															<span
																className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium border ${KIND_BADGE[event.kind]}`}
															>
																{KIND_LABELS[event.kind]}
															</span>
														</td>
														<td className="py-3 pr-3">
															{event.href ? (
																<Link
																	href={event.href}
																	className="text-slate-700 hover:text-[#0f5384] transition-colors duration-200"
																>
																	{event.recordName}
																</Link>
															) : (
																<span className="text-slate-700">
																	{event.recordName}
																</span>
															)}
														</td>
														<td className="py-3 pr-3 text-slate-600">
															{event.source}
														</td>
														<td
															className={`py-3 pr-3 text-right tabular-nums ${
																dollars > 0
																	? "font-semibold text-slate-800"
																	: "text-slate-400"
															}`}
														>
															{event.dollarsFormatted}
														</td>
														<td className="py-3">
															<span
																className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium border ${
																	event.countedTowardTotal
																		? "bg-green/10 text-green border-green/20"
																		: "bg-slate-100 text-slate-600 border-slate-200"
																}`}
															>
																{event.countedTowardTotal
																	? "Counted"
																	: "Listed"}
															</span>
														</td>
													</tr>
												);
											})}
										</tbody>
										<tfoot>
											<tr className="border-t border-slate-200">
												<td
													colSpan={4}
													className="py-3 pr-3 text-sm text-slate-600"
												>
													Counted total (matches headline)
												</td>
												<td className="py-3 pr-3 text-right tabular-nums font-semibold text-slate-800">
													<AnimatedUsd amount={countedDollars} />
												</td>
												<td />
											</tr>
										</tfoot>
									</table>
								</div>
							)}
							<PageIndex
								page={page}
								totalItems={filtered.length}
								pageSize={PAGE_SIZE}
								onPageChange={setPage}
								hideWhenSinglePage
								showRange
								itemLabel="events"
								className="mt-4"
							/>
						</CardContent>
					</Card>
				</>
			) : null}
		</AnalyticsPageShell>
	);
}

function RecapRow({
	label,
	value,
	delta,
	muteZero,
	onClick,
	tone = "default",
}: {
	label: string;
	value: number;
	delta?: string;
	muteZero?: boolean;
	onClick?: () => void;
	tone?: "default" | "warning";
}) {
	const isWarning = tone === "warning";
	const isMuted = Boolean(muteZero && value === 0);
	// Warning rows: slate ink on amber fill (readable). Orange stays on the status badge only.
	const activeValue = "text-[13px] font-semibold text-slate-800";
	const valueClass = isMuted
		? "text-[13px] font-medium text-slate-500"
		: isWarning
			? activeValue
			: "text-[13px] font-medium text-slate-700";
	const labelClass = isMuted
		? "text-xs text-slate-500 leading-snug"
		: isWarning
			? "text-xs text-slate-700 leading-snug"
			: "text-xs text-slate-600 leading-snug";
	const deltaClass = "text-xs text-slate-500";
	const rowBorder = isWarning
		? "border-b border-orange/20 last:border-b-0"
		: "border-b border-slate-300 last:border-b-0";

	const content = (
		<>
			<span className={labelClass}>{label}</span>
			<span className="flex items-baseline gap-1.5 shrink-0 text-right tabular-nums">
				<span className={valueClass}>{value.toLocaleString()}</span>
				{delta ? <span className={deltaClass}>{delta}</span> : null}
			</span>
		</>
	);

	if (onClick) {
		return (
			<button
				type="button"
				onClick={onClick}
				className={`flex w-full items-baseline justify-between gap-3 min-h-11 pb-2.5 last:pb-0 cursor-pointer rounded-sm hover:bg-blue-50/60 transition-colors duration-200 text-left -mx-1 px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 ${rowBorder}`}
			>
				{content}
			</button>
		);
	}

	return (
		<div
			className={`flex items-baseline justify-between gap-3 min-h-11 pb-2.5 last:pb-0 ${rowBorder}`}
		>
			{content}
		</div>
	);
}
