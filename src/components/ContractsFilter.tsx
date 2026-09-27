"use client";

import { format } from "date-fns";
import { CalendarClock, ChevronDown, Filter, FunnelX } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { CONTRACT_TYPES } from "@/components/contract-upload/constants";
import RoundedUnderlineTabs from "@/components/RoundedUnderlineTabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	AppDropdownMenuTrigger,
	DropdownMenu,
	DropdownMenuLabel,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CONTRACT_STATUS_OPTIONS } from "@/constants/status";
import { countActiveAdvancedFilters } from "@/lib/contracts/contractsListUtils";
import {
	type ContractFilters,
	useContractsFilter,
} from "./ContractsViewContext";

const COMMON_DEPARTMENTS = [
	"IT",
	"Finance",
	"Administration",
	"Legal",
	"Operations",
	"Sales",
	"Marketing",
	"Executive",
	"Engineering",
	"HR",
	"Procurement",
];

type FilterTab = "status" | "type" | "dates" | "dept" | "assigned";
type DateField = keyof Pick<
	ContractFilters,
	"uploadedOnFrom" | "uploadedOnTo" | "expiresOnFrom" | "expiresOnTo"
>;

const FILTER_TABS: Array<{ id: FilterTab; label: string }> = [
	{ id: "status", label: "Status" },
	{ id: "type", label: "Type" },
	{ id: "dates", label: "Dates" },
	{ id: "dept", label: "Dept" },
	{ id: "assigned", label: "Assign" },
];

interface ContractsFilterProps {
	departments?: string[];
	assignedManagers?: string[];
}

const ContractsFilter: React.FC<ContractsFilterProps> = ({
	departments = [],
	assignedManagers = [],
}) => {
	const { filters, setFilters, clearFilters } = useContractsFilter();
	const [open, setOpen] = useState(false);
	const [tab, setTab] = useState<FilterTab>("status");
	const [picking, setPicking] = useState<DateField | null>(null);

	const allDepartments = useMemo(() => {
		const uniqueDepts = new Set([...COMMON_DEPARTMENTS, ...departments]);
		return Array.from(uniqueDepts).sort();
	}, [departments]);

	const allAssignedManagers = useMemo(() => {
		const uniqueManagers = new Set(assignedManagers);
		return Array.from(uniqueManagers).sort();
	}, [assignedManagers]);

	const activeCount = countActiveAdvancedFilters(filters);

	const updateFilter = (key: keyof ContractFilters, value: unknown) => {
		setFilters((prev) => ({
			...prev,
			[key]: value || undefined,
		}));
	};

	const toggleMany = (
		key: "status" | "contractType" | "department" | "assignedTo",
		value: string,
		checked: boolean,
	) => {
		setFilters((prev) => {
			const current = prev[key] ?? [];
			const next = checked
				? current.includes(value)
					? current
					: [...current, value]
				: current.filter((item) => item !== value);
			return {
				...prev,
				[key]: next.length > 0 ? next : undefined,
			};
		});
	};

	const isPicked = (
		key: "status" | "contractType" | "department" | "assignedTo",
		value: string,
	) => Boolean(filters[key]?.includes(value));

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<AppDropdownMenuTrigger
				asChild
				className="border-0 bg-transparent p-0 shadow-none ring-0 hover:bg-transparent data-[state=open]:bg-transparent"
			>
				<Button
					variant="ghost"
					size="sm"
					className="primary-btn h-8 border-0 px-3 shadow-none focus-visible:ring-0 sm:px-4"
				>
					<Filter className="h-4 w-4" />
					<span className="hidden sm:inline">Filter</span>
					{activeCount > 0 ? ` (${activeCount})` : ""}
					<ChevronDown className="h-4 w-4" />
				</Button>
			</AppDropdownMenuTrigger>
			<AppDropdownMenuContent
				align="end"
				className="w-80 p-0"
				onCloseAutoFocus={(event) => event.preventDefault()}
			>
				<RoundedUnderlineTabs
					className="px-2 pt-1"
					aria-label="Filter categories"
					variant="bar"
					value={tab}
					onValueChange={(next) => {
						setTab(next as FilterTab);
						setPicking(null);
					}}
					tabs={FILTER_TABS.map((item) => ({
						value: item.id,
						label: item.label,
					}))}
				/>

				<div
					className={
						tab === "dates"
							? "overflow-y-auto p-1"
							: "max-h-64 overflow-y-auto p-1"
					}
				>
					{tab === "status" ? (
						<>
							<DropdownMenuLabel className="sidebar-gradient-text">
								Filter by status
							</DropdownMenuLabel>
							<FilterCheckRow
								checked={!filters.status?.length}
								label="All statuses"
								onCheckedChange={() => updateFilter("status", undefined)}
							/>
							{CONTRACT_STATUS_OPTIONS.map((status) => (
								<FilterCheckRow
									key={status.value}
									checked={isPicked("status", status.value)}
									label={status.label}
									onCheckedChange={(checked) =>
										toggleMany("status", status.value, checked)
									}
								/>
							))}
						</>
					) : null}

					{tab === "type" ? (
						<>
							<DropdownMenuLabel className="sidebar-gradient-text">
								Filter by type
							</DropdownMenuLabel>
							<FilterCheckRow
								checked={!filters.contractType?.length}
								label="All types"
								onCheckedChange={() => updateFilter("contractType", undefined)}
							/>
							{CONTRACT_TYPES.map((type) => (
								<FilterCheckRow
									key={type}
									checked={isPicked("contractType", type)}
									label={type}
									onCheckedChange={(checked) =>
										toggleMany("contractType", type, checked)
									}
								/>
							))}
						</>
					) : null}

					{tab === "dates" ? (
						<div className="space-y-3 px-2 py-1">
							<DateRangeBlock
								label="Uploaded on"
								from={filters.uploadedOnFrom}
								to={filters.uploadedOnTo}
								fromKey="uploadedOnFrom"
								toKey="uploadedOnTo"
								picking={picking}
								onPick={setPicking}
								onChange={updateFilter}
							/>
							<DateRangeBlock
								label="Expires on"
								from={filters.expiresOnFrom}
								to={filters.expiresOnTo}
								fromKey="expiresOnFrom"
								toKey="expiresOnTo"
								picking={picking}
								onPick={setPicking}
								onChange={updateFilter}
							/>
						</div>
					) : null}

					{tab === "dept" ? (
						<>
							<DropdownMenuLabel className="sidebar-gradient-text">
								Filter by department
							</DropdownMenuLabel>
							<FilterCheckRow
								checked={!filters.department?.length}
								label="All departments"
								onCheckedChange={() => updateFilter("department", undefined)}
							/>
							{allDepartments.map((dept) => (
								<FilterCheckRow
									key={dept}
									checked={isPicked("department", dept)}
									label={dept}
									onCheckedChange={(checked) =>
										toggleMany("department", dept, checked)
									}
								/>
							))}
						</>
					) : null}

					{tab === "assigned" ? (
						<>
							<DropdownMenuLabel className="sidebar-gradient-text">
								Filter by assigned to
							</DropdownMenuLabel>
							<FilterCheckRow
								checked={!filters.assignedTo?.length}
								label="All managers"
								onCheckedChange={() => updateFilter("assignedTo", undefined)}
							/>
							{allAssignedManagers.map((manager) => (
								<FilterCheckRow
									key={manager}
									checked={isPicked("assignedTo", manager)}
									label={manager}
									onCheckedChange={(checked) =>
										toggleMany("assignedTo", manager, checked)
									}
								/>
							))}
						</>
					) : null}
				</div>

				{activeCount > 0 ? (
					<>
						<DropdownMenuSeparator />
						<AppDropdownMenuItem
							icon={FunnelX}
							onSelect={(event) => {
								event.preventDefault();
								clearFilters();
								setPicking(null);
							}}
						>
							Clear filters
						</AppDropdownMenuItem>
					</>
				) : null}
			</AppDropdownMenuContent>
		</DropdownMenu>
	);
};

