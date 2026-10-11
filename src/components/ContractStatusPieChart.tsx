"use client";

import {
	AlertTriangle,
	Check,
	FileText,
	SquareArrowOutUpRight,
} from "lucide-react";
import Link from "next/link";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SciChartPieSurface } from "scichart";
import useSWR from "swr";
import { LiveWeatherStatusDot } from "@/components/dashboard-briefing/LiveWeatherStatusDot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCardIcon } from "@/components/ui/stat-card-icon";
import {
	type ContractStatusPieBucket,
	type ContractStatusPieSegment,
	classifyContractStatusPieBucket,
	computeContractStatusPie,
	daysUntilContractExpiry,
} from "@/lib/dashboard/contract-status-pie";
import { swrConfig, swrKeys } from "@/lib/swr-config";
import { cn } from "@/lib/utils";
import type { UIFileDoc } from "@/types/files";

interface ContractStatusPieChartProps {
	data?: ContractStatusPieSegment[];
	/** When provided, skips the duplicate /api/contracts/all fetch */
	contracts?: UIFileDoc[];
}

const EMPTY_SEGMENTS: ContractStatusPieSegment[] = [
	{ status: "active", count: 0, percentage: 0, color: "#10B981" },
	{ status: "expiring", count: 0, percentage: 0, color: "#F59E0B" },
	{ status: "expired", count: 0, percentage: 0, color: "#6B7280" },
];

const LIST_VISIBLE = 2;
/** Sized so SciChart gaps, gradients, and % labels read like the donut demo. */
const DONUT_SIZE_PX = 70;

/** Soft radial-style fills (light → base), matching SciChart donut demo sheen. */
const SEGMENT_GRADIENTS: Record<string, [string, string]> = {
	active: ["#6EE7B7", "#059669"],
	expiring: ["#FCD34D", "#D97706"],
	expired: ["#CBD5E1", "#64748B"],
	empty: ["#F1F5F9", "#E2E8F0"],
};

const TAB_META: Array<{
	status: ContractStatusPieBucket;
	label: string;
	dotClass: string;
	underlineClass: string;
}> = [
	{
		status: "active",
		label: "Active",
		dotClass: "bg-green",
		underlineClass: "bg-green",
	},
	{
		status: "expiring",
		label: "Expiring",
		dotClass: "bg-orange",
		underlineClass: "bg-orange",
	},
	{
		status: "expired",
		label: "Expired",
		dotClass: "bg-slate-500",
		underlineClass: "bg-slate-500",
	},
];

function contractLabel(contract: UIFileDoc): string {
	return contract.contractName || contract.name || "Untitled contract";
}

function endsInLabel(contract: UIFileDoc): string {
	const days = daysUntilContractExpiry(contract.contractExpiryDate);
	if (days === null) return "No expiry date";
	if (days < 0) {
		const ago = Math.abs(days);
		return ago === 1 ? "ended 1 day ago" : `ended ${ago} days ago`;
	}
	if (days === 0) return "ends today";
	return days === 1 ? "ends in 1 day" : `ends in ${days} days`;
}

type HoverablePieSegment = {
	id: string;
	text: string;
	showLabel: boolean;
};

/** Gradient fills wrap the path in a <g>; transform that node for the 3D pop. */
function donutSliceTransformTarget(path: Element): HTMLElement | SVGElement {
	const parent = path.parentElement;
	if (parent?.tagName.toLowerCase() === "g") return parent;
	return path as SVGElement;
}

function setDonutSlice3dPop(path: Element | null, active: boolean) {
	if (!path) return;
	const target = donutSliceTransformTarget(path);
	const style = target.style;
	style.transition = "transform 200ms cubic-bezier(0.22, 1, 0.36, 1)";
	// Scale from the slice’s own center so it comes toward you (not side-shift)
	style.transformBox = "fill-box";
	style.transformOrigin = "center";
	style.filter = "none";
	if (active) {
		style.transform = "translateZ(28px) scale(1.12)";
		style.zIndex = "2";
	} else {
		style.transform = "translateZ(0) scale(1)";
		style.zIndex = "";
	}
}

