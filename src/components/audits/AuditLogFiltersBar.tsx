"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { AUDIT_CONTROL_TABS } from "@/lib/audits/types";

export interface AuditLogFilters {
	startDate: string;
	endDate: string;
	userId: string;
	action: string;
	status: string;
	search: string;
	module: string;
}

interface AuditLogFiltersBarProps {
	filters: AuditLogFilters;
	onChange: (key: keyof AuditLogFilters, value: string) => void;
	onClear: () => void;
}

export function AuditLogFiltersBar({
	filters,
	onChange,
	onClear,
}: AuditLogFiltersBarProps) {
	return (
		<Card className="glass-card mb-6">
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6">
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-3">
					<div>
						<label
							htmlFor="audit-start-date"
							className="text-xs font-medium text-slate-600"
						>
							Start date
						</label>
						<Input
							id="audit-start-date"
							type="date"
							value={filters.startDate}
							onChange={(e) => onChange("startDate", e.target.value)}
							className="shad-input mt-1"
						/>
					</div>
					<div>
						<label
							htmlFor="audit-end-date"
							className="text-xs font-medium text-slate-600"
						>
							End date
						</label>
						<Input
							id="audit-end-date"
							type="date"
							value={filters.endDate}
							onChange={(e) => onChange("endDate", e.target.value)}
							className="shad-input mt-1"
						/>
					</div>
					<div>
						<span className="text-xs font-medium text-slate-600">Module</span>
						<Select
							value={filters.module}
							onValueChange={(v) => onChange("module", v)}
						>
							<SelectTrigger className="shad-input mt-1">
								<SelectValue placeholder="All modules" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All modules</SelectItem>
								{AUDIT_CONTROL_TABS.map((tab) => (
									<SelectItem key={tab.id} value={tab.id}>
										{tab.label}
									</SelectItem>
								))}
								<SelectItem value="auth">Auth</SelectItem>
								<SelectItem value="system">System</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div>
						<span className="text-xs font-medium text-slate-600">Action</span>
						<Select
							value={filters.action}
							onValueChange={(v) => onChange("action", v)}
						>
							<SelectTrigger className="shad-input mt-1">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All actions</SelectItem>
								<SelectItem value="create">Create</SelectItem>
								<SelectItem value="update">Update</SelectItem>
								<SelectItem value="delete">Delete</SelectItem>
								<SelectItem value="sync_delete">Sync delete</SelectItem>
								<SelectItem value="restore">Restore</SelectItem>
								<SelectItem value="approval_decided">Approval</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div>
						<span className="text-xs font-medium text-slate-600">Status</span>
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
						<label
							htmlFor="audit-search"
							className="text-xs font-medium text-slate-600"
						>
							Search
						</label>
						<Input
							id="audit-search"
							value={filters.search}
							onChange={(e) => onChange("search", e.target.value)}
							className="shad-input mt-1"
							placeholder="Events, users, targets..."
						/>
					</div>
					<div className="flex items-end">
						<Button
							variant="outline"
							className="w-full primary-btn px-3 sm:px-4"
							onClick={onClear}
						>
							Clear filters
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
