"use client";

import { format } from "date-fns";
import {
	AlertTriangle,
	Loader2,
	RotateCcw,
	Upload,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	CaalmDataTable,
	CaalmDataTableSkeleton,
	DATA_TABLE_BODY_ROW_BASE,
	DATA_TABLE_BODY_ROW_CLICKABLE,
	DATA_TABLE_CELL,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
	SortableDataTableHead,
} from "@/components/ui/caalm-data-table";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type {
	AuditDocumentListItem,
	AuditUploadWorkflowState,
} from "@/lib/audit-upload/upload-list-summaries";
import { buildActionNeededCallout } from "@/lib/audit-upload/upload-list-summaries";
import { caalmToast } from "@/lib/ui/caalm-toast";
import { cn } from "@/lib/utils";

const BADGE_BASE =
	"inline-flex max-w-full items-center gap-1.5 px-2 py-0.5 text-xs rounded-full border whitespace-nowrap";

const TABLE_COL_SPAN = 7;

type SortKey = "document" | "status" | "findings" | "uploadedOn";
type SortDir = "asc" | "desc";

/** Lower = needs attention first when sorting status ascending. */
const WORKFLOW_SORT_RANK: Record<AuditUploadWorkflowState, number> = {
	failed: 0,
	needs_review: 1,
	in_progress: 2,
	processing: 3,
	complete: 4,
};

function formatUploadedOn(createdAt?: string): string {
	if (!createdAt) return "—";
	try {
		return format(new Date(createdAt), "MMM d, yyyy");
	} catch {
		return "—";
	}
}

function uploadedOnTime(createdAt?: string): number {
	if (!createdAt) return 0;
	const time = Date.parse(createdAt);
	return Number.isFinite(time) ? time : 0;
}

function workflowChip(summary: AuditDocumentListItem["summary"]) {
	switch (summary.workflow) {
		case "processing":
			return {
				label: "Processing…",
				className: "bg-slate-100 text-slate-600 border-slate-200",
				spin: true,
			};
		case "needs_review":
			return {
				label: `${summary.awaitingConfirmation} awaiting confirmation`,
				className: "bg-orange/10 text-orange border-orange/20",
				spin: false,
			};
		case "in_progress":
			return {
				label: `${summary.confirmedCount} of ${summary.findingCount} confirmed`,
				className: "bg-orange/10 text-orange border-orange/20",
				spin: false,
			};
		case "complete":
			return {
				label: "complete",
				className: "bg-slate-100 text-slate-600 border-slate-200",
				spin: false,
			};
		case "failed":
			return {
				label: "Processing failed",
				className: "bg-red/10 text-red border-red/20",
				spin: false,
			};
		default: {
			const _exhaustive: never = summary.workflow;
			return _exhaustive;
		}
	}
}

function SeverityCell({
	summary,
}: {
	summary: AuditDocumentListItem["summary"];
}) {
	if (summary.workflow === "processing") {
		return <span className="text-xs text-slate-400">—</span>;
	}

	const tiers = [
		{
			key: "high" as const,
			count: summary.severityHigh,
			pip: "bg-red/70 border-red/80",
		},
		{
			key: "med" as const,
			count: summary.severityMed,
			pip: "bg-orange/70 border-orange/80",
		},
		{
			key: "low" as const,
			count: summary.severityLow,
			pip: "bg-green/70 border-green/80",
		},
	];

	return (
		<div
			className="space-y-0.5"
			aria-label={`${summary.severityHigh} high, ${summary.severityMed} medium, ${summary.severityLow} low severity findings`}
		>
			{tiers.map((tier) => {
				const isHighRipple = tier.key === "high" && tier.count > 0;
				return (
					<div
						key={tier.key}
						className={cn(
							"flex items-center gap-1.5 text-xs",
							tier.count === 0 ? "text-slate-400" : "text-slate-600",
						)}
					>
						<span
							className="relative inline-flex h-2 w-2 shrink-0"
							aria-hidden
						>
							{isHighRipple ? (
								<>
									<span className="live-weather-sonar absolute inline-flex h-full w-full rounded-full bg-red/70" />
									<span className="live-weather-sonar live-weather-sonar-delay absolute inline-flex h-full w-full rounded-full bg-red/45" />
								</>
							) : null}
							<span
								className={cn(
									"relative inline-flex h-2 w-2 rounded-full border",
									tier.count === 0
										? "border-slate-200 bg-slate-100"
										: tier.pip,
								)}
							/>
						</span>
						<span className="tabular-nums">
							{tier.count} {tier.key === "med" ? "med" : tier.key}
						</span>
					</div>
				);
			})}
		</div>
	);
}

