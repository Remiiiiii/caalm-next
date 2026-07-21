"use client";

import { format } from "date-fns";
import {
	AlertTriangle,
	CheckCircle,
	ChevronLeft,
	ChevronRight,
	Clock,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { AuditLogDetailDrawer } from "@/components/audits/AuditLogDetailDrawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type {
	AuditChangeDiff,
	AuditModule,
} from "@/lib/audits/audit-log.utils";

export interface AuditLog {
	event_id: string;
	event_title: string;
	action:
		| "create"
		| "update"
		| "delete"
		| "sync_delete"
		| "restore"
		| "approval_decided"
		| "export"
		| "login"
		| "logout";
	source: "caalm" | "outlook";
	user_id: string;
	user_name: string;
	user_email: string;
	ip_address?: string;
	user_agent?: string;
	reason?: string;
	status: "success" | "failed" | "pending";
	error_message?: string;
	metadata?: Record<string, unknown>;
	module?: AuditModule;
	target_type?: string;
	target_id?: string;
	target_label?: string;
	summary?: string;
	changes?: AuditChangeDiff[];
	correlation_id?: string;
	created_at: string;
}

function getStatusBadge(status: string) {
	switch (status) {
		case "success":
			return (
				<Badge className="bg-green/10 text-green border-green/20">
					<CheckCircle className="w-3 h-3 mr-1" />
					Success
				</Badge>
			);
		case "failed":
			return (
				<Badge className="bg-red/10 text-red border-red/20">
					<XCircle className="w-3 h-3 mr-1" />
					Failed
				</Badge>
			);
		default:
			return (
				<Badge className="bg-orange/10 text-orange border-orange/20">
					<Clock className="w-3 h-3 mr-1" />
					Pending
				</Badge>
			);
	}
}

function getActionBadge(action: string) {
	if (action === "delete" || action === "sync_delete") {
		return (
			<Badge variant="destructive" className="bg-red/10 text-red border-red/20">
				<AlertTriangle className="w-3 h-3 mr-1" />
				{action === "sync_delete" ? "Sync delete" : "Delete"}
			</Badge>
		);
	}
	return (
		<Badge variant="outline" className="capitalize">
			{action.replace("_", " ")}
		</Badge>
	);
}

function ModuleBadge({ module }: { module?: AuditModule }) {
	if (!module) return <span className="text-slate-500">—</span>;
	const colors: Record<string, string> = {
		regulatory: "bg-blue/10 text-blue border-blue/20",
		contracts: "bg-green/10 text-green border-green/20",
		licenses: "bg-orange/10 text-orange border-orange/20",
		documents: "bg-blue/10 text-[#0f5384] border-blue/20",
		governance: "bg-slate-100 text-slate-700 border-slate-200",
		auth: "bg-red/10 text-red border-red/20",
		system: "bg-slate-100 text-slate-600 border-slate-200",
	};
	return (
		<Badge
			variant="outline"
			className={`capitalize ${colors[module] || "bg-slate-100 text-slate-700"}`}
		>
			{module}
		</Badge>
	);
}

interface AuditLogTableProps {
	logs: AuditLog[];
	domainLabel?: string | null;
	total?: number;
	page?: number;
	totalPages?: number;
	onPageChange?: (page: number) => void;
	isLoading?: boolean;
}

