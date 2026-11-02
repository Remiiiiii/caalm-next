"use client";

import type { ReactNode } from "react";
import { format } from "date-fns";
import {
	AlertTriangle,
	ChevronRight,
	FileText,
	Loader2,
} from "lucide-react";
import Link from "next/link";
import type { AuditDocumentListItem } from "@/lib/audit-upload/upload-list-summaries";
import { buildActionNeededCallout } from "@/lib/audit-upload/upload-list-summaries";
import { cn } from "@/lib/utils";

const BADGE_BASE =
	"inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full border whitespace-nowrap";

function formatUploadedDate(createdAt?: string): string {
	if (!createdAt) return "Uploaded —";
	try {
		return `Uploaded ${format(new Date(createdAt), "MMM d, yyyy")}`;
	} catch {
		return "Uploaded —";
	}
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
				className: "bg-blue/10 text-blue border-blue/20",
				spin: false,
			};
		case "complete":
			return {
				label: "Complete",
				className: "bg-green/10 text-green border-green/20",
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

function SeverityBreakdown({
	summary,
}: {
	summary: AuditDocumentListItem["summary"];
}) {
	const tiers = [
		{ key: "high" as const, count: summary.severityHigh, pip: "bg-red" },
		{ key: "med" as const, count: summary.severityMed, pip: "bg-orange" },
		{ key: "low" as const, count: summary.severityLow, pip: "bg-green" },
	].filter((t) => t.count > 0);

	if (tiers.length === 0) return null;

	const aria = tiers
		.map((t) => `${t.count} ${t.key === "med" ? "medium" : t.key}`)
		.join(", ");

	return (
		<span
			className="inline-flex flex-wrap items-center gap-x-3 gap-y-1"
			aria-label={`${aria} severity findings`}
		>
			{tiers.map((tier) => (
				<span
					key={tier.key}
					className="inline-flex items-center gap-1.5 text-xs text-slate-600"
				>
					<span
						className={cn("h-2 w-2 shrink-0 rounded-full", tier.pip)}
						aria-hidden
					/>
					<span>
						{tier.count} {tier.key === "med" ? "med" : tier.key}
					</span>
				</span>
			))}
		</span>
	);
}

export function AuditUploadListRow({ item }: { item: AuditDocumentListItem }) {
	const { summary } = item;
	const chip = workflowChip(summary);
	const callout = buildActionNeededCallout(summary);

	const auditorBits: string[] = [];
	if (summary.auditorLabel) auditorBits.push(summary.auditorLabel);
	if (summary.periodLabel) auditorBits.push(summary.periodLabel);

	const showSeverity =
		summary.workflow !== "processing" &&
		(summary.severityHigh > 0 ||
			summary.severityMed > 0 ||
			summary.severityLow > 0);

	const metaSegments: ReactNode[] = [formatUploadedDate(item.$createdAt)];
	if (showSeverity) {
		metaSegments.push(<SeverityBreakdown key="sev" summary={summary} />);
	}
	if (auditorBits.length > 0) {
		metaSegments.push(auditorBits.join(" · "));
	}

	return (
		<li role="listitem">
			<Link
				href={`/audits/upload/${item.$id}`}
				className="group block cursor-pointer transition-colors duration-200 hover:bg-[#078fab]/[.04] focus-visible:bg-[#078fab]/[.06] focus-visible:outline-none"
			>
				<div className="flex items-start justify-between gap-3 px-4 py-3.5 sm:px-6">
					<div className="flex min-w-0 flex-1 items-start gap-3">
						<span
							className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-[#0f5384] shadow-sm"
							aria-hidden
						>
							<FileText className="h-4 w-4" />
						</span>
						<div className="min-w-0 flex-1">
							<p className="truncate text-sm font-semibold sidebar-gradient-text">
								{item.fileName}
							</p>
							<div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
								{metaSegments.map((segment, index) => (
									<span
										key={index}
										className="inline-flex items-center gap-2"
									>
										{index > 0 ? (
											<span className="text-slate-300" aria-hidden>
												·
											</span>
										) : null}
										{typeof segment === "string" ? (
											<span>{segment}</span>
										) : (
											segment
										)}
									</span>
								))}
							</div>
						</div>
					</div>
					<div className="flex shrink-0 items-center gap-2 pt-0.5">
						<span className={cn(BADGE_BASE, chip.className)}>
							{chip.spin ? (
								<Loader2
									className="h-3.5 w-3.5 shrink-0 animate-spin"
									aria-hidden
								/>
							) : null}
							<span>{chip.label}</span>
						</span>
						<ChevronRight
							className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-[#078fab]"
							aria-hidden
						/>
					</div>
				</div>
				{callout ? (
					<div
						role="note"
						aria-label="Action needed"
						className="flex items-start gap-2 border-t border-orange/20 bg-orange/10 px-4 py-2.5 text-xs text-orange sm:px-6"
					>
						<AlertTriangle
							className="mt-0.5 h-3.5 w-3.5 shrink-0"
							aria-hidden
						/>
						<p>{callout}</p>
					</div>
				) : null}
			</Link>
		</li>
	);
}
