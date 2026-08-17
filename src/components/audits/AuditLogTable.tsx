"use client";

import { format } from "date-fns";
import { AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";
import { useState } from "react";
import { AuditLogDetailDrawer } from "@/components/audits/AuditLogDetailDrawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageIndex } from "@/components/ui/page-index";
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
	total?: number;
	page?: number;
	pageSize?: number;
	totalPages?: number;
	onPageChange?: (page: number) => void;
	isLoading?: boolean;
	embedded?: boolean;
}

export function AuditLogTable({
	logs,
	total = 0,
	page = 1,
	pageSize = 20,
	totalPages = 1,
	onPageChange,
	isLoading,
	embedded = false,
}: AuditLogTableProps) {
	const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
	const [drawerOpen, setDrawerOpen] = useState(false);

	const openDetails = (log: AuditLog) => {
		setSelectedLog(log);
		setDrawerOpen(true);
	};

	const safeTotalPages = Math.max(1, totalPages);

	const tableBody = (
		<>
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
												<div className="text-sm font-medium text-slate-700">
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
												<div className="text-sm text-slate-700 truncate">
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

					{onPageChange ? (
						<PageIndex
							className="mt-4"
							page={page}
							totalPages={safeTotalPages}
							totalItems={total}
							pageSize={pageSize}
							onPageChange={onPageChange}
							disabled={isLoading}
							showRange
							aria-label="Activity log pagination"
						/>
					) : null}
		</>
	);

	return (
		<>
			{embedded ? (
				<div className="mt-6">{tableBody}</div>
			) : (
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">{tableBody}</CardContent>
				</Card>
			)}

			<AuditLogDetailDrawer
				log={selectedLog}
				open={drawerOpen}
				onOpenChange={setDrawerOpen}
			/>
		</>
	);
}

export type { AuditLogFilters } from "@/components/audits/AuditLogFiltersBar";