export function AuditLogTable({
	logs,
	domainLabel,
	total = 0,
	page = 1,
	totalPages = 1,
	onPageChange,
	isLoading,
}: AuditLogTableProps) {
	const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
	const [drawerOpen, setDrawerOpen] = useState(false);

	const openDetails = (log: AuditLog) => {
		setSelectedLog(log);
		setDrawerOpen(true);
	};

	return (
		<>
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6">
					<div className="flex flex-wrap items-center justify-between gap-3 mb-4">
						<div className="flex items-center gap-2">
							<p className="text-xl font-semibold sidebar-gradient-text">
								Activity log
							</p>
							{domainLabel ? (
								<Badge
									variant="secondary"
									className="bg-slate-100 text-slate-700"
								>
									{domainLabel}
								</Badge>
							) : null}
							<Badge
								variant="secondary"
								className="bg-slate-100 text-slate-700"
							>
								{total} {total === 1 ? "entry" : "entries"}
							</Badge>
						</div>
						{onPageChange && totalPages > 1 ? (
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									className="cursor-pointer"
									disabled={page <= 1 || isLoading}
									onClick={() => onPageChange(page - 1)}
								>
									<ChevronLeft className="h-4 w-4" />
								</Button>
								<span className="text-xs text-slate-600">
									Page {page} of {totalPages}
								</span>
								<Button
									variant="outline"
									size="sm"
									className="cursor-pointer"
									disabled={page >= totalPages || isLoading}
									onClick={() => onPageChange(page + 1)}
								>
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>
						) : null}
					</div>

					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow className="border-slate-200 bg-slate-50">
									<TableHead>Date</TableHead>
									<TableHead>Source</TableHead>
									<TableHead>Action</TableHead>
									<TableHead>Module</TableHead>
									<TableHead>Target</TableHead>
									<TableHead>Details</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="w-[80px]" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{isLoading ? (
									Array.from({ length: 5 }).map((_, index) => (
										<TableRow key={`skeleton-${index}`}>
											{Array.from({ length: 8 }).map((__, cell) => (
												<TableCell key={`cell-${cell}`}>
													<div className="h-4 w-full max-w-[120px] bg-slate-200 rounded animate-pulse" />
												</TableCell>
											))}
										</TableRow>
									))
								) : logs.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={8}
											className="text-center py-12 text-slate-500"
										>
											No audit logs match your filters.
										</TableCell>
									</TableRow>
								) : (
									logs.map((log) => (
										<TableRow
											key={`${log.event_id}-${log.created_at}`}
											className="hover:bg-slate-50 transition-colors duration-200 cursor-pointer"
											onClick={() => openDetails(log)}
										>
											<TableCell className="text-sm text-slate-700 whitespace-nowrap">
												{log.created_at
													? format(
															new Date(log.created_at),
															"MMM d, yyyy HH:mm",
														)
													: "—"}
											</TableCell>
											<TableCell>
												<div className="text-sm font-medium text-slate-900">
													{log.user_name}
												</div>
												<div className="text-xs text-slate-500">
													{log.user_email}
												</div>
											</TableCell>
											<TableCell>{getActionBadge(log.action)}</TableCell>
											<TableCell>
												<ModuleBadge module={log.module} />
											</TableCell>
											<TableCell className="max-w-[160px]">
												<div className="text-sm text-slate-900 truncate">
													{log.target_label || log.event_title}
												</div>
												{log.target_type ? (
													<div className="text-xs text-slate-500 capitalize">
														{log.target_type}
													</div>
												) : null}
											</TableCell>
											<TableCell className="max-w-[240px]">
												<p className="text-sm text-slate-700 truncate">
													{log.summary || log.event_title}
												</p>
											</TableCell>
											<TableCell>{getStatusBadge(log.status)}</TableCell>
											<TableCell>
												<Button
													variant="ghost"
													size="sm"
													className="cursor-pointer text-[#0f5384]"
													onClick={(e) => {
														e.stopPropagation();
														openDetails(log);
													}}
												>
													Details
												</Button>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>

					{onPageChange && total > 0 ? (
						<div className="flex items-center justify-between mt-4 text-xs text-slate-600">
							<span>
								Showing{" "}
								{(page - 1) * (logs.length || 50) + (logs.length ? 1 : 0)}–
								{(page - 1) * 50 + logs.length} of {total}
							</span>
							{totalPages > 1 ? (
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										size="sm"
										className="cursor-pointer"
										disabled={page <= 1 || isLoading}
										onClick={() => onPageChange(page - 1)}
									>
										Previous
									</Button>
									<Button
										variant="outline"
										size="sm"
										className="cursor-pointer"
										disabled={page >= totalPages || isLoading}
										onClick={() => onPageChange(page + 1)}
									>
										Next
									</Button>
								</div>
							) : null}
						</div>
					) : null}
				</CardContent>
			</Card>

			<AuditLogDetailDrawer
				log={selectedLog}
				open={drawerOpen}
				onOpenChange={setDrawerOpen}
			/>
		</>
	);
}

export type { AuditLogFilters } from "@/components/audits/AuditLogFiltersBar";
