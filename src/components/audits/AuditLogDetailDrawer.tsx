"use client";

import { format } from "date-fns";
import {
	AlertTriangle,
	AlignLeft,
	FileText,
	Info,
	ListTree,
	X,
} from "lucide-react";
import type { ReactNode } from "react";
import type { AuditLog } from "@/components/audits/AuditLogTable";
import EntityPreviewSheetShell from "@/components/preview/EntityPreviewSheetShell";
import {
	previewSectionClass,
	previewSectionHeaderClass,
} from "@/components/preview/previewSheetParts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AuditLogDetailDrawerProps {
	log: AuditLog | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const META_LABELS: Record<string, string> = {
	source: "Source",
	invitedCount: "Invitees notified",
	eventId: "Event ID",
	orgId: "Organization",
};

function formatMetaLabel(key: string): string {
	if (META_LABELS[key]) return META_LABELS[key];
	return key
		.replace(/_/g, " ")
		.replace(/([a-z])([A-Z])/g, "$1 $2")
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMetaText(value: unknown): string {
	if (value == null || value === "") return "—";
	if (typeof value === "boolean") return value ? "Yes" : "No";
	if (typeof value === "string") {
		if (value === "ai_assistant") return "AI assistant";
		return value.replace(/_/g, " ");
	}
	if (Array.isArray(value)) {
		if (value.length === 0) return "—";
		return value.map((item) => formatMetaText(item)).join(", ");
	}
	if (typeof value === "object") {
		return Object.entries(value as Record<string, unknown>)
			.map(([k, v]) => `${formatMetaLabel(k)}: ${formatMetaText(v)}`)
			.join(" · ");
	}
	return String(value);
}

function formatTargetType(type?: string | null): string {
	if (!type) return "";
	return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getTimezoneAbbreviation(date: Date): string {
	const part = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" })
		.formatToParts(date)
		.find((p) => p.type === "timeZoneName")?.value;
	return part || "UTC";
}

/** e.g. Logged Aug 4, 2026 · 11:54:55 UTC */
function formatLoggedAt(iso?: string | null): string | null {
	if (!iso) return null;
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return null;
	const datePart = format(date, "MMM d, yyyy");
	const timePart = format(date, "HH:mm:ss");
	const tz = getTimezoneAbbreviation(date);
	return `Logged ${datePart} · ${timePart} ${tz}`;
}

/** Drop trailing schedule date/time from audit summaries for the header. */
function formatEventDescription(
	summary?: string | null,
	fallback?: string | null,
): string | null {
	const raw = (summary || fallback || "").trim();
	if (!raw) return null;
	return (
		raw
			// "on 2026-08-05 at 10:00" / "on Aug 5, 2026 at 10:00 AM"
			.replace(
				/\s+on\s+\d{4}-\d{2}-\d{2}\s+at\s+\d{1,2}:\d{2}(?::\d{2})?\s*(AM|PM)?/gi,
				"",
			)
			.replace(
				/\s+on\s+[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}\s+at\s+\d{1,2}:\d{2}(?::\d{2})?\s*(AM|PM)?/gi,
				"",
			)
			// trailing "at 10:00" leftovers
			.replace(/\s+at\s+\d{1,2}:\d{2}(?::\d{2})?\s*(AM|PM)?$/gi, "")
			.trim() || null
	);
}

/** Label left, value right — matches audit drawer info layout. */
function InfoRow({
	label,
	children,
	className,
}: {
	label: string;
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn("flex items-start justify-between gap-4 py-3", className)}
		>
			<p className="shrink-0 pt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
				{label}
			</p>
			<div className="min-w-0 max-w-[65%] text-right text-sm font-semibold text-slate-700">
				{children}
			</div>
		</div>
	);
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex items-center justify-between gap-4 py-2.5">
			<p className="shrink-0 text-sm text-slate-500">{label}</p>
			<div className="min-w-0 text-right text-sm font-semibold text-slate-700">
				{children}
			</div>
		</div>
	);
}

function CountBadge({ value }: { value: number }) {
	return (
		<span className="inline-flex min-w-6 items-center justify-center rounded-md bg-[#f3e8d2] px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-700">
			{value}
		</span>
	);
}

function renderMetaValue(key: string, value: unknown): ReactNode {
	if (key === "invitedCount" && typeof value === "number") {
		return <CountBadge value={value} />;
	}
	return formatMetaText(value);
}

