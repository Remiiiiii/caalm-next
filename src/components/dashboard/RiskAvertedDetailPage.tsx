"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
	AlertCircle,
	AlertTriangle,
	Briefcase,
	ChevronDown,
	Download,
	ExternalLink,
	FileSearch,
	ListChecks,
	Loader2,
	RefreshCw,
	ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";
import CountUp from "react-countup";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ReferenceDot,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { AnalyticsPageShell } from "@/components/analytics/AnalyticsPageShell";
import { RiskEventsBulkBar } from "@/components/dashboard/RiskEventsBulkBar";
import { RiskTrackingChart } from "@/components/dashboard/RiskTrackingChart";
import {
	fadeLeft,
	fadeRight,
	fadeUp,
	scaleIn,
	softRise,
	staggerContainer,
	viewportOnce,
} from "@/components/landing/motion";
import { AnimatedBar } from "@/components/ui/animated-bar";
import { Button } from "@/components/ui/button";
import {
	CaalmDataTable,
	CaalmDataTableEmpty,
	DATA_TABLE_BODY_ROW_BASE,
	DATA_TABLE_BODY_ROW_CLICKABLE,
	DATA_TABLE_CELL,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
	SortableDataTableHead,
} from "@/components/ui/caalm-data-table";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MetricStatCard } from "@/components/ui/metric-stat-card";
import { PageIndex } from "@/components/ui/page-index";
import { SearchField } from "@/components/ui/search-field";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { StatCardIcon } from "@/components/ui/stat-card-icon";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useRiskImpactDashboard } from "@/hooks/useRiskImpactDashboard";
import {
	riskAvertedRegisterXlsx,
	XLSX_MIME,
} from "@/lib/dashboard/risk-averted-xlsx";
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
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;
const PILL = "inline-block px-2 py-0.5 text-xs rounded-full border";
const NEUTRAL_PILL = "bg-slate-100 text-slate-600 border-slate-200";
const KIND_BADGE: Record<RiskImpactEventKind, string> = {
	flag: "bg-orange/10 text-orange border-orange/20",
	gap: NEUTRAL_PILL,
	renewal: "bg-blue/10 text-blue border-blue/20",
};
const PORTFOLIO_DOTS = {
	contracts: "bg-[#0f5384]",
	licenses: "bg-[#078FAB]",
	grants: "bg-slate-300",
} as const;
const MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

type SortKey = "date" | "dollars";

const compactUsd = (v: number) =>
	v === 0
		? "$0"
		: v >= 1e6
			? `$${v / 1e6}M`
			: v >= 1e3
				? `$${v / 1e3}K`
				: `$${v}`;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const pct = (n: number) =>
	n > 0 && n < 0.1 ? "<0.1%" : `${n.toFixed(n % 1 ? 1 : 0)}%`;

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

