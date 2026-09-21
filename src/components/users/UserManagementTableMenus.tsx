"use client";

import {
	ArrowDown,
	ArrowDownAZ,
	ArrowUp,
	ArrowUpZA,
	Building2,
	CalendarClock,
	FunnelX,
	LogOut,
	ShieldCheck,
	Trash2,
	UserCheck,
} from "lucide-react";
import { useState } from "react";
import RoundedUnderlineTabs from "@/components/RoundedUnderlineTabs";
import { Button } from "@/components/ui/button";
import {
	AppDropdownMenuCheckboxItem,
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type UserTableDateRange = "all" | "today" | "last7days" | "last30days";
export type UserTableSortKey =
	| "fullName"
	| "email"
	| "roleName"
	| "assignedByName"
	| "assignedDate"
	| "lastActiveAt";
export type UserTableSortDirection = "asc" | "desc";
type FilterTab = "role" | "department" | "assignedBy" | "date";

const FILTER_TABS: Array<{ id: FilterTab; label: string }> = [
	{ id: "role", label: "Role" },
	{ id: "department", label: "Dept" },
	{ id: "assignedBy", label: "Assigner" },
	{ id: "date", label: "Date" },
];

const SORT_FIELDS: Array<{
	key: UserTableSortKey;
	label: string;
	kind: "alpha" | "time";
}> = [
	{ key: "fullName", label: "Full name", kind: "alpha" },
	{ key: "email", label: "Email", kind: "alpha" },
	{ key: "assignedDate", label: "Assigned date", kind: "time" },
	{ key: "lastActiveAt", label: "Last active", kind: "time" },
];

export function UserManagementFilterMenu({
	roles,
	departments,
	assigners,
	selectedRoles,
	selectedDepartments,
	selectedAssignedBy,
	dateRange,
	activeFilterCount,
	onToggleRole,
	onToggleDepartment,
	onToggleAssigner,
	onDateRangeChange,
	onClear,
}: {
	roles: string[];
	departments: string[];
	assigners: string[];
	selectedRoles: string[];
	selectedDepartments: string[];
	selectedAssignedBy: string[];
	dateRange: UserTableDateRange;
	activeFilterCount: number;
	onToggleRole: (role: string, checked: boolean) => void;
	onToggleDepartment: (department: string, checked: boolean) => void;
	onToggleAssigner: (assigner: string, checked: boolean) => void;
	onDateRangeChange: (range: UserTableDateRange) => void;
	onClear: () => void;
}) {
	const [tab, setTab] = useState<FilterTab>("role");

	return (
		<AppDropdownMenuContent align="end" className="w-80 p-0">
			<RoundedUnderlineTabs
				className="px-2 pt-1"
				aria-label="Filter categories"
				variant="bar"
				value={tab}
				onValueChange={(next) => setTab(next as FilterTab)}
				tabs={FILTER_TABS.map((item) => ({
					value: item.id,
					label: item.label,
				}))}
			/>

			<div className="max-h-64 overflow-y-auto p-1">
				{tab === "role" ? (
					<>
						<DropdownMenuLabel className="sidebar-gradient-text">
							Filter by role
						</DropdownMenuLabel>
						{roles.map((role) => (
							<AppDropdownMenuCheckboxItem
								icon={ShieldCheck}
								key={role}
								checked={selectedRoles.includes(role)}
								onCheckedChange={(checked) =>
									onToggleRole(role, Boolean(checked))
								}
							>
								{role}
							</AppDropdownMenuCheckboxItem>
						))}
					</>
				) : null}

				{tab === "department" ? (
					<>
						<DropdownMenuLabel className="sidebar-gradient-text">
							Filter by department
						</DropdownMenuLabel>
						{departments.map((department) => (
							<AppDropdownMenuCheckboxItem
								icon={Building2}
								key={department}
								checked={selectedDepartments.includes(department)}
								onCheckedChange={(checked) =>
									onToggleDepartment(department, Boolean(checked))
								}
							>
								{department}
							</AppDropdownMenuCheckboxItem>
						))}
					</>
				) : null}

				{tab === "assignedBy" ? (
					<>
						<DropdownMenuLabel className="sidebar-gradient-text">
							Filter by assigned by
						</DropdownMenuLabel>
						{assigners.map((assigner) => (
							<AppDropdownMenuCheckboxItem
								icon={UserCheck}
								key={assigner}
								checked={selectedAssignedBy.includes(assigner)}
								onCheckedChange={(checked) =>
									onToggleAssigner(assigner, Boolean(checked))
								}
							>
								{assigner}
							</AppDropdownMenuCheckboxItem>
						))}
					</>
				) : null}

				{tab === "date" ? (
					<>
						<DropdownMenuLabel className="sidebar-gradient-text">
							Assigned date
						</DropdownMenuLabel>
						<AppDropdownMenuCheckboxItem
							icon={UserCheck}
							checked={dateRange === "today"}
							onCheckedChange={() => onDateRangeChange("today")}
						>
							Today
						</AppDropdownMenuCheckboxItem>
						<AppDropdownMenuCheckboxItem
							icon={UserCheck}
							checked={dateRange === "last7days"}
							onCheckedChange={() => onDateRangeChange("last7days")}
						>
							Last 7 days
						</AppDropdownMenuCheckboxItem>
						<AppDropdownMenuCheckboxItem
							icon={UserCheck}
							checked={dateRange === "last30days"}
							onCheckedChange={() => onDateRangeChange("last30days")}
						>
							Last 30 days
						</AppDropdownMenuCheckboxItem>
						<AppDropdownMenuCheckboxItem
							icon={CalendarClock}
							checked={dateRange === "all"}
							onCheckedChange={() => onDateRangeChange("all")}
						>
							All dates
						</AppDropdownMenuCheckboxItem>
					</>
				) : null}
			</div>

			{activeFilterCount > 0 ? (
				<>
					<DropdownMenuSeparator />
					<AppDropdownMenuItem
						icon={FunnelX}
						onSelect={(event) => {
							event.preventDefault();
							onClear();
						}}
					>
						Clear filters
					</AppDropdownMenuItem>
				</>
			) : null}
		</AppDropdownMenuContent>
	);
}

export function UserManagementSortMenu({
	sortKey,
	direction,
	onSort,
}: {
	sortKey: UserTableSortKey;
	direction: UserTableSortDirection;
	onSort: (key: UserTableSortKey, direction: UserTableSortDirection) => void;
}) {
	return (
		<AppDropdownMenuContent align="end" className="w-72 p-1">
			{SORT_FIELDS.map((field) => {
				const active = sortKey === field.key;
				return (
					<div
						key={field.key}
						className={cn(
							"flex items-center justify-between gap-3 rounded-lg px-3 py-2",
							active && "bg-blue-50",
						)}
					>
						<p
							className={cn(
								"text-sm font-medium",
								active ? "text-[#0f5384]" : "text-slate-700",
							)}
						>
							{field.label}
						</p>
						<div className="flex items-center gap-1">
							<button
								type="button"
								aria-label={`${field.label} ${field.kind === "alpha" ? "A to Z" : "oldest first"}`}
								aria-pressed={active && direction === "asc"}
								onClick={() => onSort(field.key, "asc")}
								className={cn(
									"inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors duration-200",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
									active && direction === "asc"
										? "bg-white text-[#0f5384] shadow-sm"
										: "text-slate-400 hover:text-slate-700",
								)}
							>
								{field.kind === "alpha" ? (
									<ArrowDownAZ className="h-4 w-4" />
								) : (
									<ArrowDown className="h-4 w-4" />
								)}
							</button>
							<button
								type="button"
								aria-label={`${field.label} ${field.kind === "alpha" ? "Z to A" : "newest first"}`}
								aria-pressed={active && direction === "desc"}
								onClick={() => onSort(field.key, "desc")}
								className={cn(
									"inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors duration-200",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
									active && direction === "desc"
										? "bg-white text-[#0f5384] shadow-sm"
										: "text-slate-400 hover:text-slate-700",
								)}
							>
								{field.kind === "alpha" ? (
									<ArrowUpZA className="h-4 w-4" />
								) : (
									<ArrowUp className="h-4 w-4" />
								)}
							</button>
						</div>
					</div>
				);
			})}
		</AppDropdownMenuContent>
	);
}

export function UserManagementBulkBar({
	count,
	canAssignRoles,
	canManageUsers,
	onChangeRole,
	onRevokeSessions,
	onDelete,
}: {
	count: number;
	canAssignRoles: boolean;
	canManageUsers: boolean;
	onChangeRole: () => void;
	onRevokeSessions: () => void;
	onDelete: () => void;
}) {
	if (count <= 0) return null;

	return (
		<div className="flex items-center justify-between gap-3">
			<p className="text-sm text-slate-600">{count} selected</p>
			<div className="flex items-center justify-end gap-3">
				{canAssignRoles ? (
					<Button
						type="button"
						size="sm"
						className="primary-btn h-8 border-0 px-3 shadow-none sm:px-4"
						onClick={onChangeRole}
					>
						<ShieldCheck className="h-4 w-4" />
						Change role
					</Button>
				) : null}
				{canManageUsers ? (
					<Button
						type="button"
						size="sm"
						className="btn-primary h-8 border-0 px-3 shadow-none sm:px-4"
						onClick={onRevokeSessions}
					>
						<LogOut className="h-4 w-4" />
						Revoke sessions
					</Button>
				) : null}
				{canManageUsers ? (
					<Button
						type="button"
						size="sm"
						className="delete-btn h-8 px-3 sm:px-4"
						onClick={onDelete}
					>
						<Trash2 className="h-4 w-4" />
						Delete
					</Button>
				) : null}
			</div>
		</div>
	);
}
