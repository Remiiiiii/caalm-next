"use client";

import { format } from "date-fns";
import { AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import type { AuditLog } from "@/components/audits/AuditLogTable";

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
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="w-full sm:max-w-lg overflow-y-auto bg-slate-50 border-l border-slate-200"
			>
				<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70" />
				<SheetHeader className="mt-4 text-left border-b border-slate-200 pb-4 bg-linear-to-r from-blue-50 to-indigo-50 -mx-6 px-6 py-4">
					<div className="flex items-center gap-3">
						<AlertTriangle className="w-5 h-5 text-[#0f5384]" />
						<SheetTitle className="text-xl font-semibold sidebar-gradient-text">
							Event details
						</SheetTitle>
					</div>
					<p className="text-sm text-slate-600 mt-1 ml-8">
						{log?.summary || log?.event_title || "Audit event"}
					</p>
				</SheetHeader>

				{log ? (
					<div className="space-y-6 py-6">
						<div className="grid grid-cols-2 gap-4 text-sm">
							<div>
								<p className="text-xs text-slate-500 mb-1">Timestamp</p>
								<p className="text-slate-900">
									{log.created_at
										? format(new Date(log.created_at), "MMM d, yyyy HH:mm:ss")
										: "—"}
								</p>
							</div>
							<div>
								<p className="text-xs text-slate-500 mb-1">Status</p>
								<StatusBadge status={log.status} />
							</div>
							<div>
								<p className="text-xs text-slate-500 mb-1">Action</p>
								<p className="text-slate-900 capitalize">{log.action}</p>
							</div>
							<div>
								<p className="text-xs text-slate-500 mb-1">Module</p>
								<p className="text-slate-900 capitalize">
									{log.module || "—"}
								</p>
							</div>
							<div className="col-span-2">
								<p className="text-xs text-slate-500 mb-1">Actor</p>
								<p className="text-slate-900 font-medium">{log.user_name}</p>
								<p className="text-xs text-slate-600">{log.user_email}</p>
							</div>
							<div>
								<p className="text-xs text-slate-500 mb-1">Target</p>
								<p className="text-slate-900">
									{log.target_label || log.event_title}
								</p>
								{log.target_type ? (
									<p className="text-xs text-slate-600">{log.target_type}</p>
								) : null}
							</div>
							<div>
								<p className="text-xs text-slate-500 mb-1">Source</p>
								<p className="text-slate-900 uppercase">{log.source}</p>
							</div>
							<div>
								<p className="text-xs text-slate-500 mb-1">IP address</p>
								<p className="text-slate-900">{log.ip_address || "N/A"}</p>
							</div>
							<div>
								<p className="text-xs text-slate-500 mb-1">Event ID</p>
								<p className="text-slate-900 break-all text-xs">{log.event_id}</p>
							</div>
						</div>

						{log.reason ? (
							<div>
								<p className="text-xs text-slate-500 mb-1">Reason</p>
								<p className="text-sm text-slate-900">{log.reason}</p>
							</div>
						) : null}

						{log.error_message ? (
							<div className="rounded-lg border border-red/20 bg-red/10 p-3">
								<p className="text-xs font-medium text-red mb-1">Error</p>
								<p className="text-sm text-red">{log.error_message}</p>
							</div>
						) : null}

						{log.changes && log.changes.length > 0 ? (
							<div>
								<p className="text-sm font-medium sidebar-gradient-text mb-2">
									Field changes
								</p>
								<div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
									<table className="w-full text-sm">
										<thead className="bg-slate-50 text-left text-xs text-slate-600">
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
													className="border-t border-slate-100"
												>
													<td className="px-3 py-2 text-slate-900">
														{change.field}
													</td>
													<td className="px-3 py-2 text-slate-600">
														{change.before == null
															? "—"
															: String(change.before)}
													</td>
													<td className="px-3 py-2 text-slate-900">
														{change.after == null
															? "—"
															: String(change.after)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						) : null}

						{log.metadata ? (
							<div>
								<p className="text-sm font-medium sidebar-gradient-text mb-2">
									Metadata
								</p>
								<pre className="text-xs overflow-x-auto bg-white border border-slate-200 rounded-lg p-3 text-slate-700">
									{JSON.stringify(log.metadata, null, 2)}
								</pre>
							</div>
						) : null}

						{log.user_agent ? (
							<div>
								<p className="text-xs text-slate-500 mb-1">User agent</p>
								<p className="text-xs text-slate-600 break-all">
									{log.user_agent}
								</p>
							</div>
						) : null}

						<div className="pt-2">
							<Button
								variant="outline"
								className="primary-btn px-3 sm:px-4 w-full"
								onClick={() => onOpenChange(false)}
							>
								Close
							</Button>
						</div>
					</div>
				) : null}
			</SheetContent>
		</Sheet>
	);
}
