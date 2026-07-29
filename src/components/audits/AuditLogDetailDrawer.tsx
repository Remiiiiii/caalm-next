"use client";

import { format } from "date-fns";
import {
	AlertTriangle,
	CheckCircle,
	Clock,
	X,
	XCircle,
} from "lucide-react";
import type { AuditLog } from "@/components/audits/AuditLogTable";
import EntityPreviewSheetShell from "@/components/preview/EntityPreviewSheetShell";
import {
	previewSectionClass,
	previewSectionHeaderClass,
} from "@/components/preview/previewSheetParts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AuditLogDetailDrawerProps {
	log: AuditLog | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

function StatusBadge({ status }: { status: string }) {
	if (status === "success") {
		return (
			<Badge className="bg-green/10 text-green border-green/20">
				<CheckCircle className="w-3 h-3 mr-1" />
				Success
			</Badge>
		);
	}
	if (status === "failed") {
		return (
			<Badge className="bg-red/10 text-red border-red/20">
				<XCircle className="w-3 h-3 mr-1" />
				Failed
			</Badge>
		);
	}
	return (
		<Badge className="bg-orange/10 text-orange border-orange/20">
			<Clock className="w-3 h-3 mr-1" />
			Pending
		</Badge>
	);
}

export function AuditLogDetailDrawer({
	log,
	open,
	onOpenChange,
}: AuditLogDetailDrawerProps) {
	if (!log) return null;

	return (
		<EntityPreviewSheetShell
			open={open}
			onOpenChange={onOpenChange}
			maxWidth="lg"
			title="Event details"
			description={log.summary || log.event_title || "Audit event"}
			icon={AlertTriangle}
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
				<div className={previewSectionHeaderClass}>
					<h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
						Event summary
					</h3>
				</div>
				<div className="grid grid-cols-1 gap-4 p-4 text-sm sm:grid-cols-2">
					<div>
						<p className="mb-1 text-xs text-slate-500">Timestamp</p>
						<p className="text-slate-900">
							{log.created_at
								? format(new Date(log.created_at), "MMM d, yyyy HH:mm:ss")
								: "—"}
						</p>
					</div>
					<div>
						<p className="mb-1 text-xs text-slate-500">Status</p>
						<StatusBadge status={log.status} />
					</div>
					<div>
						<p className="mb-1 text-xs text-slate-500">Action</p>
						<p className="text-slate-900 capitalize">{log.action}</p>
					</div>
					<div>
						<p className="mb-1 text-xs text-slate-500">Module</p>
						<p className="text-slate-900 capitalize">{log.module || "—"}</p>
					</div>
					<div className="sm:col-span-2">
						<p className="mb-1 text-xs text-slate-500">Actor</p>
						<p className="font-medium text-slate-900">{log.user_name}</p>
						<p className="text-xs text-slate-600">{log.user_email}</p>
					</div>
					<div>
						<p className="mb-1 text-xs text-slate-500">Target</p>
						<p className="text-slate-900">
							{log.target_label || log.event_title}
						</p>
						{log.target_type ? (
							<p className="text-xs text-slate-600">{log.target_type}</p>
						) : null}
					</div>
					<div>
						<p className="mb-1 text-xs text-slate-500">Source</p>
						<p className="uppercase text-slate-900">{log.source}</p>
					</div>
					<div>
						<p className="mb-1 text-xs text-slate-500">IP address</p>
						<p className="text-slate-900">{log.ip_address || "N/A"}</p>
					</div>
					<div>
						<p className="mb-1 text-xs text-slate-500">Event ID</p>
						<p className="break-all text-xs text-slate-900">{log.event_id}</p>
					</div>
				</div>
			</section>

			{log.reason ? (
				<section className={cn(previewSectionClass, "p-4")}>
					<p className="mb-1 text-xs text-slate-500">Reason</p>
					<p className="text-sm text-slate-900">{log.reason}</p>
				</section>
			) : null}

			{log.error_message ? (
				<div className="rounded-lg border border-red/20 bg-red/10 p-3">
					<p className="mb-1 text-xs font-medium text-red">Error</p>
					<p className="text-sm text-red">{log.error_message}</p>
				</div>
			) : null}

			{log.changes && log.changes.length > 0 ? (
				<section className={cn(previewSectionClass, "overflow-hidden p-0")}>
					<div className={previewSectionHeaderClass}>
						<h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
							Field changes
						</h3>
					</div>
					<div className="overflow-hidden">
						<table className="w-full text-sm">
							<thead className="bg-white/50 text-left text-xs text-slate-600">
								<tr>
									<th className="px-3 py-2">Field</th>
									<th className="px-3 py-2">Before</th>
									<th className="px-3 py-2">After</th>
								</tr>
							</thead>
							<tbody>
								{log.changes.map((change) => (
									<tr
										key={`${change.field}-${String(change.before)}-${String(change.after)}`}
										className="border-t border-white/45"
									>
										<td className="px-3 py-2 text-slate-900">{change.field}</td>
										<td className="px-3 py-2 text-slate-600">
											{change.before == null ? "—" : String(change.before)}
										</td>
										<td className="px-3 py-2 text-slate-900">
											{change.after == null ? "—" : String(change.after)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			) : null}

			{log.metadata ? (
				<section className={cn(previewSectionClass, "p-4")}>
					<p className="mb-2 text-sm font-medium sidebar-gradient-text">
						Metadata
					</p>
					<pre className="overflow-x-auto rounded-lg border border-white/50 bg-white/70 p-3 text-xs text-slate-700">
						{JSON.stringify(log.metadata, null, 2)}
					</pre>
				</section>
			) : null}

			{log.user_agent ? (
				<section className={cn(previewSectionClass, "p-4")}>
					<p className="mb-1 text-xs text-slate-500">User agent</p>
					<p className="break-all text-xs text-slate-600">{log.user_agent}</p>
				</section>
			) : null}
		</EntityPreviewSheetShell>
	);
}
