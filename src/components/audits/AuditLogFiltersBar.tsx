"use client";

import { CircleDot, FunnelX, Layers, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { CaalmFilterSelect } from "@/components/ui/CaalmFilterSelect";
import { Input } from "@/components/ui/input";
import { SearchField } from "@/components/ui/search-field";
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

const MODULE_OPTIONS = [
	{ value: "all", label: "All modules" },
	...AUDIT_CONTROL_TABS.map((tab) => ({ value: tab.id, label: tab.label })),
	{ value: "auth", label: "Auth" },
	{ value: "system", label: "System" },
];

const ACTION_OPTIONS = [
	{ value: "all", label: "All actions" },
	{ value: "create", label: "Create" },
	{ value: "update", label: "Update" },
	{ value: "delete", label: "Delete" },
	{ value: "sync_delete", label: "Sync delete" },
	{ value: "restore", label: "Restore" },
	{ value: "approval_decided", label: "Approval" },
	{ value: "view_pii", label: "PII view" },
];

const STATUS_OPTIONS = [
	{ value: "all", label: "All statuses" },
	{ value: "success", label: "Success" },
	{ value: "failed", label: "Failed" },
	{ value: "pending", label: "Pending" },
];

export function AuditLogFiltersBar({
	filters,
	onChange,
	onClear,
}: AuditLogFiltersBarProps) {
	return (
		<div>
			<div className="grid grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
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
					<div className="mt-1">
						<CaalmFilterSelect
							value={filters.module || "all"}
							options={MODULE_OPTIONS}
							ariaLabel="Filter by module"
							icon={Layers}
							onChange={(v) => onChange("module", v)}
						/>
					</div>
				</div>
				<div>
					<span className="text-xs font-medium text-slate-600">Action</span>
					<div className="mt-1">
						<CaalmFilterSelect
							value={filters.action || "all"}
							options={ACTION_OPTIONS}
							ariaLabel="Filter by action"
							icon={Zap}
							onChange={(v) => onChange("action", v)}
						/>
					</div>
				</div>
				<div>
					<span className="text-xs font-medium text-slate-600">Status</span>
					<div className="mt-1">
						<CaalmFilterSelect
							value={filters.status || "all"}
							options={STATUS_OPTIONS}
							ariaLabel="Filter by status"
							icon={CircleDot}
							onChange={(v) => onChange("status", v)}
						/>
					</div>
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