/** SciChart donut: plain at rest; hover lifts a slice in 3D and shows its %. */
function ContractStatusDonut({
	segments,
}: {
	segments: ContractStatusPieSegment[];
}) {
	const hostRef = useRef<HTMLDivElement>(null);
	const surfaceRef = useRef<SciChartPieSurface | null>(null);

	useEffect(() => {
		let cancelled = false;
		const host = hostRef.current;
		if (!host) return;

		const segmentById = new Map<string, HoverablePieSegment>();
		let hoveredId: string | null = null;

		const pathBySegmentId = (id: string) =>
			host.querySelector(`[id="${CSS.escape(id)}"]`);

		const clearHover = (seg: HoverablePieSegment) => {
			seg.showLabel = false;
			setDonutSlice3dPop(pathBySegmentId(seg.id), false);
			if (hoveredId === seg.id) hoveredId = null;
		};

		const applyHover = (seg: HoverablePieSegment) => {
			for (const other of segmentById.values()) {
				if (other !== seg && other.showLabel) {
					clearHover(other);
				}
			}
			hoveredId = seg.id;
			seg.showLabel = true;
			// showLabel redraws SVG paths — re-apply 3D transform after paint
			requestAnimationFrame(() => {
				if (cancelled || hoveredId !== seg.id) return;
				setDonutSlice3dPop(pathBySegmentId(seg.id), true);
			});
		};

		const pathFromEvent = (target: EventTarget | null) => {
			if (!(target instanceof Element)) return null;
			return target.closest("path[id]");
		};

		const onPointerOver = (event: PointerEvent) => {
			const path = pathFromEvent(event.target);
			if (!path || !host.contains(path)) return;
			const seg = segmentById.get(path.id);
			if (!seg || seg.text === "empty") return;
			if (hoveredId === seg.id) {
				setDonutSlice3dPop(path, true);
				return;
			}
			applyHover(seg);
		};

		const onPointerOut = (event: PointerEvent) => {
			const path = pathFromEvent(event.target);
			if (!path) return;
			const related =
				event.relatedTarget instanceof Node ? event.relatedTarget : null;
			if (
				related &&
				host.contains(related) &&
				related instanceof Element &&
				related.closest("path[id]")
			) {
				return;
			}
			const seg = segmentById.get(path.id);
			if (!seg) return;
			clearHover(seg);
		};

		host.addEventListener("pointerover", onPointerOver);
		host.addEventListener("pointerout", onPointerOut);

		const draw = async () => {
			const {
				EPieType,
				EPieValueMode,
				ESizingMode,
				GradientParams,
				PieSegment,
				Point,
				SciChartJSLightTheme,
				SciChartPieSurface,
				Thickness,
			} = await import("scichart");

			if (cancelled || !hostRef.current) return;

			surfaceRef.current?.delete();
			surfaceRef.current = null;
			segmentById.clear();
			hoveredId = null;
			host.innerHTML = "";

			const theme = new SciChartJSLightTheme();
			theme.sciChartBackground = "Transparent";
			theme.loadingAnimationBackground = "Transparent";

			const surface = await SciChartPieSurface.create(host, {
				theme,
				pieType: EPieType.Donut,
				holeRadius: 0.58,
				holeRadiusSizingMode: ESizingMode.Relative,
				animate: true,
				animationFrames: 30,
				showLegend: false,
				// Small gaps between arcs; sharp (block) ends, not rounded
				seriesSpacing: 2,
				cornerRadius: 0,
				valueMode: EPieValueMode.Percentage,
				// Keep % labels inside the host so Card overflow does not clip them
				padding: new Thickness(6, 6, 6, 6),
				labelRadiusAdjustment: 0.92,
				widthAspect: 1,
				heightAspect: 1,
			});

			surface.labelStyle = {
				fontFamily: "Poppins, sans-serif",
				fontSize: 8,
				fontWeight: "600",
				color: "#0f172a",
			};
			// Whole percents ("33%") — shorter than "33.33 %", less likely to clip
			surface.labelProvider.precision = 0;

			if (cancelled) {
				surface.delete();
				return;
			}

			surfaceRef.current = surface;

			const positive = segments.filter((s) => s.count > 0);
			const isEmpty = positive.length === 0;
			const chartSegments = isEmpty
				? [{ status: "empty", count: 1, percentage: 100, color: "#E2E8F0" }]
				: positive;

			const pieSegments = chartSegments.map((seg) => {
				const [light, base] =
					SEGMENT_GRADIENTS[String(seg.status)] ?? SEGMENT_GRADIENTS.empty;

				return new PieSegment({
					value: seg.count,
					text: String(seg.status),
					color: base,
					// Keep SciChart click-select from side-shifting slices
					delta: 0,
					showLabel: false,
					colorLinearGradient: new GradientParams(
						new Point(0, 0),
						new Point(0, 1),
						[
							{ color: light, offset: 0 },
							{ color: base, offset: 1 },
						],
					),
					labelStyle: {
						fontFamily: "Poppins, sans-serif",
						fontSize: 8,
						fontWeight: "600",
						color: "#0f172a",
					},
				});
			});

			surface.pieSegments.add(...pieSegments);

			for (const ps of pieSegments) {
				if (ps.text !== "empty") {
					segmentById.set(ps.id, ps as HoverablePieSegment);
				}
			}

			// Perspective so translateZ reads as depth toward the viewer
			const svg = host.querySelector("svg");
			if (svg instanceof SVGElement) {
				svg.style.overflow = "visible";
				svg.style.transformStyle = "preserve-3d";
			}
		};

		void draw();

		return () => {
			cancelled = true;
			host.removeEventListener("pointerover", onPointerOver);
			host.removeEventListener("pointerout", onPointerOut);
			surfaceRef.current?.delete();
			surfaceRef.current = null;
			segmentById.clear();
			if (host) host.innerHTML = "";
		};
	}, [segments]);

	return (
		<div
			ref={hostRef}
			data-testid="contract-status-donut"
			className="shrink-0 cursor-pointer overflow-visible"
			style={{
				width: DONUT_SIZE_PX,
				height: DONUT_SIZE_PX,
				perspective: "480px",
				transformStyle: "preserve-3d",
			}}
			aria-hidden
		/>
	);
}

