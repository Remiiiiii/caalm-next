"use client";

import { Filter, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useApprovalsView } from "@/components/approvals/ApprovalsViewContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	CaalmDatePicker,
	parseIsoDateLocal,
	toIsoDateLocal,
} from "@/components/ui/caalm-date-picker";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetHeaderIcon,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import {
	type ApprovalFilters,
	countActiveApprovalFilters,
} from "@/lib/approvals/approvalsListUtils";

interface ApprovalsFilterProps {
	departments?: string[];
	assignedManagers?: string[];
	itemTypes?: string[];
}

export default function ApprovalsFilter({
	departments = [],
	assignedManagers = [],
	itemTypes = [],
}: ApprovalsFilterProps) {
	const { filters, setFilters, clearFilters } = useApprovalsView();
	const [open, setOpen] = useState(false);

	const allDepartments = useMemo(
		() => Array.from(new Set(departments)).sort(),
		[departments],
	);
	const allManagers = useMemo(
		() => Array.from(new Set(assignedManagers)).sort(),
		[assignedManagers],
	);
	const allTypes = useMemo(
		() => Array.from(new Set(itemTypes)).sort(),
		[itemTypes],
	);

	const activeCount = countActiveApprovalFilters(filters);

	const updateFilter = (key: keyof ApprovalFilters, value: unknown) => {
		setFilters((prev) => ({
			...prev,
			[key]: value || undefined,
		}));
	};

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button
					variant="outline"
					className="primary-btn px-3 sm:px-4 cursor-pointer"
				>
					<Filter className="w-4 h-4" />
					<span className="hidden sm:inline">Filter</span>
					{activeCount > 0 && (
						<Badge
							variant="secondary"
							className="ml-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
						>
							{activeCount}
						</Badge>
					)}
				</Button>
			</SheetTrigger>
			<SheetContent
				side="right"
				className="w-full sm:max-w-md p-0 flex flex-col overflow-hidden border-l border-slate-200"
			>
				<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70" />
				<SheetHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 py-4 border-b border-slate-200 mt-4 px-6 text-left space-y-1">
					<div className="flex items-center gap-3 pr-10">
						<SheetHeaderIcon>
							<Filter className="h-5 w-5 text-[#0f5384]" />
						</SheetHeaderIcon>
						<SheetTitle className="text-xl font-semibold sidebar-gradient-text">
							Filter approvals
						</SheetTitle>
					</div>
					<SheetDescription className="text-sm text-slate-600 ml-14">
						Refine your decision queue
					</SheetDescription>
				</SheetHeader>

				<div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-4">
					<div className="space-y-2">
						<Label className="text-slate-700 font-medium">Department</Label>
						<Select
							value={filters.department || "all"}
							onValueChange={(v) =>
								updateFilter("department", v === "all" ? undefined : v)
							}
						>
							<SelectTrigger className="bg-white">
								<SelectValue placeholder="All departments" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All departments</SelectItem>
								{allDepartments.map((d) => (
									<SelectItem key={d} value={d}>
										{d}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label className="text-slate-700 font-medium">Assigned to</Label>
						<Select
							value={filters.assignedTo || "all"}
							onValueChange={(v) =>
								updateFilter("assignedTo", v === "all" ? undefined : v)
							}
						>
							<SelectTrigger className="bg-white">
								<SelectValue placeholder="All assignees" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All assignees</SelectItem>
								{allManagers.map((m) => (
									<SelectItem key={m} value={m}>
										{m}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label className="text-slate-700 font-medium">Type</Label>
						<Select
							value={filters.itemType || "all"}
							onValueChange={(v) =>
								updateFilter("itemType", v === "all" ? undefined : v)
							}
						>
							<SelectTrigger className="bg-white">
								<SelectValue placeholder="All types" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All types</SelectItem>
								{allTypes.map((t) => (
									<SelectItem key={t} value={t}>
										{t}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label className="text-slate-700 font-medium">SLA status</Label>
						<Select
							value={filters.slaStatus || "any"}
							onValueChange={(v) =>
								updateFilter("slaStatus", v === "any" ? undefined : v)
							}
						>
							<SelectTrigger className="border-[0.25px] border-slate-300 bg-white">
								<SelectValue placeholder="Any SLA status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="any">Any SLA status</SelectItem>
								<SelectItem value="at_risk">At risk</SelectItem>
								<SelectItem value="breached">SLA breached</SelectItem>
								<SelectItem value="on_track">On track</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label className="text-slate-700 font-medium">Submitted</Label>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
							<CaalmDatePicker
								size="sm"
								placeholder="From"
								value={
									filters.submittedFrom
										? toIsoDateLocal(filters.submittedFrom)
										: ""
								}
								onChange={(iso) =>
									updateFilter(
										"submittedFrom",
										iso ? parseIsoDateLocal(iso) : undefined,
									)
								}
								className="cursor-pointer"
							/>
							<CaalmDatePicker
								size="sm"
								placeholder="To"
								value={
									filters.submittedTo ? toIsoDateLocal(filters.submittedTo) : ""
								}
								onChange={(iso) =>
									updateFilter(
										"submittedTo",
										iso ? parseIsoDateLocal(iso) : undefined,
									)
								}
								className="cursor-pointer"
							/>
						</div>
					</div>
				</div>

				<div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
					<div className="text-xs text-slate-500">
						{activeCount > 0
							? `${activeCount} filter${activeCount > 1 ? "s" : ""} active`
							: "No filters applied"}
					</div>
					<div className="flex items-center gap-2">
						<Button
							size="sm"
							onClick={() => clearFilters()}
							className="btn-primary px-3 sm:px-4 cursor-pointer"
							disabled={activeCount === 0 && !filters.searchQuery}
						>
							<X className="h-4 w-4" />
							Clear all
						</Button>
						<Button
							className="primary-btn px-3 sm:px-4 cursor-pointer"
							onClick={() => setOpen(false)}
						>
							Done
						</Button>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
