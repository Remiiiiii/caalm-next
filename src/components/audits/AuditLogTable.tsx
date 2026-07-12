"use client";

import { format } from "date-fns";
import {
	AlertTriangle,
	BarChart3,
	CheckCircle,
	ChevronDown,
	ChevronUp,
	Clock,
	Database,
	Download,
	Eye,
	EyeOff,
	Filter,
	RefreshCw,
	Search,
	User,
	XCircle,
} from "lucide-react";
import { Fragment, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { AuditControlDomain } from "@/lib/audits/types";

export interface AuditLog {
	event_id: string;
	event_title: string;
	action:
		| "create"
		| "update"
		| "delete"
		| "sync_delete"
		| "restore"
		| "approval_decided";
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
	created_at: string;
}

const DOMAIN_KEYWORDS: Record<AuditControlDomain, string[]> = {
	financial: ["financial", "revenue", "expense", "journal", "bank", "sox"],
	documents: ["document", "upload", "file", "evidence", "minutes"],
	administrative: ["admin", "policy", "training", "team", "role", "approval"],
	it: ["access", "login", "auth", "outlook", "calendar", "event", "sync"],
	vendor: ["vendor", "contract", "rfp", "procurement", "award"],
};

export function filterLogsByDomain(
	logs: AuditLog[],
	domain: AuditControlDomain | null,
): AuditLog[] {
	if (!domain) return logs;
	const keywords = DOMAIN_KEYWORDS[domain];
	return logs.filter((log) => {
		const title = log.event_title.toLowerCase();
		return keywords.some((kw) => title.includes(kw));
	});
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
	return <Badge variant="outline">{action}</Badge>;
}

interface AuditLogTableProps {
	logs: AuditLog[];
	domainLabel?: string | null;
}

export function AuditLogTable({ logs, domainLabel }: AuditLogTableProps) {
	const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

	const toggleRow = (eventId: string) => {
		setExpandedRows((prev) => {
			const next = new Set(prev);
			if (next.has(eventId)) next.delete(eventId);
			else next.add(eventId);
			return next;
		});
	};

	return (
		<Card className="glass-card">
			<div className="glass-card-cap" />
			<CardHeader className="pb-4">
				<CardTitle className="flex items-center gap-2 text-xl font-semibold sidebar-gradient-text">
					<BarChart3 className="w-5 h-5 text-[#0f5384]" />
					Audit logs
					{domainLabel ? (
						<Badge variant="secondary" className="ml-2 bg-slate-100 text-slate-700">
							{domainLabel}
						</Badge>
					) : null}
					<Badge variant="secondary" className="ml-2 bg-slate-100 text-slate-700">
						{logs.length} entries
					</Badge>
				</CardTitle>
			</CardHeader>
			<CardContent className="p-0 sm:px-6 sm:pb-6">
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow className="border-slate-200 bg-slate-50">
								<TableHead>Timestamp</TableHead>
								<TableHead>Event</TableHead>
								<TableHead>Action</TableHead>
								<TableHead>User</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Details</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{logs.length === 0 ? (
								<TableRow>
									<TableCell colSpan={6} className="text-center py-12 text-slate-500">
										No audit logs match your filters.
									</TableCell>
								</TableRow>
							) : (
								logs.map((log) => (
									<Fragment key={`${log.event_id}-${log.created_at}`}>
										<TableRow
											className="hover:bg-slate-50 transition-colors duration-200"
										>
											<TableCell className="text-sm text-slate-700">
												{format(new Date(log.created_at), "MMM d, yyyy HH:mm")}
											</TableCell>
											<TableCell className="font-medium text-slate-900 max-w-[220px] truncate">
												{log.event_title}
											</TableCell>
											<TableCell>{getActionBadge(log.action)}</TableCell>
											<TableCell>
												<div className="text-sm font-medium text-slate-900">
													{log.user_name}
												</div>
												<div className="text-xs text-slate-500">{log.user_email}</div>
											</TableCell>
											<TableCell>{getStatusBadge(log.status)}</TableCell>
											<TableCell>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => toggleRow(log.event_id)}
													className="cursor-pointer"
												>
													{expandedRows.has(log.event_id) ? (
														<EyeOff className="w-4 h-4" />
													) : (
														<Eye className="w-4 h-4" />
													)}
												</Button>
											</TableCell>
										</TableRow>
										{expandedRows.has(log.event_id) ? (
											<TableRow>
												<TableCell colSpan={6} className="bg-slate-50 p-4">
													<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">
														<div>
															<p>
																<span className="font-medium">Event ID:</span>{" "}
																{log.event_id}
															</p>
															<p>
																<span className="font-medium">Source:</span>{" "}
																{log.source}
															</p>
															<p>
																<span className="font-medium">IP:</span>{" "}
																{log.ip_address || "N/A"}
															</p>
														</div>
														<div>
															<p>
																<span className="font-medium">Reason:</span>{" "}
																{log.reason || "N/A"}
															</p>
															{log.error_message ? (
																<p className="text-red">{log.error_message}</p>
															) : null}
															{log.metadata ? (
																<pre className="mt-2 text-xs overflow-x-auto bg-white border border-slate-200 rounded p-2">
																	{JSON.stringify(log.metadata, null, 2)}
																</pre>
															) : null}
														</div>
													</div>
												</TableCell>
											</TableRow>
										) : null}
									</Fragment>
								))
							)}
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	);
}