function AuditUploadDataRow({
	item,
	scope,
	onRestored,
}: {
	item: AuditDocumentListItem;
	scope: "active" | "removed";
	onRestored?: () => void;
}) {
	const router = useRouter();
	const { summary } = item;
	const chip = workflowChip(summary);
	const callout = scope === "active" ? buildActionNeededCallout(summary) : null;
	const isProcessing = summary.workflow === "processing";
	const auditorName = summary.auditorLabel?.trim() || null;
	const showAuditor = Boolean(auditorName || summary.periodLabel);
	const href = `/audits/upload/${item.$id}`;
	const [restoreOpen, setRestoreOpen] = useState(false);
	const [restoring, setRestoring] = useState(false);

	const openRow = () => router.push(href);

	return (
		<>
			<TableRow
				tabIndex={scope === "active" ? 0 : undefined}
				className={cn(
					scope === "active"
						? DATA_TABLE_BODY_ROW_CLICKABLE
						: DATA_TABLE_BODY_ROW_BASE,
					(callout || scope === "removed") && "[&>td]:border-b-0",
				)}
				onClick={scope === "active" ? openRow : undefined}
				onKeyDown={
					scope === "active"
						? (event) => {
								if (event.key === "Enter" || event.key === " ") {
									event.preventDefault();
									openRow();
								}
							}
						: undefined
				}
			>
				{/* 1 Document */}
				<TableCell className={cn(DATA_TABLE_CELL, "min-w-0 pl-4")}>
					<p className="text-sm font-medium text-slate-700">{item.fileName}</p>
				</TableCell>

				{/* 2 Status */}
				<TableCell className={cn(DATA_TABLE_CELL, "text-right")}>
					{scope === "removed" ? (
						<span
							className={cn(
								BADGE_BASE,
								"bg-slate-100 text-slate-600 border-slate-200",
							)}
						>
							Removed
						</span>
					) : (
						<span className={cn(BADGE_BASE, chip.className)}>
							{chip.spin ? (
								<Loader2
									className="h-3.5 w-3.5 shrink-0 animate-spin"
									aria-hidden
								/>
							) : null}
							<span className="truncate">{chip.label}</span>
						</span>
					)}
				</TableCell>

				{/* 3 Findings */}
				<TableCell className={cn(DATA_TABLE_CELL, "text-center")}>
					{isProcessing ? (
						<span className="text-sm text-slate-400">—</span>
					) : (
						<span className="text-xl font-bold tabular-nums text-slate-500">
							{summary.findingCount}
						</span>
					)}
				</TableCell>

				{/* 4 Severity */}
				<TableCell className={cn(DATA_TABLE_CELL, "whitespace-nowrap")}>
					<SeverityCell summary={summary} />
				</TableCell>

				{/* 5 Auditor — full name, no truncate / tooltip */}
				<TableCell className={cn(DATA_TABLE_CELL, "min-w-[10rem]")}>
					{showAuditor ? (
						<>
							{auditorName ? (
								<p className="text-xs text-slate-600">{auditorName}</p>
							) : null}
							{summary.periodLabel ? (
								<p className="mt-0.5 text-[11px] text-slate-500">
									{summary.periodLabel}
								</p>
							) : null}
						</>
					) : (
						<span className="text-xs text-slate-400">—</span>
					)}
				</TableCell>

				{/* 6 Uploaded on */}
				<TableCell
					className={cn(DATA_TABLE_CELL, "whitespace-nowrap text-xs text-slate-600")}
				>
					{formatUploadedOn(item.$createdAt)}
				</TableCell>

				{/* 7 Actions */}
				<TableCell className={cn(DATA_TABLE_CELL, "pr-4 text-center")}>
					{scope === "removed" ? (
						<Button
							type="button"
							variant="outline"
							className="h-8 px-2.5 text-xs"
							onClick={(event) => {
								event.stopPropagation();
								setRestoreOpen(true);
							}}
						>
							<RotateCcw className="h-3.5 w-3.5" />
							Restore
						</Button>
					) : null}
				</TableCell>
			</TableRow>

			{callout ? (
				<TableRow className="border-b-0 hover:bg-transparent hover:shadow-none">
					<TableCell colSpan={TABLE_COL_SPAN} className="p-0">
						{/* Approved alert band — visual treatment unchanged */}
						<div
							role="note"
							aria-label="Action needed"
							className="flex items-center justify-center gap-2 border-t border-orange/20 bg-orange/10 px-4 py-2.5 text-xs text-orange sm:px-6"
						>
							<AlertTriangle
								className="mt-0.5 h-3.5 w-3.5 shrink-0"
								aria-hidden
							/>
							<p>{callout}</p>
						</div>
					</TableCell>
				</TableRow>
			) : null}

			{scope === "removed" ? (
				<TableRow className="border-b-0 hover:bg-transparent hover:shadow-none">
					<TableCell colSpan={TABLE_COL_SPAN} className="p-0">
						<div
							role="note"
							className="border-t border-slate-200/80 bg-slate-50/80 px-4 py-2.5 text-xs text-slate-600 sm:px-6"
						>
							Findings and corrective actions closed when this was removed stay
							closed after restore.
						</div>
					</TableCell>
				</TableRow>
			) : null}

			<ConfirmDialog
				open={restoreOpen}
				onOpenChange={setRestoreOpen}
				icon={<RotateCcw className="h-5 w-5" />}
				title="Restore this upload?"
				description="It returns to Uploaded Audits. Findings and corrective actions that were closed when it was removed stay closed — reopen those separately if you still need them."
				confirmLabel={restoring ? "Restoring…" : "Restore"}
				onConfirm={async () => {
					setRestoring(true);
					try {
						const response = await fetch(
							`/api/audit/documents/${item.$id}/restore`,
							{ method: "POST" },
						);
						if (!response.ok) {
							const body = (await response.json().catch(() => null)) as {
								error?: string;
							} | null;
							throw new Error(body?.error || "Restore failed");
						}
						caalmToast.base({
							tone: "success",
							title: "Upload restored",
							message: `${item.fileName} is back in Uploaded Audits.`,
						});
						onRestored?.();
					} catch (error) {
						caalmToast.base({
							tone: "error",
							title: "Could not restore",
							message: error instanceof Error ? error.message : "Try again.",
						});
						throw error;
					} finally {
						setRestoring(false);
					}
				}}
			/>
		</>
	);
}

