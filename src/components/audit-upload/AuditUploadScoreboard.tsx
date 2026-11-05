"use client";

import { formatDistanceToNowStrict } from "date-fns";
import {
	AlertTriangle,
	Check,
	FileClock,
	FileSearch,
	FileUp,
	TrendingUp,
	Upload,
	type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MetricStatDotsBackdrop } from "@/components/ui/metric-stat-card";
import {
	StatCardIcon,
	type StatCardIconTone,
} from "@/components/ui/stat-card-icon";
import type { AuditScoreboard } from "@/lib/audit-upload/upload-list-summaries";
import { cn } from "@/lib/utils";

const BADGE_BASE =
	"inline-block shrink-0 px-2 py-0.5 text-xs rounded-full border whitespace-nowrap";

function DetailList({
	rows,
}: {
	rows: Array<{
		label: string;
		value: ReactNode;
		muted?: boolean;
		pip?: string;
	}>;
}) {
	return (
		<dl className="w-full">
			{rows.map((row) => (
				<div
					key={row.label}
					className="flex items-center justify-between gap-3 border-t border-slate-200 py-2 text-xs"
				>
					<dt className="inline-flex min-w-0 items-center gap-1.5 text-slate-500">
						{row.pip ? (
							<span
								className={cn("h-2 w-2 shrink-0 rounded-full", row.pip)}
								aria-hidden
							/>
						) : null}
						<span className="truncate">{row.label}</span>
					</dt>
					<dd
						className={cn(
							"shrink-0 font-semibold tabular-nums",
							row.muted ? "text-slate-400" : "text-slate-700",
						)}
					>
						{row.value}
					</dd>
				</div>
			))}
		</dl>
	);
}

function SeverityBars({
	high,
	med,
	low,
	total,
}: {
	high: number;
	med: number;
	low: number;
	total: number;
}) {
	const segments = [
		{ key: "high", count: high, fill: "bg-red", label: "high" },
		{ key: "med", count: med, fill: "bg-orange", label: "med" },
		{ key: "low", count: low, fill: "bg-green", label: "low" },
	].filter((segment) => segment.count > 0);

	const denom = Math.max(total, 1);

	return (
		<div
			role="img"
			aria-label={`Severity distribution: ${high} high, ${med} medium, ${low} low`}
			className="mt-3 space-y-2"
		>
			<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
				Severity · {total} finding{total === 1 ? "" : "s"}
			</p>
			<div className="flex h-2.5 w-full items-stretch gap-1 overflow-hidden">
				{segments.map((segment) => (
					<div
						key={segment.key}
						className={cn("min-w-0 rounded-full", segment.fill)}
						style={{ flexGrow: segment.count / denom, flexBasis: 0 }}
						title={`${segment.count} ${segment.label}`}
					/>
				))}
			</div>
			<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
				{[
					{ count: high, fill: "bg-red", label: "high" },
					{ count: med, fill: "bg-orange", label: "med" },
					{ count: low, fill: "bg-green", label: "low" },
				].map((item) => (
					<span
						key={item.label}
						className="inline-flex items-center gap-1.5 tabular-nums"
					>
						<span
							className={cn("h-2 w-2 shrink-0 rounded-full", item.fill)}
							aria-hidden
						/>
						{item.count} {item.label}
					</span>
				))}
			</div>
		</div>
	);
}

function formatOldest(iso: string | null): string | null {
	if (!iso) return null;
	try {
		return `${formatDistanceToNowStrict(new Date(iso))} ago`;
	} catch {
		return null;
	}
}

/** Coerce API / cache gaps to a real number (never blank or NaN). */
function asCount(value: unknown): number {
	const n = typeof value === "number" ? value : Number(value);
	return Number.isFinite(n) ? n : 0;
}

/** Questioned costs / exposure for the findings card. */
function formatQuestionedCosts(usd: unknown): string {
	const amount = asCount(usd);
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: amount >= 1000 ? 0 : 2,
	}).format(amount);
}

