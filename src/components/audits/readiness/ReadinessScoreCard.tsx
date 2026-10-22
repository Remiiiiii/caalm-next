"use client";

import { Gauge } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatCardIcon } from "@/components/ui/stat-card-icon";
import { cn } from "@/lib/utils";
import { GlossaryTerm } from "./GlossaryTerm";
import { ReadinessGauge } from "./ReadinessGauge";
import {
	formatReadinessPercent,
	isReadinessDomainScored,
	NEUTRAL_PILL,
	PILL,
	RAG_BG,
	RAG_LABEL,
	RAG_PILL,
} from "./readiness-ui";
import type { Rag, RagThresholds, ReadinessDomain } from "./types";

export function ReadinessScoreCard({
	score,
	rag,
	thresholds,
	domains,
	sourcesUsed,
	/** Score minus the previous snapshot's score; null when there is no earlier snapshot. */
	deltaVsLast,
	onExplain,
	onDomainClick,
}: {
	score: number | null;
	rag: Rag | null;
	thresholds: RagThresholds;
	domains: ReadinessDomain[];
	sourcesUsed: string[];
	deltaVsLast: number | null;
	onExplain: () => void;
	onDomainClick?: (domain: ReadinessDomain) => void;
}) {
	const compare =
		deltaVsLast === null
			? "First snapshot · nothing to compare yet"
			: deltaVsLast === 0
				? "— No change vs last snapshot"
				: `${deltaVsLast > 0 ? "▲" : "▼"} ${formatReadinessPercent(Math.abs(deltaVsLast))} vs last snapshot`;

	return (
		<Card className="glass-card relative h-full overflow-hidden">
			<div className="glass-card-cap" />
			<CardContent className="relative z-10 mt-4 flex h-full flex-col gap-3 px-4 pb-6 pt-6 text-slate-700">
				<div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
					<div className="flex items-center gap-2.5">
						<StatCardIcon icon={Gauge} />
						<p className="text-base font-semibold sidebar-gradient-text">
							Readiness score
						</p>
					</div>
					<button
						type="button"
						onClick={onExplain}
						className="cursor-pointer rounded-sm text-xs font-medium text-[#078FAB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB]"
					>
						How is this calculated? →
					</button>
				</div>

				<div className="flex flex-wrap items-center gap-5">
					<div className="flex justify-between border-b pb-6  border-slate-200 items-center gap-2">
						<ReadinessGauge score={score} rag={rag} thresholds={thresholds} />

						<div className="flex flex-wrap justify-between items-center gap-2">
							{rag ? (
								<span
									className={cn(
										PILL,
										"inline-flex items-center gap-1.5 font-bold uppercase",
										RAG_PILL[rag],
									)}
								>
									<span
										className={cn("h-1.5 w-1.5 rounded-full", RAG_BG[rag])}
										aria-hidden
									/>
									<GlossaryTerm term="RAG">{RAG_LABEL[rag]}</GlossaryTerm>
								</span>
							) : (
								<span
									className={cn(
										PILL,
										"bg-slate-100 text-slate-600 border-slate-200",
									)}
								>
									Not scored yet
								</span>
							)}
							<span className="caption text-slate-600">{compare}</span>
							<div className="flex min-w-0 flex-1 basis-56 flex-col gap-2">
								{domains.map((domain) => {
									const scored = isReadinessDomainScored(domain, sourcesUsed);
									const domainRag =
										scored && (domain.ragStatus as Rag) in RAG_BG
											? (domain.ragStatus as Rag)
											: null;
									return (
										<button
											type="button"
											key={domain.label}
											onClick={() => onDomainClick?.(domain)}
											className="flex cursor-pointer items-center justify-between gap-3 border-t border-slate-200 py-2 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB]"
										>
											<span className="inline-flex items-center gap-1.5 text-slate-600">
												<span
													className={cn(
														"h-1.5 w-1.5 rounded-full",
														domainRag ? RAG_BG[domainRag] : "bg-slate-300",
													)}
													aria-hidden
												/>
												{domain.label}
											</span>
											{scored ? (
												<span className="font-semibold tabular-nums text-slate-700">
													{formatReadinessPercent(domain.readinessPercent)}
												</span>
											) : (
												<span className={cn(PILL, NEUTRAL_PILL)}>
													Not scored
												</span>
											)}
										</button>
									);
								})}
							</div>
						</div>
					</div>
				</div>

				<p className="caption mt-auto text-slate-600">
					Sources: {sourcesUsed.length ? sourcesUsed.join(", ") : "None yet"} ·
					Bands: red below {formatReadinessPercent(thresholds.amber)}, amber{" "}
					{formatReadinessPercent(thresholds.amber)}–
					{formatReadinessPercent(thresholds.green - 1)}, green{" "}
					{formatReadinessPercent(thresholds.green)}+
				</p>
			</CardContent>
		</Card>
	);
}
