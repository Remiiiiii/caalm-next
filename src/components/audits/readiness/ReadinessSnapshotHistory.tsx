"use client";

import { Loader2, Play } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	CaalmDataTable,
	CaalmDataTableEmpty,
	DATA_TABLE_BODY_ROW_CLICKABLE,
	DATA_TABLE_CELL,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
	SortableDataTableHead,
} from "@/components/ui/caalm-data-table";
import { Card, CardContent } from "@/components/ui/card";
import { PageIndex } from "@/components/ui/page-index";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatInTimezone } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import {
	formatReadinessPercent,
	PILL,
	RAG_LABEL,
	RAG_PILL,
} from "./readiness-ui";
import type { ReadinessHistoryRow } from "./types";

const PAGE_SIZE = 12;
type CadenceFilter = "all" | "weekly" | "monthly" | "quarterly";

const SOURCE_LABEL = { manual: "Manual", scheduled: "Scheduled" } as const;

function changeLabel(row: ReadinessHistoryRow): string {
	if (row.scoreDelta === null) return "— First snapshot";
	if (row.scoreDelta === 0) return "— No change";
	return `${row.scoreDelta > 0 ? "▲" : "▼"} ${formatReadinessPercent(Math.abs(row.scoreDelta))}`;
}

export function ReadinessSnapshotHistory({
	rows,
	running = false,
	onRun,
	timeZone,
	nextRunLabel,
	canExport,
	downloadingId,
	highlightId,
	onDownload,
}: {
	rows: ReadinessHistoryRow[];
	/** Saving a snapshot is in progress. */
	running?: boolean;
	/** Opens the "save a snapshot?" confirmation. */
	onRun?: () => void;
	timeZone: string;
	/** Formatted next scheduled run, e.g. "Mon, Oct 26, 2026". */
	nextRunLabel?: string | null;
	canExport: boolean;
	downloadingId: string | null;
	highlightId: string | null;
	onDownload: (snapshotId: string) => void;
}) {
	const [cadence, setCadence] = useState<CadenceFilter>("all");
	const [newestFirst, setNewestFirst] = useState(true);
	const [page, setPage] = useState(1);
	const [selected, setSelected] = useState<ReadinessHistoryRow | null>(null);

	const filtered = useMemo(() => {
		const dir = newestFirst ? -1 : 1;
		return rows
			.filter((row) => cadence === "all" || row.cadence === cadence)
			.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1) * dir);
	}, [rows, cadence, newestFirst]);
	const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
	const when = (iso: string) =>
		formatInTimezone(new Date(iso), "MMM d, yyyy · h:mm a", timeZone);

	const pdfControl = (row: ReadinessHistoryRow) =>
		canExport ? (
			<button
				type="button"
				onClick={(event) => {
					event.stopPropagation();
					onDownload(row.id);
				}}
				disabled={downloadingId === row.id}
				className="inline-flex cursor-pointer items-center gap-1 rounded-sm text-sm font-medium text-[#078FAB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB]"
			>
				{downloadingId === row.id ? (
					<Loader2 className="h-3 w-3 animate-spin" aria-hidden />
				) : null}
				PDF
			</button>
		) : null;

	return (
		<Card className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="p-4 text-slate-700 sm:p-6">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<p className="h5 sidebar-gradient-text">Snapshot history</p>
						<p className="caption text-slate-500">
							Point-in-time scores. Scheduled runs use the org timezone (
							{timeZone}){nextRunLabel ? ` · Next run ${nextRunLabel}` : ""}
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<SegmentedToggle
							value={cadence}
							onChange={(next) => {
								setCadence(next);
								setPage(1);
							}}
							ariaLabel="Cadence filter"
							tabs={[
								{ value: "all", label: "All" },
								{ value: "weekly", label: "Weekly" },
								{ value: "monthly", label: "Monthly" },
								{ value: "quarterly", label: "Quarterly" },
							]}
						/>
						{onRun ? (
							<Button
								type="button"
								className="btn-primary px-3 sm:px-4"
								onClick={onRun}
								disabled={running}
							>
								{running ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<Play className="h-4 w-4" />
								)}
								Run weekly snapshot
							</Button>
						) : null}
					</div>
				</div>

				{filtered.length === 0 ? (
					<CaalmDataTableEmpty
						title="No snapshots yet"
						description="Run a weekly snapshot to save the first point-in-time score."
					/>
				) : (
					<CaalmDataTable className="pb-0 pt-4">
						<TableHeader className="[&_tr]:border-b-0">
							<TableRow className={DATA_TABLE_HEADER_ROW}>
								<SortableDataTableHead
									label="When"
									active
									onClick={() => setNewestFirst((value) => !value)}
									className="pl-4"
								/>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
									Cadence
								</TableHead>
								<TableHead
									className={cn(DATA_TABLE_HEADER_CELL, "px-3 text-right")}
								>
									Score
								</TableHead>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
									Change
								</TableHead>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
									Status
								</TableHead>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
									Source
								</TableHead>
								<TableHead
									className={cn(DATA_TABLE_HEADER_CELL, "px-3 pr-4 text-right")}
								>
									Packet
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody className="[&_tr:last-child>td]:border-b-0">
							{pageRows.map((row) => (
								<TableRow
									key={row.id}
									tabIndex={0}
									className={cn(
										DATA_TABLE_BODY_ROW_CLICKABLE,
										highlightId === row.id && "bg-blue/10",
									)}
									onClick={() => setSelected(row)}
									onKeyDown={(event) => {
										if (event.key === "Enter") setSelected(row);
									}}
								>
									<TableCell
										className={cn(DATA_TABLE_CELL, "whitespace-nowrap pl-4")}
									>
										{when(row.createdAt)}
									</TableCell>
									<TableCell className={cn(DATA_TABLE_CELL, "capitalize")}>
										{row.cadence}
									</TableCell>
									<TableCell
										className={cn(
											DATA_TABLE_CELL,
											"text-right font-semibold tabular-nums",
										)}
									>
										{formatReadinessPercent(row.score)}
									</TableCell>
									<TableCell className={cn(DATA_TABLE_CELL, "text-slate-600")}>
										{changeLabel(row)}
									</TableCell>
									<TableCell className={DATA_TABLE_CELL}>
										{row.ragStatus ? (
											<span className={cn(PILL, RAG_PILL[row.ragStatus])}>
												{RAG_LABEL[row.ragStatus]}
											</span>
										) : (
											"—"
										)}
									</TableCell>
									<TableCell className={cn(DATA_TABLE_CELL, "text-slate-600")}>
										{row.source ? SOURCE_LABEL[row.source] : "—"}
									</TableCell>
									<TableCell
										className={cn(DATA_TABLE_CELL, "pr-4 text-right")}
										onClick={(event) => event.stopPropagation()}
									>
										<span className="inline-flex items-center gap-2">
											<Link
												href={`/audits/readiness/preview?snapshotId=${row.id}`}
												className="rounded-sm text-sm font-medium text-[#078FAB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB]"
											>
												Preview
											</Link>
											{pdfControl(row)}
										</span>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</CaalmDataTable>
				)}

				<PageIndex
					page={page}
					totalItems={filtered.length}
					pageSize={PAGE_SIZE}
					onPageChange={setPage}
					hideWhenSinglePage
					showRange
					itemLabel="snapshots"
					className="mt-4"
				/>

				<Sheet
					open={selected !== null}
					onOpenChange={(open) => {
						if (!open) setSelected(null);
					}}
				>
					<SheetContent side="right">
						{selected ? (
							<>
								<SheetHeader>
									<SheetTitle>Snapshot · {when(selected.createdAt)}</SheetTitle>
									<SheetDescription className="capitalize">
										{selected.cadence} ·{" "}
										{selected.source
											? SOURCE_LABEL[selected.source]
											: "Source unknown"}
									</SheetDescription>
								</SheetHeader>
								<dl className="body-2 mt-4 space-y-3">
									<div className="flex justify-between gap-4">
										<dt className="text-slate-500">Score</dt>
										<dd className="font-semibold tabular-nums">
											{formatReadinessPercent(selected.score)}
										</dd>
									</div>
									<div className="flex justify-between gap-4">
										<dt className="text-slate-500">Status</dt>
										<dd>
											{selected.ragStatus ? (
												<span
													className={cn(PILL, RAG_PILL[selected.ragStatus])}
												>
													{RAG_LABEL[selected.ragStatus]}
												</span>
											) : (
												"—"
											)}
										</dd>
									</div>
									<div className="flex justify-between gap-4">
										<dt className="text-slate-500">Change vs previous</dt>
										<dd>{changeLabel(selected)}</dd>
									</div>
								</dl>
								<div className="mt-4 flex items-center gap-4 text-sm">
									<Link
										href={`/audits/readiness/preview?snapshotId=${selected.id}`}
										className="font-medium text-[#078FAB]"
									>
										Packet preview
									</Link>
									{pdfControl(selected)}
								</div>
							</>
						) : null}
					</SheetContent>
				</Sheet>
			</CardContent>
		</Card>
	);
}