function ContractStatusCardHeader() {
	return (
		<div className="flex items-center justify-between gap-3">
			<div className="flex min-w-0 items-center gap-2.5">
				<StatCardIcon icon={FileText} />
				<CardTitle className="text-sm font-semibold sidebar-gradient-text">
					Contract status
				</CardTitle>
			</div>
			<Link
				href="/contracts"
				aria-label="Open contracts"
				className="rounded-md p-1 text-[#0f5384] transition-colors duration-200 hover:bg-blue/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
			>
				<SquareArrowOutUpRight className="h-4 w-4" aria-hidden />
			</Link>
		</div>
	);
}

const ContractStatusPieChart: React.FC<ContractStatusPieChartProps> = ({
	data: propData,
	contracts: propContracts,
}) => {
	const [selectedTab, setSelectedTab] =
		useState<ContractStatusPieBucket>("active");

	const skipFetch = propContracts != null || propData != null;
	const {
		data: fetchedContracts,
		isLoading,
		error: contractsError,
	} = useSWR<UIFileDoc[] | { data?: UIFileDoc[] }>(
		skipFetch ? null : swrKeys.allContracts(),
		swrConfig.fetcher ?? null,
		{
			...swrConfig,
			revalidateOnFocus: false,
		},
	);

	const contracts = useMemo(() => {
		if (propContracts != null) {
			return Array.isArray(propContracts) ? propContracts : [];
		}
		if (Array.isArray(fetchedContracts)) {
			return fetchedContracts;
		}
		if (
			fetchedContracts &&
			typeof fetchedContracts === "object" &&
			Array.isArray((fetchedContracts as { data?: UIFileDoc[] }).data)
		) {
			return (fetchedContracts as { data: UIFileDoc[] }).data;
		}
		return [];
	}, [propContracts, fetchedContracts]);

	const pieResult = useMemo(
		() => computeContractStatusPie(contracts),
		[contracts],
	);

	const contractData = useMemo(() => {
		if (propData) return propData;
		if (!skipFetch && isLoading) return EMPTY_SEGMENTS;
		return pieResult.segments;
	}, [pieResult.segments, propData, isLoading, skipFetch]);

	const listedContracts = useMemo(() => {
		return contracts
			.filter((c) => classifyContractStatusPieBucket(c) === selectedTab)
			.sort((a, b) => {
				const da = daysUntilContractExpiry(a.contractExpiryDate) ?? 99999;
				const db = daysUntilContractExpiry(b.contractExpiryDate) ?? 99999;
				return da - db;
			});
	}, [contracts, selectedTab]);

	const visibleList = listedContracts.slice(0, LIST_VISIBLE);
	const moreCount = Math.max(0, listedContracts.length - LIST_VISIBLE);

	const loading = isLoading;
	const error = contractsError;

	if (loading && !skipFetch) {
		return (
			<Card className="w-full h-[200px] sm:h-[250px] lg:h-[300px] glass-card overflow-hidden">
				<div className="glass-card-cap" />
				<CardHeader className="pb-3 pt-2 px-4">
					<ContractStatusCardHeader />
				</CardHeader>
				<CardContent className="px-4 pb-4 flex items-center justify-center">
					<div className="flex flex-col items-center gap-2 text-slate-500">
						<div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-[#0f5384]" />
						<span className="text-xs">Loading contracts...</span>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (error && contracts.length === 0 && !propData) {
		return (
			<Card className="w-full h-[200px] sm:h-[250px] lg:h-[300px] glass-card overflow-hidden">
				<div className="glass-card-cap" />
				<CardHeader className="pb-3 pt-2 px-4">
					<ContractStatusCardHeader />
				</CardHeader>
				<CardContent className="px-4 pb-4 flex items-center justify-center">
					<p className="text-sm text-slate-500">Unable to load contracts</p>
				</CardContent>
			</Card>
		);
	}

	const totalContracts =
		propData != null
			? contractData.reduce((sum, s) => sum + (s.count || 0), 0)
			: (contracts?.length ?? 0);
	const segmentCount = (status: ContractStatusPieBucket) =>
		contractData.find((item) => item.status === status)?.count ?? 0;
	const segmentPct = (status: ContractStatusPieBucket) =>
		contractData.find((item) => item.status === status)?.percentage ?? 0;

	const needAttention = segmentCount("expiring") + segmentCount("expired");
	const isHealthy = needAttention === 0;

	return (
		<Card className="w-full h-[200px] sm:h-[250px] lg:h-[300px] glass-card hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col">
			<div className="glass-card-cap" />
			<CardHeader className="pb-1 pt-2 px-4 flex-shrink-0">
				<ContractStatusCardHeader />
			</CardHeader>

			<CardContent className="px-4 pb-2 flex-1 flex flex-col min-h-0">
				{/* Above divider — total + status pill + SciChart donut */}
				<div className="flex items-center justify-between gap-3">
					<div className="flex min-w-0 items-center gap-3">
						<ContractStatusDonut segments={contractData} />
						<div className="min-w-0">
							<div className="text-3xl font-bold tabular-nums sidebar-gradient-text tracking-tight">
								{totalContracts}
							</div>
							<div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5">
								<span className="text-xs text-slate-500">total contracts</span>
								{isHealthy ? (
									<span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-green/20 bg-green/10 px-1.5 py-0.5 text-[10px] font-medium leading-none text-green">
										<Check className="h-2.5 w-2.5" aria-hidden />
										All contracts healthy
									</span>
								) : (
									<span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-orange/20 bg-orange/10 px-1.5 py-0.5 text-[11px] font-medium leading-none text-orange">
										<AlertTriangle className="h-2.5 w-2.5" aria-hidden />
										{needAttention} of {totalContracts} need attention
									</span>
								)}
							</div>
						</div>
					</div>
				</div>

				<div className="mt-1.5 h-px bg-slate-200" />

				{/* Below divider — status tabs + list + live footer */}
				<div className="mt-1 flex min-h-0 flex-1 flex-col">
					<div
						className="flex items-stretch"
						role="tablist"
						aria-label="Contract status"
					>
						{TAB_META.map((tab, index) => {
							const selected = selectedTab === tab.status;
							const count = segmentCount(tab.status);
							const pct = segmentPct(tab.status);
							return (
								<div key={tab.status} className="flex min-w-0 flex-1 items-stretch">
									{index > 0 ? (
										<div
											className="w-px shrink-0 self-stretch bg-slate-200"
											aria-hidden
										/>
									) : null}
									<button
										type="button"
										role="tab"
										aria-selected={selected}
										onClick={() => setSelectedTab(tab.status)}
										className={cn(
											"relative min-w-0 flex-1 cursor-pointer rounded-t-md px-1 pb-2 pt-1 text-center transition-colors duration-200",
											"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
											selected ? "bg-white/20" : "hover:bg-white/10",
										)}
									>
										<p className="text-md font-bold tabular-nums text-slate-700 sm:text-lg">
											{count}{" "}
											<span className="text-[10px] font-medium text-slate-500">
												({pct}%)
											</span>
										</p>
										<p className="mt-0.5 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 sm:text-xs">
											<span
												className={cn(
													"inline-block h-1.5 w-1.5 shrink-0 rounded-full",
													tab.dotClass,
												)}
												aria-hidden
											/>
											{tab.label}
										</p>
										<span
											className={cn(
												"absolute inset-x-2 bottom-0 h-0.5 rounded-full transition-opacity duration-200",
												tab.underlineClass,
												selected ? "opacity-100" : "opacity-0",
											)}
											aria-hidden
										/>
									</button>
								</div>
							);
						})}
					</div>

					<div className="mt-2 min-h-0 flex-1 overflow-hidden">
						{visibleList.length === 0 ? (
							<p className="py-3 text-center text-xs text-slate-500">
								No {selectedTab} contracts
							</p>
						) : (
							<ul
								className="space-y-1.5"
								aria-label={`${selectedTab} contracts`}
							>
								{visibleList.map((contract) => (
									<li
										key={contract.$id}
										className="flex items-baseline justify-between gap-3 text-xs"
									>
										<span className="min-w-0 truncate text-xs text-slate-700">
											{contractLabel(contract)}
										</span>
										<span className="shrink-0 tabular-nums text-xs text-slate-500">
											{endsInLabel(contract)}
										</span>
									</li>
								))}
							</ul>
						)}
						{moreCount > 0 ? (
							<p className="mt-1.5 text-xs text-slate-500">
								+ {moreCount} more
							</p>
						) : null}
					</div>

					<div className="mt-auto flex shrink-0 items-center justify-center pt-2">
						<div className="flex items-center gap-2">
							<LiveWeatherStatusDot />
							<span className="text-xs font-medium text-slate-600">
								Live contract data
							</span>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};

export default ContractStatusPieChart;
