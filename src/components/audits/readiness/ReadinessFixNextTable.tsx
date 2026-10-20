"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	CaalmDataTable,
	CaalmDataTableEmpty,
	DATA_TABLE_BODY_ROW_BASE,
	DATA_TABLE_CELL,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
} from "@/components/ui/caalm-data-table";
import { Card, CardContent } from "@/components/ui/card";
import { PageIndex } from "@/components/ui/page-index";
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
	formatDay,
	NEUTRAL_PILL,
	PILL,
	RAG_PILL,
	REQUIREMENT_LABELS,
	SEVERITY_LABEL,
	SEVERITY_PILL,
} from "./readiness-ui";
import type { ReadinessInsight } from "./types";

const PAGE_SIZE = 12;
const SEVERITY_ORDER: Record<string, number> = {
	critical: 0,
	moderate: 1,
	low: 2,
};
const KIND_LABEL: Record<string, string> = {
	contract: "Contract",
	license: "License",
	other: "Item",
};

function sortInsights(rows: ReadinessInsight[]): ReadinessInsight[] {
	return [...rows].sort((a, b) => {
		const bySeverity =
			(SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3);
		if (bySeverity !== 0) return bySeverity;
		const aDue = a.dueDate ? Date.parse(a.dueDate) : Number.POSITIVE_INFINITY;
		const bDue = b.dueDate ? Date.parse(b.dueDate) : Number.POSITIVE_INFINITY;
		return (
			(Number.isNaN(aDue) ? Infinity : aDue) -
			(Number.isNaN(bDue) ? Infinity : bDue)
		);
	});
}

export function ReadinessFixNextTable({
	insights,
}: {
	insights: ReadinessInsight[];
}) {
	const [page, setPage] = useState(1);
	const rows = useMemo(() => sortInsights(insights), [insights]);
	const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	return (
		<Card className="glass-card h-full">
			<div className="glass-card-cap" />
			<CardContent className="p-4 text-slate-700 sm:p-6">
				<div className="flex flex-wrap items-baseline justify-between gap-2">
					<div>
						<p className="h5">Fix next</p>
						<p className="caption text-slate-500">
							Ranked by severity, then due date
						</p>
					</div>
					<Link
						href="/contracts"
						className="rounded-sm text-sm font-medium text-[#078FAB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB]"
					>
						View all in Contracts →
					</Link>
				</div>

				{rows.length === 0 ? (
					<CaalmDataTableEmpty
						title="Nothing to fix right now"
						description="New items appear here when a contract or license needs attention."
					/>
				) : (
					<CaalmDataTable className="pb-0 pt-4">
						<TableHeader className="[&_tr]:border-b-0">
							<TableRow className={DATA_TABLE_HEADER_ROW}>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3 pl-4")}>
									Severity
								</TableHead>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
									Item
								</TableHead>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
									Requirements
								</TableHead>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
									Due
								</TableHead>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
									Owner
								</TableHead>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3 pr-4")}>
									<span className="sr-only">Open</span>
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody className="[&_tr:last-child>td]:border-b-0">
							{pageRows.map((row) => (
								<TableRow key={row.id} className={DATA_TABLE_BODY_ROW_BASE}>
									<TableCell className={cn(DATA_TABLE_CELL, "pl-4")}>
										<span
											className={cn(
												PILL,
												"whitespace-nowrap",
												row.isEvidenceGap
													? RAG_PILL.amber
													: (SEVERITY_PILL[row.severity] ?? NEUTRAL_PILL),
											)}
										>
											{row.isEvidenceGap
												? "Evidence gap"
												: (SEVERITY_LABEL[row.severity] ?? row.severity)}
										</span>
									</TableCell>
									<TableCell className={cn(DATA_TABLE_CELL, "max-w-[22rem]")}>
										<div className="flex flex-col">
											<Link
												href={row.moduleLink}
												className="font-semibold text-[#0f5384] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB]"
											>
												{row.itemTitle ?? row.title}
											</Link>
											<span className="caption text-slate-500">
												{[
													KIND_LABEL[row.itemKind ?? ""] ?? row.moduleLabel,
													row.category,
													row.owner,
												]
													.filter(Boolean)
													.join(" · ")}
											</span>
										</div>
									</TableCell>
									<TableCell className={DATA_TABLE_CELL}>
										<div className="flex flex-wrap gap-1">
											{(row.requirementTags ?? []).map((tag) => {
												const label = REQUIREMENT_LABELS[tag] ?? tag;
												return (
													<span
														key={tag}
														className="rounded-md border border-slate-200 bg-slate-50 px-2 py-px text-xs text-slate-600"
													>
														<GlossaryTerm term={label}>{label}</GlossaryTerm>
													</span>
												);
											})}
										</div>
									</TableCell>
									<TableCell
										className={cn(DATA_TABLE_CELL, "whitespace-nowrap")}
									>
										{formatDay(row.dueDate)}
									</TableCell>
									<TableCell className={cn(DATA_TABLE_CELL, "text-slate-500")}>
										Unassigned
									</TableCell>
									<TableCell className={cn(DATA_TABLE_CELL, "pr-4")}>
										<Button
											asChild
											variant="outline"
											size="sm"
											className="cursor-pointer"
										>
											<Link href={row.moduleLink}>
												Open
												<ExternalLink className="h-3 w-3" aria-hidden />
											</Link>
										</Button>
									</TableCell>
								</TableRow>
							))}
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
					itemLabel="items"
					className="mt-4"
				/>
			</CardContent>
		</Card>
	);
}