export function AuditLogDetailDrawer({
	log,
	open,
	onOpenChange,
}: AuditLogDetailDrawerProps) {
	if (!log) return null;

	const metadataEntries =
		log.metadata && typeof log.metadata === "object"
			? Object.entries(log.metadata)
			: [];

	const targetType = formatTargetType(log.target_type);
	const loggedAt = formatLoggedAt(log.created_at);
	const eventDescription = formatEventDescription(log.summary, log.event_title);

	return (
		<EntityPreviewSheetShell
			open={open}
			onOpenChange={onOpenChange}
			maxWidth="md"
			title="Event Record"
			description={
				<>
					{eventDescription ? (
						<span className="block text-slate-600">{eventDescription}</span>
					) : null}
					{loggedAt ? (
						<span
							className={cn( "text-xs text-slate-600", eventDescription ? "mt-1.5" : undefined, )}
						>
							{loggedAt}
						</span>
					) : null}
				</>
			}
			icon={Info}
			footer={
				<div className="flex w-full justify-end">
					<Button
						variant="outline"
						className="primary-btn cursor-pointer px-3 sm:px-4"
						onClick={() => onOpenChange(false)}
					>
						<X className="h-4 w-4" />
						Close
					</Button>
				</div>
			}
		>
			<section className={cn(previewSectionClass, "overflow-hidden p-0")}>
				<div className="divide-y divide-slate-200/70 px-4">
					<InfoRow label="Actor">
						<div>
							<p className="font-bold text-slate-700">{log.user_name || "—"}</p>
							{log.user_email ? (
								<p className="mt-0.5 text-xs font-normal text-slate-500">
									{log.user_email}
								</p>
							) : null}
						</div>
					</InfoRow>
					<InfoRow label="Target">
						<div>
							<p className="font-bold text-slate-700">
								{log.target_label || log.event_title || "—"}
							</p>
							{targetType ? (
								<p className="mt-0.5 text-xs font-normal text-slate-500">
									{targetType}
								</p>
							) : null}
						</div>
					</InfoRow>
					<InfoRow label="Source">
						<span className="uppercase tracking-wide font-bold text-slate-700">
							{log.source || "—"}
						</span>
					</InfoRow>
					<InfoRow label="IP address">
						{log.ip_address ? (
							<span className="text-xs font-medium text-slate-700">
								{log.ip_address}
							</span>
						) : (
							<span className="text-xs font-normal text-slate-400">
								Not recorded
							</span>
						)}
					</InfoRow>
					<InfoRow label="Event ID">
						<span className="break-all text-xs font-medium leading-snug text-slate-700">
							{log.event_id || "—"}
						</span>
					</InfoRow>
				</div>
			</section>

			{metadataEntries.length > 0 ? (
				<section
					className={cn( previewSectionClass, "overflow-hidden border-slate-200/60! bg-slate-50/80! p-0", )}
				>
					<div className="border-b border-slate-200/70 px-4 py-2.5">
						<div className="flex items-center gap-2">
							<AlignLeft className="h-3.5 w-3.5 text-slate-400" />
							<h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
								Metadata
							</h3>
						</div>
					</div>
					<div className="divide-y divide-slate-200/60 px-4">
						{metadataEntries.map(([key, value]) => (
							<MetaRow key={key} label={formatMetaLabel(key)}>
								{renderMetaValue(key, value)}
							</MetaRow>
						))}
					</div>
				</section>
			) : null}

			{log.reason ? (
				<section className={cn(previewSectionClass, "overflow-hidden p-0")}>
					<div className={previewSectionHeaderClass}>
						<div className="flex items-center gap-2">
							<FileText className="h-3.5 w-3.5 text-[#0f5384]" />
							<h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
								Reason
							</h3>
						</div>
					</div>
					<div className="px-4 py-3">
						<p className="text-sm text-slate-700">{log.reason}</p>
					</div>
				</section>
			) : null}

			{log.error_message ? (
				<section className={cn(previewSectionClass, "overflow-hidden p-0")}>
					<div className={previewSectionHeaderClass}>
						<div className="flex items-center gap-2">
							<AlertTriangle className="h-3.5 w-3.5 text-red" />
							<h3 className="text-xs font-semibold uppercase tracking-wide text-red">
								Error
							</h3>
						</div>
					</div>
					<div className="px-4 py-3">
						<p className="text-sm text-red">{log.error_message}</p>
					</div>
				</section>
			) : null}

			{log.changes && log.changes.length > 0 ? (
				<section className={cn(previewSectionClass, "overflow-hidden p-0")}>
					<div className={previewSectionHeaderClass}>
						<div className="flex items-center gap-2">
							<ListTree className="h-3.5 w-3.5 text-[#0f5384]" />
							<h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
								Field changes
							</h3>
						</div>
					</div>
					<div className="overflow-hidden">
						<table className="w-full text-sm">
							<thead className="bg-white/50 text-left text-xs text-slate-600">
								<tr>
									<th className="px-4 py-2.5 font-semibold">Field</th>
									<th className="px-4 py-2.5 font-semibold">Before</th>
									<th className="px-4 py-2.5 font-semibold">After</th>
								</tr>
							</thead>
							<tbody>
								{log.changes.map((change) => (
									<tr
										key={`${change.field}-${String(change.before)}-${String(change.after)}`}
										className="border-t border-white/45"
									>
										<td className="px-4 py-2.5 text-slate-700">
											{change.field}
										</td>
										<td className="px-4 py-2.5 text-slate-600">
											{change.before == null ? "—" : String(change.before)}
										</td>
										<td className="px-4 py-2.5 text-slate-700">
											{change.after == null ? "—" : String(change.after)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			) : null}

			{log.user_agent ? (
				<section className={cn(previewSectionClass, "overflow-hidden p-0")}>
					<div className={previewSectionHeaderClass}>
						<div className="flex items-center gap-2">
							<FileText className="h-3.5 w-3.5 text-[#0f5384]" />
							<h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
								User agent
							</h3>
						</div>
					</div>
					<div className="px-4 py-3">
						<p className="break-all text-xs text-slate-600">{log.user_agent}</p>
					</div>
				</section>
			) : null}
		</EntityPreviewSheetShell>
	);
}
