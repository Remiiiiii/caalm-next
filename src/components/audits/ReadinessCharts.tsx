"use client";

import { type ReactNode, useMemo } from "react";
import {
	CartesianGrid,
	Line,
	LineChart,
	ReferenceArea,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { AnimatedBar } from "@/components/ui/animated-bar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
	NEUTRAL_PILL,
	PILL,
	RAG_BG,
	RAG_LABEL,
	RAG_PILL,
	ragFor,
} from "./readiness/readiness-ui";
import type {
	Rag,
	RagThresholds,
	ReadinessDomain,
	ReadinessHistoryRow,
} from "./readiness/types";

const BAND_FILL = {
	red: "#FF7474",
	amber: "#F9AB72",
	green: "#3DD9B3",
} as const;

function ChartCard({
	title,
	subtitle,
	children,
}: {
	title: string;
	subtitle: string;
	children: ReactNode;
}) {
	return (
		<Card className="glass-card h-full">
			<div className="glass-card-cap" />
			<CardContent className="flex h-full flex-col gap-4 p-4 text-slate-700 sm:p-6">
				<div>
					<p className="h5 sidebar-gradient-text">{title}</p>
					<p className="caption text-slate-500">{subtitle}</p>
				</div>
				{children}
			</CardContent>
		</Card>
	);
}

