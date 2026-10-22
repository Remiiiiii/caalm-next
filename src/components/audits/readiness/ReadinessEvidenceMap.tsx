"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AnimatedBar } from "@/components/ui/animated-bar";
import {
	CaalmDataTable,
	CaalmDataTableEmpty,
	DATA_TABLE_BODY_ROW_CLICKABLE,
	DATA_TABLE_CELL,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
} from "@/components/ui/caalm-data-table";
import { Card, CardContent } from "@/components/ui/card";
import { PageIndex } from "@/components/ui/page-index";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { GlossaryTerm } from "./GlossaryTerm";
import {
	MODULE_LABELS,
	PILL,
	RAG_PILL,
	REQUIREMENT_LABELS,
} from "./readiness-ui";
import type { ReadinessEvidenceHit } from "./types";

const PAGE_SIZE = 12;
type SegmentFilter = "all" | "hrsa_osv" | "cw_monitoring" | "financial_pbc";

const MODULE_ROUTE: Record<string, string> = {
	contracts: "/contracts",
	licenses: "/licenses",
	site: "/settings/organization",
};

function coveringRecord(row: ReadinessEvidenceHit) {
	const records = row.matchedRecords ?? [];
	return records.find((record) => record.status === "compliant") ?? records[0];
}

function coveringCaption(row: ReadinessEvidenceHit): string | null {
	if (row.caalmModule === "site") return null;
	const covering = coveringRecord(row);
	if (covering) return covering.title;
	if (!row.matchedRecords) return null;
	if (row.caalmModule === "licenses") return "No matching license";
	if (row.caalmModule === "contracts") return "No matching contract";
	return null;
}

function hitHref(row: ReadinessEvidenceHit): string | undefined {
	return coveringRecord(row)?.href ?? MODULE_ROUTE[row.caalmModule];
}

export function ReadinessEvidenceMap({
	hits,
	scrollToRequirementId,
	onScrolled,
}: {
	hits: ReadinessEvidenceHit[];
	/** Set to scroll to and briefly highlight that row (e.g. from the Public site card). */
	scrollToRequirementId?: string | null;
	onScrolled?: () => void;
}) {
	const router = useRouter();
	const [segment, setSegment] = useState<SegmentFilter>("all");
	const [page, setPage] = useState(1);
	const [highlightId, setHighlightId] = useState<string | null>(null);

	const rows = useMemo(
		() => hits.filter((hit) => segment === "all" || hit.auditType === segment),
		[hits, segment],
	);
	const covered = rows.filter((row) => row.status !== "gap").length;
	const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	useEffect(() => {
		if (!scrollToRequirementId) return;
		setSegment("all");
		setPage(1);
		setHighlightId(scrollToRequirementId);
		const raf = requestAnimationFrame(() => {
			document
				.getElementById(`evidence-row-${scrollToRequirementId}`)
				?.scrollIntoView({ behavior: "smooth", block: "center" });
		});
		const timeout = setTimeout(() => {
			setHighlightId(null);
			onScrolled?.();
		}, 2500);
		return () => {
			cancelAnimationFrame(raf);
			clearTimeout(timeout);
		};
	}, [scrollToRequirementId]);

	return (
		<Card className="glass-card h-full">
			<div className="glass-card-cap" />
			<CardContent className="p-4 text-slate-700 sm:p-6">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<p className="h5 sidebar-gradient-text">
							Evidence map (<GlossaryTerm term="CFCE">CFCE</GlossaryTerm>{" "}
							segment)
						</p>
						<p className="caption text-slate-500">
							Covered or Gap is based on the matching contract or license for
							each requirement, not the whole module
						</p>
					</div>
					<SegmentedToggle
						value={segment}
						onChange={(next) => {
							setSegment(next);
							setPage(1);
						}}
						ariaLabel="Filter by segment"
						tabs={[
							{ value: "all", label: "All" },
							{ value: "hrsa_osv", label: "HRSA OSV" },
							{ value: "cw_monitoring", label: "CW monitoring" },
							{ value: "financial_pbc", label: "Financial PBC" },
						]}
					/>
				</div>

				<div className="my-4 flex items-center gap-3">
					<span className="whitespace-nowrap text-sm font-semibold">
						{covered} of {rows.length} covered
					</span>
					<AnimatedBar
						className="flex-1"
						label={`${covered} of ${rows.length} requirements covered`}
						segments={[
							{
								pct: rows.length ? (covered / rows.length) * 100 : 0,
								className: "bg-[#078FAB]",
							},
						]}
					/>
				</div>

				{rows.length === 0 ? (
					<CaalmDataTableEmpty
						title="No requirements in this segment"
						description="Pick another segment to see its requirements."
					/>
				) : (
					<CaalmDataTable className="pb-0">
						<TableHeader className="[&_tr]:border-b-0">
							<TableRow className={DATA_TABLE_HEADER_ROW}>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3 pl-4")}>
									Requirement
								</TableHead>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
									Description
								</TableHead>
								<TableHead
									className={cn(
										DATA_TABLE_HEADER_CELL,
										"whitespace-nowrap px-3",
									)}
								>
									Segment
								</TableHead>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
									Module
								</TableHead>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3 pr-4")}>
									Status
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody className="[&_tr:last-child>td]:border-b-0">
							{pageRows.map((row) => {
								const route = hitHref(row);
								const isGap = row.status === "gap";
								const matchLabel = coveringCaption(row);
								return (
									<TableRow
										key={row.requirementId}
										id={`evidence-row-${row.requirementId}`}
										tabIndex={0}
										className={cn(
											DATA_TABLE_BODY_ROW_CLICKABLE,
											highlightId === row.requirementId && "bg-blue/10",
										)}
										onClick={() => route && router.push(route)}
										onKeyDown={(event) => {
											if (event.key === "Enter" && route) router.push(route);
										}}
									>
										<TableCell
											className={cn(
												DATA_TABLE_CELL,
												"whitespace-nowrap pl-4 font-semibold text-[#0f5384]",
											)}
										>
											{row.requirementId}
										</TableCell>
										<TableCell className={DATA_TABLE_CELL}>
											<div>
												<p>{row.label}</p>
												{matchLabel ? (
													<p className="mt-0.5 text-xs text-slate-500">
														{matchLabel}
													</p>
												) : null}
											</div>
										</TableCell>
										<TableCell
											className={cn(DATA_TABLE_CELL, "whitespace-nowrap")}
										>
											<span className="whitespace-nowrap rounded-md border border-slate-200 bg-slate-50 px-2 py-px text-xs text-slate-600">
												{REQUIREMENT_LABELS[row.auditType] ?? row.auditType}
											</span>
										</TableCell>
										<TableCell className={DATA_TABLE_CELL}>
											{MODULE_LABELS[row.caalmModule] ?? row.caalmModule}
										</TableCell>
										<TableCell className={cn(DATA_TABLE_CELL, "pr-4")}>
											<span
												className={cn(
													PILL,
													isGap ? RAG_PILL.amber : RAG_PILL.green,
												)}
											>
												{isGap ? "Gap" : "Covered"}
											</span>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</CaalmDataTable>
				)}

				<PageIndex
					page={page}
					totalItems={rows.length}
					pageSize={PAGE_SIZE}
					onPageChange={setPage}
					hideWhenSinglePage
					showRange
					itemLabel="requirements"
					className="mt-4"
				/>
			</CardContent>
		</Card>
	);
}
