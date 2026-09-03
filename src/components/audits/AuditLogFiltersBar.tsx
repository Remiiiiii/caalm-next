"use client";

import { FunnelX } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchField } from "@/components/ui/search-field";
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

function FieldBox({ children }: { children: ReactNode }) {
	return (
		<div className="mt-1 rounded-md border-[0.25px] border-slate-200 bg-white/70 px-3">
			{children}
		</div>
	);
}

export function AuditLogFiltersBar({
	filters,
	onChange,
	onClear,
}: AuditLogFiltersBarProps) {
	return (
		<div>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
				<div>
					<label
						htmlFor="audit-start-date"
						className="text-xs font-medium text-slate-600"
					>
						Start date
					</label>
					<FieldBox>
						<Input
							id="audit-start-date"
							type="date"
							value={filters.startDate}
							onChange={(e) => onChange("startDate", e.target.value)}
							className="shad-input"
						/>
					</FieldBox>
				</div>
				<div>
					<label
						htmlFor="audit-end-date"
						className="text-xs font-medium text-slate-600"
					>
						End date
					</label>
					<FieldBox>
						<Input
							id="audit-end-date"
							type="date"
							value={filters.endDate}
							onChange={(e) => onChange("endDate", e.target.value)}
							className="shad-input"
						/>
					</FieldBox>
				</div>
				<div>
					<span className="text-xs font-medium text-slate-600">Module</span>
					<FieldBox>
						<Select
							value={filters.module}
							onValueChange={(v) => onChange("module", v)}
						>
							<SelectTrigger className="shad-input">
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
					</FieldBox>
				</div>
				<div>
					<span className="text-xs font-medium text-slate-600">Action</span>
					<FieldBox>
						<Select
							value={filters.action}
							onValueChange={(v) => onChange("action", v)}
						>
							<SelectTrigger className="shad-input">
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
					</FieldBox>
				</div>
				<div>
					<span className="text-xs font-medium text-slate-600">Status</span>
					<FieldBox>
						<Select
							value={filters.status}
							onValueChange={(v) => onChange("status", v)}
						>
							<SelectTrigger className="shad-input">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All statuses</SelectItem>
								<SelectItem value="success">Success</SelectItem>
								<SelectItem value="failed">Failed</SelectItem>
								<SelectItem value="pending">Pending</SelectItem>
							</SelectContent>
						</Select>
					</FieldBox>
				</div>
				<div className="flex items-end">
					<Button
						variant="outline"
						className="w-full primary-btn px-3 sm:px-4"
						onClick={onClear}
					>
						<FunnelX className="h-4 w-4" />
						Clear filters
					</Button>
				</div>
			</div>
			<div className="mt-4">
				<label
					htmlFor="audit-search"
					className="text-xs font-medium text-slate-600"
				>
					Search
				</label>
				<SearchField
					id="audit-search"
					containerClassName="mt-1"
					value={filters.search}
					onChange={(e) => onChange("search", e.target.value)}
					placeholder="Events, users, targets..."
				/>
			</div>
		</div>
	);
}