function ScoreboardShell({
	id,
	title,
	icon: Icon,
	iconTone = "default",
	badge,
	borderTone,
	children,
	footer,
}: {
	id: string;
	title: string;
	icon: LucideIcon;
	iconTone?: StatCardIconTone;
	badge?: ReactNode;
	borderTone?: "default" | "warning" | "success";
	children: ReactNode;
	footer?: ReactNode;
}) {
	return (
		<section aria-labelledby={id} className="min-h-0">
			<Card
				className={cn(
					"glass-card relative flex h-full min-h-0 flex-col overflow-hidden",
					borderTone === "warning" && "border-orange/40",
					borderTone === "success" && "border-green/30",
				)}
			>
				<div className="glass-card-cap" />
				<MetricStatDotsBackdrop />
				<CardContent className="relative z-10 mt-4 flex min-h-0 flex-1 flex-col p-0">
					<div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-2 sm:px-5">
						<div className="flex w-full items-center gap-2.5 border-b border-slate-200 pb-3">
							<StatCardIcon icon={Icon} tone={iconTone} />
							<h3
								id={id}
								className="min-w-0 flex-1 text-base font-semibold leading-snug sidebar-gradient-text"
							>
								{title}
							</h3>
							{badge}
						</div>
						<div className="flex min-h-0 flex-1 flex-col pt-3">{children}</div>
					</div>
					{footer}
				</CardContent>
			</Card>
		</section>
	);
}

