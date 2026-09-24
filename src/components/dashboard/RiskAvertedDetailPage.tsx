"use client";

import {
	AlertCircle,
	AlertTriangle,
	Download,
	ExternalLink,
	FileText,
	Flag,
	RefreshCw,
	ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { AnalyticsPageShell } from "@/components/analytics/AnalyticsPageShell";
import { AnalyticsStatCard } from "@/components/analytics/AnalyticsStatCard";
import { RiskTrackingChart } from "@/components/dashboard/RiskTrackingChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageIndex } from "@/components/ui/page-index";
import { SearchField } from "@/components/ui/search-field";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { useToast } from "@/hooks/use-toast";
import { useRiskImpactDashboard } from "@/hooks/useRiskImpactDashboard";
import {
	honestYoyLabel,
	KIND_LABELS,
	sumCountedEventDollars,
} from "@/lib/dashboard/risk-impact-events";
import { formatCountDelta } from "@/lib/dashboard/risk-impact-trends";
import type {
	RiskImpactEvent,
	RiskImpactEventKind,
	RiskImpactPeriod,
} from "@/lib/dashboard/risk-impact.types";

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
	const livePoints = snapshot?.liveSparkline?.length
		? snapshot.liveSparkline
		: [];

	const downloadPdf = useCallback(async () => {
		setExporting(true);
		try {
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
					downloadError instanceof Error
						? downloadError.message
						: "Try again",
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
						}}
						ariaLabel="Reporting window"
						tabs={[
							{ value: "ytd", label: "YTD" },
							{ value: "last90", label: "90 days" },
							{ value: "last30", label: "30 days" },
						]}
					/>
					<Button
						type="button"
						className="primary-btn px-3 sm:px-4"
						disabled={exporting || isLoading}
						onClick={downloadPdf}
					>
						<Download className="h-4 w-4" />
						{exporting ? "Preparing PDF…" : "Download PDF"}
					</Button>
				</div>
			}
		>
			{isLoading && !snapshot ? (
				<div className="grid grid-cols-4 gap-6">
					{[1, 2, 3, 4].map((key) => (
						<Card key={key} className="glass-card">
							<div className="glass-card-cap" />
							<CardContent className="p-4 sm:p-6">
								<div className="h-16 rounded-md bg-slate-200/60 animate-pulse" />
							</CardContent>
						</Card>
					))}
				</div>
			) : snapshot ? (
				<>
					<div className="grid grid-cols-4 gap-6">
						<AnalyticsStatCard
							title="Risk averted"
							value={snapshot.primary.amountFormatted}
							description={snapshot.periodLabel}
							icon={ShieldCheck}
							trend={honestYoyLabel(snapshot.yoyTrend)}
							trendDirection={
								snapshot.yoyTrend?.direction === "down"
									? "down"
									: snapshot.yoyTrend?.direction === "up"
										? "up"
										: "neutral"
							}
						/>
						<AnalyticsStatCard
							title="Counted events"
							value={events.filter((event) => event.countedTowardTotal).length}
							description={`${events.length} live rows in window`}
							icon={Flag}
						/>
						<AnalyticsStatCard
							title="Counted dollars"
							value={new Intl.NumberFormat("en-US", {
								style: "currency",
								currency: "USD",
								maximumFractionDigits: 0,
							}).format(countedDollars)}
							description="Unique records only; duplicates are listed, not added twice"
							icon={FileText}
						/>
						<AnalyticsStatCard
							title="Portfolio protected"
							value={snapshot.secondary.amountFormatted}
							description="Face value still under active monitoring"
							icon={AlertTriangle}
						/>
					</div>

					<div className="grid grid-cols-3 gap-6">
						<Card className="glass-card">
							<div className="glass-card-cap" />
							<CardContent className="p-4 sm:p-6">
								<p className="text-sm font-medium sidebar-gradient-text mb-4">
									What built the number
								</p>
								<RecapRow
									label="Flags caught"
									value={snapshot.counts.complianceFlagsCaught}
									delta={formatCountDelta(
										snapshot.countTrends.complianceFlagsCaught,
									)}
								/>
								<RecapRow
									label="Gaps closed"
									value={snapshot.counts.auditGapsClosed}
									delta={formatCountDelta(snapshot.countTrends.auditGapsClosed)}
								/>
								<RecapRow
									label="Licenses renewed on time"
									value={snapshot.counts.licensesRenewedOnTime}
									delta={formatCountDelta(
										snapshot.countTrends.licensesRenewedOnTime,
									)}
								/>
							</CardContent>
						</Card>
						<Card className="glass-card">
							<div className="glass-card-cap" />
							<CardContent className="p-4 sm:p-6">
								<div className="flex items-center justify-between gap-3 mb-4">
									<p className="text-sm font-medium sidebar-gradient-text">
										Still-open exposure
									</p>
									<Link
										href="/contracts"
										className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-[#0f5384] transition-colors duration-200"
									>
										Contracts
										<ExternalLink className="h-3 w-3" />
									</Link>
								</div>
								<RecapRow
									label="High risk"
									value={snapshot.openRisk.highRisk}
								/>
								<RecapRow
									label="Expiring in 90 days"
									value={snapshot.openRisk.expiring90}
								/>
								<RecapRow
									label="Expired still open"
									value={snapshot.openRisk.expired}
								/>
							</CardContent>
						</Card>
						<Card className="glass-card">
							<div className="glass-card-cap" />
							<CardContent className="p-4 sm:p-6">
								<div className="flex items-center justify-between gap-3 mb-4">
									<p className="text-sm font-medium sidebar-gradient-text">
										Inventory monitored
									</p>
									<Link
										href="/licenses"
										className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-[#0f5384] transition-colors duration-200"
									>
										Licenses
										<ExternalLink className="h-3 w-3" />
									</Link>
								</div>
								<RecapRow
									label="Contracts monitored"
									value={snapshot.monitoring.contractsMonitored}
								/>
								<RecapRow
									label="Grants monitored"
									value={snapshot.monitoring.grantsMonitored}
								/>
								<RecapRow
									label="Clauses flagged"
									value={snapshot.monitoring.clausesFlagged}
								/>
							</CardContent>
						</Card>
					</div>

					<Card className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<RiskTrackingChart
								title="Live event activity"
								points={livePoints}
								period={snapshot.period}
							>
								<p className="mt-3 text-[12.5px] text-slate-600 leading-relaxed max-w-4xl">
									This chart is live events only. Empty weeks stay empty. Demo
									dates used on the dashboard sparkline are not included here
									and do not change the dollar figure.
								</p>
							</RiskTrackingChart>
						</CardContent>
					</Card>

					<Card className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<div className="flex items-center justify-between gap-4 mb-4">
								<p className="text-sm font-medium sidebar-gradient-text">
									Event register
								</p>
								<div className="flex items-center justify-end gap-3">
									<SearchField
										value={query}
										onChange={(event) => {
											setQuery(event.target.value);
											setPage(1);
										}}
										placeholder="Search record or source"
										containerClassName="w-64"
									/>
									<SegmentedToggle
										value={kindFilter}
										onChange={(next) => {
											setKindFilter(next);
											setPage(1);
										}}
										ariaLabel="Event kind"
										tabs={[
											{ value: "all", label: "All" },
											{ value: "flag", label: "Flags" },
											{ value: "gap", label: "Gaps" },
											{ value: "renewal", label: "Renewals" },
										]}
									/>
								</div>
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
											<tr className="border-b border-slate-200 text-xs text-slate-600">
												<th className="py-2 pr-3 font-medium">Date</th>
												<th className="py-2 pr-3 font-medium">Kind</th>
												<th className="py-2 pr-3 font-medium">Record</th>
												<th className="py-2 pr-3 font-medium">Source</th>
												<th className="py-2 pr-3 font-medium text-right">
													Dollars
												</th>
												<th className="py-2 font-medium">Counted</th>
											</tr>
										</thead>
										<tbody>
											{pageRows.map((event) => (
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
													<td className="py-3 pr-3 text-right tabular-nums text-slate-700">
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
											))}
										</tbody>
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
}: {
	label: string;
	value: number;
	delta?: string;
}) {
	return (
		<div className="flex items-baseline justify-between gap-3 min-h-11 pb-2.5 border-b border-slate-300 last:border-b-0 last:pb-0">
			<span className="text-xs text-slate-600 leading-snug">{label}</span>
			<span className="flex items-baseline gap-1.5 shrink-0 text-right tabular-nums">
				<span className="text-[13px] font-medium text-slate-700">
					{value.toLocaleString()}
				</span>
				{delta ? <span className="text-xs text-slate-600">{delta}</span> : null}
			</span>
		</div>
	);
}