export function ReadinessCharts({
	domains,
	sourcesUsed,
	severity,
	history,
	score,
	thresholds,
}: {
	domains: ReadinessDomain[];
	sourcesUsed: string[];
	severity: { critical: number; moderate: number; low: number };
	history: ReadinessHistoryRow[];
	score: number | null;
	thresholds: RagThresholds;
}) {
	const severityRows = [
		{ key: "Critical", value: severity.critical, bar: "bg-red" },
		{ key: "Moderate", value: severity.moderate, bar: "bg-orange" },
		{ key: "Low", value: severity.low, bar: "bg-slate-300" },
	];
	const severityTotal = severity.critical + severity.moderate + severity.low;

	const points = useMemo(
		() =>
			[...history]
				.filter((row) => row.score !== null)
				.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
				.map((row) => ({
					id: row.id,
					label: new Date(row.createdAt).toLocaleDateString("en-US", {
						month: "short",
						day: "numeric",
					}),
					score: row.score as number,
					rag: row.ragStatus ?? ragFor(row.score, thresholds),
				})),
		[history, thresholds],
	);

	return (
		<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<ChartCard title="Domain readiness" subtitle="Score by domain, 0–100">
				<div className="flex flex-col gap-4">
					{domains.map((domain) => {
						const scored = sourcesUsed.some((source) =>
							domain.label.toLowerCase().startsWith(source.toLowerCase()),
						);
						const rag: Rag =
							(domain.ragStatus as Rag) in RAG_BG
								? (domain.ragStatus as Rag)
								: "red";
						return (
							<div key={domain.label} className="flex flex-col gap-1.5">
								<div className="flex items-center justify-between text-sm">
									<span>{domain.label}</span>
									{scored ? (
										<b className="tabular-nums">{domain.readinessPercent}</b>
									) : (
										<span className={cn(PILL, NEUTRAL_PILL)}>Not scored</span>
									)}
								</div>
								<AnimatedBar
									className="h-3"
									label={
										scored
											? `${domain.label}: ${domain.readinessPercent} out of 100`
											: `${domain.label}: not scored`
									}
									segments={[
										{
											pct: scored ? domain.readinessPercent : 0,
											className:
												scored && rag !== "red" ? RAG_BG[rag] : "bg-[#0f5384]",
										},
									]}
								/>
							</div>
						);
					})}
					<div className="flex justify-between text-[11px] text-slate-600">
						{[0, 25, 50, 75, 100].map((tick) => (
							<span key={tick}>{tick}</span>
						))}
					</div>
				</div>
				<p className="caption mt-auto text-slate-600">
					{score === null
						? "Add contracts or licenses to generate an overall score."
						: `Contributes to the overall score of ${score}.`}
				</p>
			</ChartCard>

			<ChartCard title="Severity breakdown" subtitle="Open items by severity">
				<div className="flex flex-col gap-4">
					{severityRows.map((row) => (
						<div key={row.key} className="flex flex-col gap-1.5">
							<div className="flex items-center justify-between text-sm">
								<span className="inline-flex items-center gap-1.5">
									<span
										className={cn("h-2 w-2 rounded-full", row.bar)}
										aria-hidden
									/>
									{row.key}
								</span>
								<b className="tabular-nums">{row.value}</b>
							</div>
							<AnimatedBar
								className="h-3"
								label={`${row.key}: ${row.value}`}
								segments={[
									{
										pct: severityTotal ? (row.value / severityTotal) * 100 : 0,
										className: row.bar,
									},
								]}
							/>
						</div>
					))}
				</div>
				<p className="caption mt-auto text-slate-600">
					{severityTotal === 0
						? "No open items."
						: `${severityTotal} open item${severityTotal === 1 ? "" : "s"} in total.`}
				</p>
			</ChartCard>

			<ChartCard
				title="Score trend"
				subtitle="By snapshot date, with red / amber / green bands"
			>
				{points.length === 0 ? (
					<p className="text-sm text-slate-600">
						No snapshots yet. Run a weekly snapshot to start the trend.
					</p>
				) : (
					<div
						className="h-44 w-full"
						role="img"
						aria-label={`Score trend: ${points.length} snapshot${points.length === 1 ? "" : "s"}, latest ${points[points.length - 1]?.score}`}
					>
						<ResponsiveContainer width="100%" height="100%">
							<LineChart
								data={points}
								margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
							>
								<ReferenceArea
									y1={thresholds.green}
									y2={100}
									fill={BAND_FILL.green}
									fillOpacity={0.16}
								/>
								<ReferenceArea
									y1={thresholds.amber}
									y2={thresholds.green}
									fill={BAND_FILL.amber}
									fillOpacity={0.18}
								/>
								<ReferenceArea
									y1={0}
									y2={thresholds.amber}
									fill={BAND_FILL.red}
									fillOpacity={0.12}
								/>
								<CartesianGrid
									strokeDasharray="3 3"
									stroke="#e2e8f0"
									vertical={false}
								/>
								<XAxis
									dataKey="label"
									tick={{ fill: "#64748b", fontSize: 11 }}
									tickLine={false}
									axisLine={{ stroke: "#cbd5e1" }}
								/>
								<YAxis
									domain={[0, 100]}
									ticks={[0, 25, 50, 75, 100]}
									width={32}
									tick={{ fill: "#64748b", fontSize: 11 }}
									tickLine={false}
									axisLine={false}
								/>
								<Tooltip
									cursor={{ stroke: "#0f5384", strokeDasharray: "3 3" }}
									content={({ active, payload }) => {
										if (!active || !payload?.[0]) return null;
										const point = payload[0].payload as (typeof points)[number];
										return (
											<div className="rounded-md border border-slate-200 bg-white px-3 py-2 shadow-md">
												<p className="text-xs font-medium text-slate-700">
													{point.label}
												</p>
												<p className="mt-1 text-xs tabular-nums text-slate-600">
													<span className="font-semibold text-slate-700">
														{point.score}
													</span>{" "}
													{point.rag ? (
														<span className={cn(PILL, RAG_PILL[point.rag])}>
															{RAG_LABEL[point.rag]}
														</span>
													) : null}
												</p>
											</div>
										);
									}}
								/>
								<Line
									type="monotone"
									dataKey="score"
									stroke="#0f5384"
									strokeWidth={2}
									dot={{
										r: 5,
										fill: "#fff",
										stroke: "#0f5384",
										strokeWidth: 2,
									}}
									isAnimationActive={false}
								/>
							</LineChart>
						</ResponsiveContainer>
					</div>
				)}
				<p className="caption mt-auto text-slate-600">
					{points.length === 1
						? "1 snapshot so far. The trend line appears after a second snapshot."
						: points.length > 1
							? `${points.length} snapshots plotted.`
							: ""}
				</p>
			</ChartCard>
		</div>
	);
}