/** Optional lead-in (chip or bar) then label/value rows split by slate-200 lines. */
function StatRows({
	top,
	rows,
}: {
	top?: ReactNode;
	rows: Array<[string, ReactNode, string?]>;
}) {
	return (
		<div className="w-full">
			{top ? <div className="mb-3">{top}</div> : null}
			{rows.map(([label, value, dot]) => (
				<div
					key={label}
					className="flex items-center justify-between gap-3 border-t border-slate-200 py-2 text-xs"
				>
					<span className="inline-flex items-center gap-1.5 text-slate-600">
						{dot ? (
							<span
								className={cn("h-1.5 w-1.5 rounded-full", dot)}
								aria-hidden
							/>
						) : null}
						{label}
					</span>
					<span className="font-semibold tabular-nums text-slate-700">
						{value}
					</span>
				</div>
			))}
		</div>
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
	const [exportingCsv, setExportingCsv] = useState(false);
	const [sortKey, setSortKey] = useState<SortKey>("date");
	const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
	const [selected, setSelected] = useState<RiskImpactEvent | null>(null);
	const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
	const registerRef = useRef<HTMLDivElement>(null);
	const reduceMotion = useReducedMotion();
	// Same entrance as the superadmin dashboard: blocks reveal as they scroll into view.
	const reveal = reduceMotion
		? undefined
		: {
				initial: "hidden" as const,
				whileInView: "visible" as const,
				viewport: viewportOnce,
			};
	const revealSolo = (variants: typeof fadeUp) =>
		reduceMotion ? undefined : { ...reveal, variants };
	const revealStagger = reduceMotion
		? undefined
		: { ...reveal, variants: staggerContainer };
	const revealItem = (variants: typeof fadeUp) =>
		reduceMotion ? undefined : { variants };
	const { toast } = useToast();
	const { snapshot, error, isLoading, refresh } = useRiskImpactDashboard({
		period,
	});

	const events = snapshot?.events ?? [];
	const filtered = useMemo(() => {
		const needle = query.trim().toLowerCase();
		const dir = sortDir === "asc" ? 1 : -1;
		return events
			.filter((event) => kindMatches(event, kindFilter))
			.filter(
				(event) =>
					!needle ||
					event.recordName.toLowerCase().includes(needle) ||
					event.source.toLowerCase().includes(needle),
			)
			.sort((a, b) =>
				sortKey === "dollars"
					? ((a.countedTowardTotal ? a.dollars : 0) -
							(b.countedTowardTotal ? b.dollars : 0)) *
						dir
					: (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) * dir,
			);
	}, [events, kindFilter, query, sortKey, sortDir]);

	const toggleSort = (key: SortKey) => {
		if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
		else {
			setSortKey(key);
			setSortDir("desc");
		}
		setPage(1);
	};

	const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
	const allPageChecked =
		pageRows.length > 0 && pageRows.every((e) => checkedIds.has(e.id));
	const somePageChecked =
		!allPageChecked && pageRows.some((e) => checkedIds.has(e.id));
	const countedDollars = sumCountedEventDollars(events);
	const countedEvents = events.filter((event) => event.countedTowardTotal);
	const countedEventCount = countedEvents.length;
	const filteredCounted = sumCountedEventDollars(filtered);
	const isFiltered = kindFilter !== "all" || query.trim() !== "";

	const kindCounts = useMemo(() => {
		const counts = { all: events.length, flag: 0, gap: 0, renewal: 0 };
		for (const event of events) counts[event.kind] += 1;
		return counts;
	}, [events]);

	// Cumulative counted dollars by month; duplicates and open exposure never enter.
	const year = new Date().getFullYear();
	const cumulative = useMemo(() => {
		const byMonth = Array(12).fill(0) as number[];
		for (const event of countedEvents) {
			const d = new Date(event.date);
			if (d.getFullYear() === year) byMonth[d.getMonth()] += event.dollars || 0;
		}
		let running = 0;
		return MONTHS.map((label, i) => {
			running += byMonth[i];
			return { label, value: running };
		});
	}, [countedEvents, year]);
	const lastStep = useMemo(() => {
		const latest = countedEvents
			.filter((e) => e.dollars > 0 && new Date(e.date).getFullYear() === year)
			.sort((a, b) => (a.date < b.date ? 1 : -1))[0];
		return latest
			? { event: latest, month: new Date(latest.date).getMonth() }
			: null;
	}, [countedEvents, year]);
	const lastStepCount = lastStep
		? countedEvents.filter(
				(e) =>
					e.dollars > 0 &&
					new Date(e.date).getFullYear() === year &&
					new Date(e.date).getMonth() === lastStep.month,
			).length
		: 0;

	const byKind = (kind: RiskImpactEventKind) => {
		const rows = events.filter((e) => e.kind === kind);
		return {
			events: rows.length,
			dollars: sumCountedEventDollars(rows),
			allDuplicate: rows.length > 0 && !rows.some((e) => e.countedTowardTotal),
		};
	};

	const showRegister = (kind: "all" | RiskImpactEventKind) => {
		setKindFilter(kind);
		setPage(1);
		registerRef.current?.scrollIntoView({
			behavior: reduceMotion ? "auto" : "smooth",
			block: "start",
		});
	};

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

	const exportCsv = async (list: RiskImpactEvent[] = filtered) => {
		setExportingCsv(true);
		// The workbook builds instantly; hold the spinner briefly so the click registers.
		await new Promise((resolve) => setTimeout(resolve, 400));
		const blob = new Blob(
			[
				riskAvertedRegisterXlsx({
					events: list,
					periodLabel: snapshot?.periodLabel ?? period,
					generatedAt: new Date(),
				}),
			],
			{ type: XLSX_MIME },
		);
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `caalm-risk-averted-register-${period}.xlsx`;
		link.click();
		URL.revokeObjectURL(url);
		setExportingCsv(false);
	};

	if (error && !snapshot) {
		return (
			<AnalyticsPageShell title="Risk averted">
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="text-slate-700 p-4 sm:p-6 flex flex-col items-center text-center gap-3">
						<AlertCircle className="h-8 w-8 text-red" />
						<p className="text-slate-700">Unable to load risk averted.</p>
						<Button
							type="button"
							className="btn-primary px-3 sm:px-4"
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

	const open = snapshot?.openRisk;
	const exposureTotal = open
		? open.highRisk + open.expiring90 + open.expired
		: 0;
	const byType = snapshot?.secondary.byType ?? {
		contracts: { count: 0, amount: 0 },
		licenses: { count: 0, amount: 0 },
		grants: { count: 0, amount: 0 },
	};
	const share = (dollars: number) =>
		countedDollars > 0 ? (dollars / countedDollars) * 100 : 0;
	const th = (extra?: string) => cn(DATA_TABLE_HEADER_CELL, "px-3", extra);

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 space-y-6 text-slate-700">
			{/* Header */}
			<motion.div {...revealSolo(softRise)} className="space-y-2">
				<div className="flex items-start justify-between gap-4">
					<h1 className="h1 capitalize sidebar-gradient-text">Risk averted</h1>
					{snapshot?.computedAt ? (
						<p className="caption text-slate-500">
							Last updated{" "}
							{new Date(snapshot.computedAt).toLocaleString("en-US", {
								month: "short",
								day: "numeric",
								year: "numeric",
								hour: "numeric",
								minute: "2-digit",
							})}
						</p>
					) : null}
				</div>
				<div className="flex items-start justify-between gap-4">
					<p className="body-2 max-w-3xl">
						Board-ready register of flags, closed gaps, and on-time renewals
						that built the dollar figure. Open exposure stays separate so the
						number is not mixed with work that is still outstanding.
					</p>
					<div className="flex items-center gap-3 shrink-0">
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
							{exporting ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Download className="h-4 w-4" />
							)}
							{exporting ? "Preparing PDF…" : "Download PDF"}
						</Button>
					</div>
				</div>
			</motion.div>

			{isLoading && !snapshot ? (
				<div className="space-y-6">
					{[1, 2, 3].map((key) => (
						<Card key={key} className="glass-card">
							<div className="glass-card-cap" />
							<CardContent className="text-slate-700 p-4 sm:p-6">
								<div className="h-24 rounded-md bg-slate-200/60 animate-pulse" />
							</CardContent>
						</Card>
					))}
				</div>
			) : snapshot ? (
				<>
					{/* Still-open exposure: only when something is open; not scoped by the period toggle */}
					{open && exposureTotal > 0 ? (
						<motion.section
							{...revealSolo(fadeUp)}
							aria-label="Still-open exposure"
							className={cn(
								"flex flex-wrap items-stretch rounded-lg border border-orange/20 bg-orange/10",
							)}
						>
							<div className="flex items-center gap-3 px-4 py-3">
								<StatCardIcon icon={AlertTriangle} tone="warning" />
								<div>
									<p className="text-xs font-semibold text-orange uppercase tracking-wide">
										Still-open exposure
									</p>
									<p className="caption text-slate-600">
										Contracts & licenses · kept separate from Risk Averted
									</p>
								</div>
							</div>
							{(
								[
									[
										"High risk",
										open.highRisk,
										"bg-red/10 text-red border-red/20",
										"highRisk",
									],
									[
										"Expiring in 90 days",
										open.expiring90,
										"bg-orange/10 text-orange border-orange/20",
										"expiring90",
									],
									[
										"Expired, still open",
										open.expired,
										open.expired > 0
											? "bg-red/10 text-red border-red/20"
											: NEUTRAL_PILL,
										"expired",
									],
								] as const
							).map(([label, count, badge, key]) => (
								<div key={label} className="flex items-stretch">
									<span
										className="h-8 w-px self-center bg-orange/20"
										aria-hidden
									/>
									<div className="flex items-center gap-3 px-4 py-3">
										<div>
											<p className="body-2 text-slate-700">{label}</p>
											<p className="caption text-slate-500">
												<Link
													href="/contracts"
													className="rounded-sm hover:text-[#078FAB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB]"
												>
													{plural(
														open.byType?.contracts[key] ?? count,
														"contract",
													)}
												</Link>
												{" · "}
												<Link
													href="/licenses"
													className="rounded-sm hover:text-[#078FAB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB]"
												>
													{plural(open.byType?.licenses[key] ?? 0, "license")}
												</Link>
											</p>
										</div>
										<span
											className={cn(
												"inline-flex min-w-7 justify-center rounded-md border px-2 py-0.5 text-xs font-bold",
												badge,
											)}
										>
											{count}
										</span>
									</div>
								</div>
							))}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button
										type="button"
										className="ml-auto flex cursor-pointer items-center gap-1 px-4 py-3 text-sm font-medium text-[#078FAB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB] focus-visible:ring-inset"
									>
										Review exposure
										<ChevronDown
											className="h-3.5 w-3.5 text-slate-600"
											aria-hidden
										/>
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="min-w-[10rem]">
									<DropdownMenuItem asChild className="cursor-pointer gap-2">
										<Link href="/contracts">
											<Image
												src="/assets/icons/all-contracts.svg"
												alt=""
												width={16}
												height={16}
											/>
											Contracts
											<ExternalLink className="ml-auto h-3 w-3" aria-hidden />
										</Link>
									</DropdownMenuItem>
									<DropdownMenuItem asChild className="cursor-pointer gap-2">
										<Link href="/licenses">
											<Image
												src="/assets/icons/licenses.svg"
												alt=""
												width={16}
												height={16}
											/>
											Licenses
											<ExternalLink className="ml-auto h-3 w-3" aria-hidden />
										</Link>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</motion.section>
					) : null}

					{/* Row A */}
					<motion.div
						{...revealStagger}
						className="grid grid-cols-1 lg:grid-cols-5 gap-6"
					>
						<motion.div {...revealItem(fadeLeft)} className="lg:col-span-2">
							<Card className="glass-card h-full">
								<div className="glass-card-cap" />
								<CardContent className="text-slate-700 p-4 sm:p-6">
									<p className="h5 sidebar-gradient-text">
										Cumulative risk averted · {year}
									</p>
									<p className="caption text-slate-500">
										USD, counted live events only
									</p>
									<div
										className="mt-4 h-52 w-full"
										role="img"
										aria-label={`Cumulative risk averted ${formatRiskUsdExact(countedDollars)} in ${year}`}
									>
										<ResponsiveContainer width="100%" height="100%">
											<AreaChart
												data={cumulative}
												margin={{ top: 28, right: 10, left: 0, bottom: 0 }}
											>
												<defs>
													<linearGradient
														id="riskCumFill"
														x1="0"
														y1="0"
														x2="0"
														y2="1"
													>
														<stop
															offset="0%"
															stopColor="#03AFBF"
															stopOpacity={0.28}
														/>
														<stop
															offset="100%"
															stopColor="#0f5384"
															stopOpacity={0.02}
														/>
													</linearGradient>
												</defs>
												<CartesianGrid
													strokeDasharray="3 3"
													stroke="#e2e8f0"
													vertical={false}
												/>
												<XAxis
													dataKey="label"
													interval={0}
													tick={{ fill: "#64748b", fontSize: 10 }}
													tickLine={false}
													axisLine={{ stroke: "#cbd5e1" }}
												/>
												<YAxis
													width={40}
													tickCount={4}
													tickFormatter={compactUsd}
													tick={{ fill: "#64748b", fontSize: 10 }}
													tickLine={false}
													axisLine={false}
													domain={[0, "auto"]}
												/>
												<Tooltip
													cursor={{ stroke: "#0f5384", strokeDasharray: "3 3" }}
													content={({ active, payload }) => {
														if (!active || !payload?.[0]) return null;
														const point = payload[0].payload as {
															label: string;
															value: number;
														};
														return (
															<div className="rounded-md border border-slate-200 bg-white px-3 py-2 shadow-md">
																<p className="text-xs font-medium text-slate-700">
																	{new Date(
																		year,
																		MONTHS.indexOf(point.label),
																	).toLocaleString("en-US", {
																		month: "long",
																		year: "numeric",
																	})}
																</p>
																<p className="mt-1 text-xs tabular-nums text-slate-600">
																	<span className="font-semibold text-slate-700">
																		{formatRiskUsdExact(point.value)}
																	</span>{" "}
																	cumulative
																</p>
															</div>
														);
													}}
												/>
												<Area
													type="stepAfter"
													dataKey="value"
													stroke="#0f5384"
													strokeWidth={2}
													fill="url(#riskCumFill)"
													dot={false}
													isAnimationActive={false}
												/>
												{lastStep ? (
													<ReferenceDot
														x={MONTHS[lastStep.month]}
														y={cumulative[lastStep.month].value}
														r={4}
														fill="#fff"
														stroke="#0f5384"
														strokeWidth={2}
														label={{
															value: `${formatRiskUsdExact(cumulative[lastStep.month].value)} · ${MONTHS[lastStep.month]} ${new Date(lastStep.event.date).getDate()}`,
															position: "top",
															fill: "#0f5384",
															fontSize: 10,
															fontWeight: 600,
														}}
													/>
												) : null}
											</AreaChart>
										</ResponsiveContainer>
									</div>
									{lastStep ? (
										<p className="caption mt-2 text-slate-600">
											{plural(lastStepCount, "counted event")} reach the total
											in {MONTHS[lastStep.month]}.
										</p>
									) : null}
								</CardContent>
							</Card>
						</motion.div>

						<motion.div {...revealItem(fadeRight)} className="lg:col-span-3">
							<Card className="glass-card h-full">
								<div className="glass-card-cap" />
								<CardContent className="text-slate-700 p-4 sm:p-6">
									<RiskTrackingChart
										title="Live event activity"
										points={snapshot.liveSparkline ?? []}
										period={snapshot.period}
										fixedScale
									/>
								</CardContent>
							</Card>
						</motion.div>
					</motion.div>

					{/* KPI row */}
					<motion.div
						{...revealStagger}
						className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
					>
						<motion.div {...revealItem(scaleIn)} className="h-full">
							<MetricStatCard
								title={`Risk averted · ${snapshot.periodLabel}`}
								titleClassName="whitespace-nowrap"
								icon={ShieldCheck}
								value={<AnimatedUsd amount={snapshot.primary.amount} />}
								description={`${plural(countedEventCount, "counted event")} · duplicates are listed but not added twice`}
								pinFooter
								footer={
									<StatRows
										top={
											<span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
												{honestYoyLabel(snapshot.yoyTrend ?? null)}
											</span>
										}
										rows={[
											[
												"Largest counted event",
												formatRiskUsdExact(
													Math.max(
														0,
														...countedEvents.map((e) => e.dollars || 0),
													),
												),
											],
											[
												"Share of portfolio protected",
												snapshot.secondary.amount > 0
													? pct(
															(snapshot.primary.amount /
																snapshot.secondary.amount) *
																100,
														)
													: "—",
											],
										]}
									/>
								}
							/>
						</motion.div>
						<motion.div {...revealItem(scaleIn)} className="h-full">
							<MetricStatCard
								title="Portfolio protected"
								icon={Briefcase}
								value={<AnimatedUsd amount={snapshot.secondary.amount} />}
								description="Face value under active monitoring"
								pinFooter
								footer={
									<StatRows
										top={
											<AnimatedBar
												label="Portfolio face value by type"
												segments={(
													["contracts", "licenses", "grants"] as const
												).map((k) => ({
													pct:
														snapshot.secondary.amount > 0
															? (byType[k].amount / snapshot.secondary.amount) *
																100
															: 0,
													className: PORTFOLIO_DOTS[k],
												}))}
											/>
										}
										rows={[
											[
												`Contracts · ${byType.contracts.count}`,
												formatRiskUsdExact(byType.contracts.amount),
												PORTFOLIO_DOTS.contracts,
											],
											[
												`Licenses · ${byType.licenses.count}`,
												formatRiskUsdExact(byType.licenses.amount),
												PORTFOLIO_DOTS.licenses,
											],
											[
												`Grants · ${byType.grants.count}`,
												formatRiskUsdExact(byType.grants.amount),
												PORTFOLIO_DOTS.grants,
											],
										]}
									/>
								}
							/>
						</motion.div>
						<motion.div {...revealItem(scaleIn)} className="h-full">
							<MetricStatCard
								title="Inventory monitored"
								icon={FileSearch}
								value={plural(
									snapshot.monitoring.contractsMonitored +
										snapshot.monitoring.licensesMonitored,
									"item",
								)}
								description="Contracts, licenses and grants under active monitoring"
								pinFooter
								footer={
									<StatRows
										rows={[
											[
												"Contracts monitored",
												String(
													snapshot.monitoring.contractsMonitored -
														snapshot.monitoring.grantsMonitored,
												),
											],
											[
												"Licenses monitored",
												String(snapshot.monitoring.licensesMonitored),
											],
											[
												"Grants monitored",
												String(snapshot.monitoring.grantsMonitored),
											],
											[
												"Clauses flagged",
												<span
													key="clauses"
													className="inline-flex min-w-7 justify-center rounded-md border border-orange/20 bg-orange/10 px-2 py-0.5 text-xs font-bold text-orange"
												>
													{snapshot.monitoring.clausesFlagged}
												</span>,
											],
										]}
									/>
								}
							/>
						</motion.div>
						<motion.div {...revealItem(scaleIn)} className="h-full">
							<MetricStatCard
								title="Events in register"
								icon={ListChecks}
								value={`${events.length} logged`}
								description={`${countedEventCount} counted · ${events.length - countedEventCount} listed as duplicates`}
								pinFooter
								footer={
									<StatRows
										top={
											<AnimatedBar
												label="Counted versus duplicate events"
												segments={[
													{
														pct: events.length
															? (countedEventCount / events.length) * 100
															: 0,
														className: "bg-[#078FAB]",
													},
												]}
											/>
										}
										rows={[
											["Flags", String(kindCounts.flag)],
											["Gaps", String(kindCounts.gap)],
											["Renewals", String(kindCounts.renewal)],
											[
												"Latest event",
												events.length
													? formatEventDate(
															events.reduce((a, b) => (a.date > b.date ? a : b))
																.date,
														)
													: "—",
											],
										]}
									/>
								}
							/>
						</motion.div>
					</motion.div>

					{/* What built the number */}
					<motion.div {...revealSolo(fadeUp)}>
						<Card className="glass-card">
							<div className="glass-card-cap" />
							<CardContent className="text-slate-700 p-4 sm:p-6">
								<div className="flex items-center justify-between gap-3">
									<p className="h5 sidebar-gradient-text">
										What built the number
									</p>
									<span className="caption text-slate-500">
										Select a row to filter the register
									</span>
								</div>
								<CaalmDataTable className="pb-0 pt-4">
									<TableHeader className="[&_tr]:border-b-0">
										<TableRow className={DATA_TABLE_HEADER_ROW}>
											<TableHead className={th("pl-4")}>Driver</TableHead>
											<TableHead className={th("text-right")}>Events</TableHead>
											<TableHead className={th()}>vs last Q</TableHead>
											<TableHead className={th("text-right")}>
												Counted $
											</TableHead>
											<TableHead className={th("pr-4")}>Share</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody className="[&_tr:last-child>td]:border-b-0">
										{(
											[
												[
													"flag",
													"Flags caught",
													snapshot.countTrends.complianceFlagsCaught,
												],
												[
													"gap",
													"Gaps closed",
													snapshot.countTrends.auditGapsClosed,
												],
												[
													"renewal",
													"Licenses renewed on time",
													snapshot.countTrends.licensesRenewedOnTime,
												],
											] as const
										).map(([kind, label, trend]) => {
											const row = byKind(kind);
											const s = share(row.dollars);
											return (
												<TableRow
													key={kind}
													tabIndex={0}
													className={DATA_TABLE_BODY_ROW_CLICKABLE}
													onClick={() => showRegister(kind)}
													onKeyDown={(e) => {
														if (e.key === "Enter") showRegister(kind);
													}}
												>
													<TableCell
														className={cn(
															DATA_TABLE_CELL,
															"pl-4 font-semibold text-[#0f5384]",
														)}
													>
														{label}
													</TableCell>
													<TableCell
														className={cn(
															DATA_TABLE_CELL,
															"text-right tabular-nums",
														)}
													>
														{row.events}
													</TableCell>
													<TableCell
														className={cn(DATA_TABLE_CELL, "text-slate-600")}
													>
														{trend.direction === "flat"
															? "— No change"
															: `${trend.direction === "down" ? "↓" : "↑"} vs ${trend.prior ?? 0} last Q`}
													</TableCell>
													<TableCell
														className={cn(
															DATA_TABLE_CELL,
															"text-right tabular-nums",
														)}
													>
														<span className="font-semibold">
															{formatRiskUsdExact(row.dollars)}
														</span>
														{row.allDuplicate ? (
															<span className="text-slate-500">
																{" "}
																(duplicate)
															</span>
														) : null}
													</TableCell>
													<TableCell className={cn(DATA_TABLE_CELL, "pr-4")}>
														<div className="flex items-center gap-3">
															<AnimatedBar
																className="h-1.5 w-32"
																segments={[
																	{ pct: s, className: "bg-[#078FAB]" },
																]}
															/>
															<span className="w-12 text-xs tabular-nums text-slate-600">
																{pct(s)}
															</span>
														</div>
													</TableCell>
												</TableRow>
											);
										})}
										<TableRow className={DATA_TABLE_BODY_ROW_BASE}>
											<TableCell
												className={cn(DATA_TABLE_CELL, "pl-4 font-bold")}
											>
												Total
											</TableCell>
											<TableCell
												className={cn(
													DATA_TABLE_CELL,
													"text-right font-bold tabular-nums",
												)}
											>
												{events.length}
											</TableCell>
											<TableCell className={DATA_TABLE_CELL} />
											<TableCell
												className={cn(
													DATA_TABLE_CELL,
													"text-right font-bold tabular-nums",
												)}
											>
												{formatRiskUsdExact(countedDollars)}
											</TableCell>
											<TableCell
												className={cn(
													DATA_TABLE_CELL,
													"pr-4 text-xs text-[#078FAB]",
												)}
											>
												= headline figure
											</TableCell>
										</TableRow>
									</TableBody>
								</CaalmDataTable>
							</CardContent>
						</Card>
					</motion.div>

					{/* Event register */}
					<motion.div
						ref={registerRef}
						{...revealSolo(fadeUp)}
						className="scroll-mt-6"
					>
						<Card className="glass-card">
							<div className="glass-card-cap" />
							<CardContent className="text-slate-700 p-4 sm:p-6">
								<div>
									<p className="h5 mr-2 sidebar-gradient-text">
										Event register
									</p>
								</div>
								<div className="flex flex-wrap items-center gap-3 pt-4">
									<SearchField
										value={query}
										onChange={(event) => {
											setQuery(event.target.value);
											setPage(1);
										}}
										placeholder="Search record or source"
										containerClassName="flex-1 min-w-56 max-w-lg sm:ml-4"
									/>
									<SegmentedToggle
										value={kindFilter}
										onChange={(next) => {
											setKindFilter(next);
											setPage(1);
										}}
										ariaLabel="Event kind"
										className="ml-auto shrink-0"
										tabs={[
											{
												value: "all",
												label: "All",
												count: kindCounts.all,
												countClassName: "text-[#078FAB]",
											},
											{
												value: "flag",
												label: "Flags",
												count: kindCounts.flag,
												countClassName: "text-orange",
											},
											{
												value: "gap",
												label: "Gaps",
												count: kindCounts.gap,
												countClassName: "text-slate-600",
											},
											{
												value: "renewal",
												label: "Renewals",
												count: kindCounts.renewal,
												countClassName: "text-blue",
											},
										]}
									/>
									<Button
										type="button"
										className="btn-primary px-3 sm:px-4"
										disabled={exportingCsv}
										onClick={() => void exportCsv()}
									>
										{exportingCsv ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<Download className="h-4 w-4" />
										)}
										{exportingCsv ? "Preparing Excel…" : "Export Excel"}
									</Button>
								</div>

								{pageRows.length === 0 ? (
									<div className="pt-4">
										<CaalmDataTableEmpty
											title="No events match this filter"
											description="The dollar figure stays $0 until a flag, closed gap, or on-time renewal lands."
										/>
										{isFiltered ? (
											<div className="flex justify-center">
												<Button
													type="button"
													variant="outline"
													onClick={() => {
														setQuery("");
														setKindFilter("all");
														setPage(1);
													}}
												>
													Clear filters
												</Button>
											</div>
										) : null}
									</div>
								) : (
									<CaalmDataTable className="pb-0 pt-4">
										<TableHeader className="[&_tr]:border-b-0">
											<TableRow className={DATA_TABLE_HEADER_ROW}>
												<TableHead
													className={cn(
														DATA_TABLE_HEADER_CELL,
														"w-10 pl-4 pr-2",
													)}
												>
													<Checkbox
														checked={
															allPageChecked
																? true
																: somePageChecked
																	? "indeterminate"
																	: false
														}
														onCheckedChange={(c) =>
															setCheckedIds((prev) => {
																const next = new Set(prev);
																for (const e of pageRows) {
																	if (c === true) next.add(e.id);
																	else next.delete(e.id);
																}
																return next;
															})
														}
														aria-label="Select all events on this page"
														className="cursor-pointer"
													/>
												</TableHead>
												<SortableDataTableHead
													label="Date"
													active={sortKey === "date"}
													onClick={() => toggleSort("date")}
												/>
												<TableHead className={th()}>Kind</TableHead>
												<TableHead className={th()}>Record</TableHead>
												<TableHead className={th()}>Source</TableHead>
												<SortableDataTableHead
													label="Dollars"
													active={sortKey === "dollars"}
													onClick={() => toggleSort("dollars")}
													className="text-right"
												/>
												<TableHead className={th("pr-4")}>Status</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody className="[&_tr:last-child>td]:border-b-0">
											{pageRows.map((event) => {
												const dollars = event.countedTowardTotal
													? event.dollars || 0
													: 0;
												return (
													<TableRow
														key={event.id}
														tabIndex={0}
														className={cn(
															DATA_TABLE_BODY_ROW_CLICKABLE,
															checkedIds.has(event.id) &&
																"bg-blue/10 hover:bg-blue/10 shadow-none [&>td:first-child]:relative [&>td:first-child]:before:absolute [&>td:first-child]:before:inset-y-0 [&>td:first-child]:before:left-0 [&>td:first-child]:before:w-0.5 [&>td:first-child]:before:bg-[#0f5384]",
														)}
														onClick={() => setSelected(event)}
														onKeyDown={(e) => {
															if (e.key === "Enter") setSelected(event);
														}}
													>
														<TableCell
															className={cn(DATA_TABLE_CELL, "w-10 pl-4 pr-2")}
															onClick={(e) => e.stopPropagation()}
														>
															<Checkbox
																checked={checkedIds.has(event.id)}
																onCheckedChange={(c) =>
																	setCheckedIds((prev) => {
																		const next = new Set(prev);
																		if (c === true) next.add(event.id);
																		else next.delete(event.id);
																		return next;
																	})
																}
																aria-label={`Select ${event.recordName}`}
																className="cursor-pointer"
															/>
														</TableCell>
														<TableCell
															className={cn(
																DATA_TABLE_CELL,
																"whitespace-nowrap tabular-nums text-slate-700",
															)}
														>
															{formatEventDate(event.date)}
														</TableCell>
														<TableCell className={DATA_TABLE_CELL}>
															<span
																className={`${PILL} ${KIND_BADGE[event.kind]}`}
															>
																{KIND_LABELS[event.kind]}
															</span>
														</TableCell>
														<TableCell
															className={DATA_TABLE_CELL}
															onClick={(e) => e.stopPropagation()}
														>
															{event.href ? (
																<Link
																	href={event.href}
																	className="text-[#0f5384]"
																>
																	{event.recordName}
																</Link>
															) : (
																<span className="text-slate-700">
																	{event.recordName}
																</span>
															)}
														</TableCell>
														<TableCell
															className={cn(DATA_TABLE_CELL, "text-slate-600")}
														>
															{event.source}
														</TableCell>
														<TableCell
															className={cn(
																DATA_TABLE_CELL,
																"text-right tabular-nums",
																dollars > 0
																	? "font-semibold text-slate-700"
																	: "text-slate-400",
															)}
														>
															{formatRiskUsdExact(dollars)}
														</TableCell>
														<TableCell className={cn(DATA_TABLE_CELL, "pr-4")}>
															<span
																className={`${PILL} ${event.countedTowardTotal ? "bg-green/10 text-green border-green/20" : NEUTRAL_PILL}`}
															>
																{event.countedTowardTotal
																	? "Counted"
																	: "Duplicate · not counted"}
															</span>
														</TableCell>
													</TableRow>
												);
											})}
										</TableBody>
									</CaalmDataTable>
								)}

								<div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-sm text-slate-600">
									<span>
										Showing {filtered.length} of {events.length} events ·{" "}
										{filtered.filter((e) => e.countedTowardTotal).length}{" "}
										counted
									</span>
									<span className="font-semibold text-slate-700">
										{isFiltered ? (
											<>
												Filtered total {formatRiskUsdExact(filteredCounted)} ·
												Overall total {formatRiskUsdExact(countedDollars)}{" "}
												<span className="font-normal text-[#078FAB]">
													(matches headline)
												</span>
											</>
										) : (
											<>Counted total {formatRiskUsdExact(countedDollars)} </>
										)}
									</span>
								</div>
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
					</motion.div>

					<RiskEventsBulkBar
						count={checkedIds.size}
						anchorRef={registerRef}
						onExport={() =>
							void exportCsv(events.filter((e) => checkedIds.has(e.id)))
						}
						onClear={() => setCheckedIds(new Set())}
					/>

					<Sheet
						open={selected !== null}
						onOpenChange={(isOpen) => {
							if (!isOpen) setSelected(null);
						}}
					>
						<SheetContent side="right">
							{selected ? (
								<>
									<SheetHeader>
										<SheetTitle>{selected.recordName}</SheetTitle>
										<SheetDescription>
											{KIND_LABELS[selected.kind]} ·{" "}
											{formatEventDate(selected.date)}
										</SheetDescription>
									</SheetHeader>
									<dl className="mt-4 space-y-3 body-2">
										<div className="flex justify-between gap-4">
											<dt className="text-slate-500">Source</dt>
											<dd>{selected.source}</dd>
										</div>
										<div className="flex justify-between gap-4">
											<dt className="text-slate-500">Counted dollars</dt>
											<dd className="font-semibold tabular-nums">
												{formatRiskUsdExact(
													selected.countedTowardTotal ? selected.dollars : 0,
												)}
											</dd>
										</div>
										<div className="flex justify-between gap-4">
											<dt className="text-slate-500">Status</dt>
											<dd>
												{selected.countedTowardTotal
													? "Counted"
													: "Duplicate · not counted"}
											</dd>
										</div>
									</dl>
									{selected.href ? (
										<Link
											href={selected.href}
											className="mt-4 inline-block text-sm text-[#0f5384]"
										>
											Open record
										</Link>
									) : null}
								</>
							) : null}
						</SheetContent>
					</Sheet>
				</>
			) : null}
		</div>
	);
}