export interface AuditLogFilters {
	startDate: string;
	endDate: string;
	userId: string;
	action: string;
	status: string;
	search: string;
}

interface AuditLogFiltersPanelProps {
	filters: AuditLogFilters;
	onChange: (key: keyof AuditLogFilters, value: string) => void;
	onClear: () => void;
	isOpen: boolean;
	onToggle: () => void;
}

export function AuditLogFiltersPanel({
	filters,
	onChange,
	onClear,
	isOpen,
	onToggle,
}: AuditLogFiltersPanelProps) {
	return (
		<Card className="glass-card mb-6">
			<div className="glass-card-cap" />
			<CardHeader className="pb-4">
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2 text-xl font-semibold sidebar-gradient-text">
						<Filter className="w-5 h-5 text-[#0f5384]" />
						Filters
					</CardTitle>
					<Button
						variant="ghost"
						size="sm"
						onClick={onToggle}
						className="cursor-pointer"
					>
						{isOpen ? (
							<>
								<ChevronUp className="w-4 h-4" /> Hide
							</>
						) : (
							<>
								<ChevronDown className="w-4 h-4" /> Show
							</>
						)}
					</Button>
				</div>
			</CardHeader>
			{isOpen ? (
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
						<div>
							<Label htmlFor="startDate">Start date</Label>
							<Input
								id="startDate"
								type="date"
								value={filters.startDate}
								onChange={(e) => onChange("startDate", e.target.value)}
								className="shad-input mt-1"
							/>
						</div>
						<div>
							<Label htmlFor="endDate">End date</Label>
							<Input
								id="endDate"
								type="date"
								value={filters.endDate}
								onChange={(e) => onChange("endDate", e.target.value)}
								className="shad-input mt-1"
							/>
						</div>
						<div>
							<Label>Action</Label>
							<Select
								value={filters.action}
								onValueChange={(v) => onChange("action", v)}
							>
								<SelectTrigger className="shad-input mt-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All actions</SelectItem>
									<SelectItem value="delete">Delete</SelectItem>
									<SelectItem value="sync_delete">Sync delete</SelectItem>
									<SelectItem value="create">Create</SelectItem>
									<SelectItem value="update">Update</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Status</Label>
							<Select
								value={filters.status}
								onValueChange={(v) => onChange("status", v)}
							>
								<SelectTrigger className="shad-input mt-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All statuses</SelectItem>
									<SelectItem value="success">Success</SelectItem>
									<SelectItem value="failed">Failed</SelectItem>
									<SelectItem value="pending">Pending</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label htmlFor="search">Search</Label>
							<div className="relative mt-1">
								<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
								<Input
									id="search"
									value={filters.search}
									onChange={(e) => onChange("search", e.target.value)}
									className="shad-input pl-10"
									placeholder="Search events..."
								/>
							</div>
						</div>
						<div className="flex items-end">
							<Button
								variant="outline"
								className="w-full primary-btn"
								onClick={onClear}
							>
								Clear filters
							</Button>
						</div>
					</div>
				</CardContent>
			) : null}
		</Card>
	);
}

export function AuditLogStatsRow({
	stats,
}: {
	stats?: {
		totalDeletions: number;
		successRate: number;
		failedSyncs: number;
		pendingSyncs: number;
	};
}) {
	if (!stats) return null;
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
			{[
				{ title: "Total deletions", value: stats.totalDeletions, icon: Database },
				{
					title: "Success rate",
					value: `${stats.successRate.toFixed(1)}%`,
					icon: CheckCircle,
				},
				{ title: "Failed syncs", value: stats.failedSyncs, icon: XCircle },
				{ title: "Pending syncs", value: stats.pendingSyncs, icon: Clock },
			].map((item) => (
				<Card key={item.title} className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<p className="text-sm font-medium sidebar-gradient-text">
							{item.title}
						</p>
						<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
							<span>{item.value}</span>
							<item.icon className="h-8 w-8 text-slate-600 ml-2" />
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