export function AuditUploadScoreboard({
	scoreboard,
	onUploadSecondReport,
	canUpload,
}: {
	scoreboard: AuditScoreboard;
	onUploadSecondReport: () => void;
	canUpload: boolean;
}) {
	const oldestLabel = formatOldest(scoreboard.oldestUnconfirmedAt);
	const attentionCount =
		scoreboard.untrackedGapCount + scoreboard.severityMismatchCount;

	const confirmedCount = asCount(scoreboard.confirmedFindingsCount);
	const stillOpenCount = asCount(scoreboard.stillOpenFindingsCount);
	const repeatCount = asCount(scoreboard.repeatFindingsCount);
	const questionedCosts = asCount(scoreboard.monetaryImpactUsdTotal);

	const awaitingBadge =
		scoreboard.awaitingState === "alert"
			? {
					label: "Action needed",
					className: "bg-orange/10 text-orange border-orange/20",
				}
			: scoreboard.awaitingState === "complete"
				? {
						label: "Complete",
						className: "bg-green/10 text-green border-green/20",
					}
				: {
						label: "Ready to review",
						className: "bg-blue/10 text-blue border-blue/20",
					};

	const awaitingSubtitle =
		scoreboard.awaitingState === "complete"
			? "All findings confirmed — no action needed"
			: scoreboard.awaitingState === "alert"
				? "Findings still waiting for a person"
				: "Findings ready to confirm";

	const uploadRows = [
		{
			label: "Complete",
			value: scoreboard.completeCount,
			muted: scoreboard.completeCount === 0,
		},
		{
			label: "Processing",
			value: scoreboard.processingCount,
			muted: scoreboard.processingCount === 0,
		},
		{
			label: "Failed",
			value: scoreboard.failedCount,
			muted: scoreboard.failedCount === 0,
		},
		{
			label: "Auditors",
			value: scoreboard.uniqueAuditorCount,
			muted: scoreboard.uniqueAuditorCount === 0,
		},
	];

	const awaitingRows = [
		{
			label: "Untracked gaps",
			value: scoreboard.untrackedGapCount,
			muted: scoreboard.untrackedGapCount === 0,
		},
		{
			label: "Severity mismatches",
			value: scoreboard.severityMismatchCount,
			muted: scoreboard.severityMismatchCount === 0,
		},
		{
			label: "Unreviewed",
			value: scoreboard.unreviewedCount,
			muted: scoreboard.unreviewedCount === 0,
		},
		...(oldestLabel
			? [{ label: "Oldest unconfirmed", value: oldestLabel }]
			: []),
	];

	return (
		<div
			role="region"
			aria-label="Audit overview"
			className="mb-6 grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 lg:grid-cols-4"
		>
			<ScoreboardShell
				id="scoreboard-uploads"
				title="Uploads"
				icon={FileUp}
				badge={
					scoreboard.fiscalYearLabel ? (
						<span className={cn(BADGE_BASE, "bg-blue/10 text-blue border-blue/20")}>
							{scoreboard.fiscalYearLabel}
						</span>
					) : (
						<span className={cn(BADGE_BASE, "bg-slate-100 text-slate-600 border-slate-200")}>
							All uploads
						</span>
					)
				}
			>
				<p className="text-3xl font-bold tabular-nums text-slate-700">
					{scoreboard.uploadCount}
				</p>
				<p className="mt-1 text-xs text-slate-600">
					Audit reports in this organization
				</p>
				<div className="mt-3">
					<DetailList rows={uploadRows} />
				</div>
			</ScoreboardShell>

			<ScoreboardShell
				id="scoreboard-findings"
				title="Total findings"
				icon={FileSearch}
				badge={
					<span className={cn(BADGE_BASE, "bg-green/10 text-green border-green/20")}>
						{scoreboard.uploadCount === 1
							? "1 upload"
							: `${scoreboard.uploadCount} uploads`}
					</span>
				}
			>
				<p className="text-3xl font-bold tabular-nums text-slate-700">
					{scoreboard.totalFindings}
				</p>
				<p className="mt-1 text-xs text-slate-600">
					Findings across every upload
				</p>
				{scoreboard.totalFindings > 0 ? (
					<SeverityBars
						high={scoreboard.severityHigh}
						med={scoreboard.severityMed}
						low={scoreboard.severityLow}
						total={scoreboard.totalFindings}
					/>
				) : null}
				<div className="mt-3">
					<DetailList
						rows={[
							{
								label: "Confirmed",
								value: confirmedCount,
								muted: confirmedCount === 0,
							},
							{
								label: "Still open",
								value: stillOpenCount,
								muted: stillOpenCount === 0,
							},
							{
								label: "Repeats",
								value: repeatCount,
								muted: repeatCount === 0,
							},
							{
								label: "Questioned costs",
								value: formatQuestionedCosts(questionedCosts),
								muted: questionedCosts === 0,
							},
						]}
					/>
				</div>
			</ScoreboardShell>

			<ScoreboardShell
				id="scoreboard-awaiting"
				title="Awaiting confirmation"
				icon={FileClock}
				iconTone={
					scoreboard.awaitingState === "alert"
						? "warning"
						: scoreboard.awaitingState === "complete"
							? "success"
							: "default"
				}
				borderTone={
					scoreboard.awaitingState === "alert"
						? "warning"
						: scoreboard.awaitingState === "complete"
							? "success"
							: "default"
				}
				badge={
					<span className={cn(BADGE_BASE, awaitingBadge.className)}>
						{awaitingBadge.label}
					</span>
				}
				footer={
					scoreboard.awaitingState === "alert" ? (
						<div
							role="alert"
							className="flex shrink-0 items-center gap-2 border-t border-orange/20 bg-orange/10 px-4 py-2.5 text-xs font-medium text-orange sm:px-5"
						>
							<AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
							<span className="min-w-0">
								{attentionCount} finding
								{attentionCount === 1 ? "" : "s"} need attention before
								confirming
							</span>
						</div>
					) : null
				}
			>
				<p
					className={cn(
						"text-3xl font-bold tabular-nums",
						scoreboard.awaitingState === "alert"
							? "text-orange"
							: scoreboard.awaitingState === "complete"
								? "text-green"
								: "text-slate-700",
					)}
				>
					{scoreboard.awaitingConfirmation}
				</p>
				<p
					className={cn(
						"mt-1 text-xs",
						scoreboard.awaitingState === "alert"
							? "text-orange"
							: "text-slate-600",
					)}
				>
					{awaitingSubtitle}
				</p>
				<div className="mt-3">
					<DetailList rows={awaitingRows} />
				</div>
			</ScoreboardShell>

			{scoreboard.showTrendsNudge ? (
				<ScoreboardShell
					id="scoreboard-trends"
					title="Trend comparisons"
					icon={TrendingUp}
				>
					<p className="text-xs text-slate-600">
						Upload a second completed report to unlock year-over-year
						comparisons across all uploads.
					</p>
					<ul className="mt-3 space-y-1.5 text-xs text-slate-500">
						{[
							"Repeat finding rate",
							"Avg. corrective action close time",
							"On-time CAP completion rate",
							"Disputed finding trends",
						].map((feature) => (
							<li key={feature} className="flex items-center gap-2">
								<span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white/70 text-slate-400">
									<Check className="h-2.5 w-2.5" aria-hidden />
								</span>
								{feature}
							</li>
						))}
					</ul>
					{canUpload ? (
						<Button
							type="button"
							className="btn-primary mt-auto w-full px-3 sm:px-4"
							onClick={onUploadSecondReport}
						>
							<Upload className="h-4 w-4" />
							Upload second report
						</Button>
					) : null}
				</ScoreboardShell>
			) : null}
		</div>
	);
}