export function AuditUploadListTable({
	documents,
	isLoading,
	scope = "active",
	onScopeChange,
	showScopeToggle = false,
	onRestored,
	canUpload = false,
	onUpload,
}: {
	documents: AuditDocumentListItem[];
	isLoading?: boolean;
	scope?: "active" | "removed";
	onScopeChange?: (scope: "active" | "removed") => void;
	showScopeToggle?: boolean;
	onRestored?: () => void;
	canUpload?: boolean;
	onUpload?: () => void;
}) {
	const [sortKey, setSortKey] = useState<SortKey>("uploadedOn");
	const [sortDir, setSortDir] = useState<SortDir>("desc");

	const toggleSort = (key: SortKey) => {
		if (sortKey === key) {
			setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
		} else {
			setSortKey(key);
			setSortDir(key === "uploadedOn" || key === "findings" ? "desc" : "asc");
		}
	};

	const sortedDocuments = useMemo(() => {
		const list = [...documents];
		const dir = sortDir === "asc" ? 1 : -1;
		list.sort((a, b) => {
			switch (sortKey) {
				case "document":
					return a.fileName.localeCompare(b.fileName) * dir;
				case "status": {
					const rankA =
						scope === "removed"
							? 0
							: WORKFLOW_SORT_RANK[a.summary.workflow];
					const rankB =
						scope === "removed"
							? 0
							: WORKFLOW_SORT_RANK[b.summary.workflow];
					if (rankA !== rankB) return (rankA - rankB) * dir;
					return (
						(b.summary.awaitingConfirmation - a.summary.awaitingConfirmation) *
						dir
					);
				}
				case "findings":
					return (a.summary.findingCount - b.summary.findingCount) * dir;
				case "uploadedOn":
					return (
						(uploadedOnTime(a.$createdAt) - uploadedOnTime(b.$createdAt)) * dir
					);
				default: {
					const _exhaustive: never = sortKey;
					return _exhaustive;
				}
			}
		});
		return list;
	}, [documents, sortDir, sortKey, scope]);

	const isEmpty = !isLoading && documents.length === 0;
	const scopeToggle =
		showScopeToggle && onScopeChange ? (
			<div className="mb-4 flex justify-end">
				<SegmentedToggle
					value={scope}
					onChange={onScopeChange}
					ariaLabel="Filter uploads by active or removed"
					className="w-full max-w-xs"
					tabs={[
						{ value: "active", label: "Active" },
						{ value: "removed", label: "Removed" },
					]}
				/>
			</div>
		) : null;

	// Empty Removed: no glass card — toggle + empty copy only
	if (isEmpty && scope === "removed") {
		return (
			<div>
				{scopeToggle}
				<div className="flex flex-col items-center justify-center px-4 py-12 text-center">
					<Image
						src="/assets/icons/no-data.svg"
						alt=""
						width={250}
						height={250}
						className="mb-4 opacity-60"
					/>
					<p className="body-1 text-slate-700">No removed uploads</p>
					<p className="mt-2 max-w-md text-sm text-slate-600">
						Soft-deleted reports appear here so someone with delete permission
						can restore them.
					</p>
				</div>
			</div>
		);
	}

	return (
		<Card className="glass-card overflow-hidden">
			<div className="glass-card-cap" />
			<CardContent className="p-4 text-slate-700 sm:p-6">
				{scopeToggle}

				{isLoading ? (
					<CaalmDataTableSkeleton columns={TABLE_COL_SPAN} rows={3} className="pb-0" />
				) : isEmpty ? (
					<div className="flex flex-col items-center px-6 py-10 text-center">
						<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200/80 bg-white shadow-sm">
							<Upload className="h-5 w-5 text-[#0f5384]" aria-hidden />
						</div>
						<h2 className="h5 sidebar-gradient-text">No audits uploaded yet</h2>
						<p className="mt-2 max-w-md text-sm text-slate-600">
							Upload a single audit report to extract findings and reconcile
							them against your readiness record.
						</p>
						{canUpload && onUpload ? (
							<div className="mt-6">
								<Button
									type="button"
									className="btn-primary px-3 sm:px-4"
									onClick={onUpload}
								>
									<Upload className="h-4 w-4" />
									Upload audit
								</Button>
							</div>
						) : null}
					</div>
				) : (
					<CaalmDataTable className="pb-0">
						<TableHeader className="[&_tr]:border-b-0">
							<TableRow className={DATA_TABLE_HEADER_ROW}>
								<SortableDataTableHead
									label="Document"
									active={sortKey === "document"}
									onClick={() => toggleSort("document")}
									className="pl-4"
								/>
								<SortableDataTableHead
									label="Status"
									active={sortKey === "status"}
									onClick={() => toggleSort("status")}
									className="text-right"
								/>
								<SortableDataTableHead
									label="Findings"
									active={sortKey === "findings"}
									onClick={() => toggleSort("findings")}
									className="justify-center text-center"
								/>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
									Severity
								</TableHead>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
									Auditor
								</TableHead>
								<SortableDataTableHead
									label="Uploaded on"
									active={sortKey === "uploadedOn"}
									onClick={() => toggleSort("uploadedOn")}
								/>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3 pr-4")}>
									<span className="sr-only">
										{scope === "removed" ? "Restore" : "Open"}
									</span>
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody className="[&_tr:last-child>td]:border-b-0">
							{sortedDocuments.map((doc) => (
								<AuditUploadDataRow
									key={doc.$id}
									item={doc}
									scope={scope}
									onRestored={onRestored}
								/>
							))}
						</TableBody>
					</CaalmDataTable>
				)}
			</CardContent>
		</Card>
	);
}