function FilterCheckRow({
	checked,
	label,
	onCheckedChange,
}: {
	checked: boolean;
	label: string;
	onCheckedChange: (checked: boolean) => void;
}) {
	return (
		<div
			role="menuitemcheckbox"
			aria-checked={checked}
			tabIndex={0}
			className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-blue-50 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
			onPointerDown={(event) => {
				event.preventDefault();
				event.stopPropagation();
			}}
			onClick={() => onCheckedChange(!checked)}
			onKeyDown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					onCheckedChange(!checked);
				}
			}}
		>
			<Checkbox checked={checked} tabIndex={-1} className="pointer-events-none" />
			<span>{label}</span>
		</div>
	);
}

function DateRangeBlock({
	label,
	from,
	to,
	fromKey,
	toKey,
	picking,
	onPick,
	onChange,
}: {
	label: string;
	from?: Date;
	to?: Date;
	fromKey: DateField;
	toKey: DateField;
	picking: DateField | null;
	onPick: (field: DateField | null) => void;
	onChange: (key: keyof ContractFilters, value: unknown) => void;
}) {
	const activeKey = picking === fromKey || picking === toKey ? picking : null;
	const selected = activeKey === fromKey ? from : activeKey === toKey ? to : undefined;

	return (
		<div className="space-y-2">
			<DropdownMenuLabel className="px-0 sidebar-gradient-text">
				{label}
			</DropdownMenuLabel>
			<div className="grid grid-cols-2 gap-2">
				<DatePickButton
					label={from ? format(from, "MMM dd, yyyy") : "From"}
					active={picking === fromKey}
					onClick={() => onPick(picking === fromKey ? null : fromKey)}
				/>
				<DatePickButton
					label={to ? format(to, "MMM dd, yyyy") : "To"}
					active={picking === toKey}
					onClick={() => onPick(picking === toKey ? null : toKey)}
				/>
			</div>
			{activeKey ? (
				<div
					className="rounded-md border-[0.25px] border-slate-300 bg-white"
					onPointerDown={(event) => event.stopPropagation()}
				>
					<Calendar
						mode="single"
						selected={selected}
						onSelect={(date) => onChange(activeKey, date)}
						initialFocus
					/>
				</div>
			) : null}
		</div>
	);
}

function DatePickButton({
	label,
	active,
	onClick,
}: {
	label: string;
	active: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border-[0.25px] border-slate-300 bg-white px-2 text-left text-sm text-slate-700 hover:border-blue-300 focus-visible:border-[#078FAB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 ${
				active ? "border-blue-300" : ""
			}`}
		>
			<CalendarClock className="h-3.5 w-3.5 shrink-0 text-[#0f5384]" />
			<span className="truncate">{label}</span>
		</button>
	);
}

export default ContractsFilter;
