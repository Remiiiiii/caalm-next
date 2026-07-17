"use client";

import { format } from "date-fns";
import { Filter } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
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
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { useApprovalsView } from "@/components/approvals/ApprovalsViewContext";
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
					size="sm"
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
					<div className="flex items-center gap-3">
						<Filter className="w-5 h-5 text-[#0f5384]" />
						<SheetTitle className="text-xl font-semibold sidebar-gradient-text">
							Filter approvals
						</SheetTitle>
					</div>
					<SheetDescription className="text-sm text-slate-600 ml-8">
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
						<Label className="text-slate-700 font-medium">Submitted</Label>
						<div className="grid grid-cols-2 gap-2">
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant="outline"
										size="sm"
										className="justify-start text-left font-normal bg-white cursor-pointer"
									>
										{filters.submittedFrom
											? format(filters.submittedFrom, "MMM dd, yyyy")
											: "From"}
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-auto p-0" align="start">
									<Calendar
										mode="single"
										selected={filters.submittedFrom}
										onSelect={(date) => updateFilter("submittedFrom", date)}
										initialFocus
									/>
								</PopoverContent>
							</Popover>
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant="outline"
										size="sm"
										className="justify-start text-left font-normal bg-white cursor-pointer"
									>
										{filters.submittedTo
											? format(filters.submittedTo, "MMM dd, yyyy")
											: "To"}
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-auto p-0" align="start">
									<Calendar
										mode="single"
										selected={filters.submittedTo}
										onSelect={(date) => updateFilter("submittedTo", date)}
										initialFocus
									/>
								</PopoverContent>
							</Popover>
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
							variant="outline"
							size="sm"
							onClick={() => clearFilters()}
							className="primary-btn px-3 sm:px-4 cursor-pointer"
							disabled={activeCount === 0 && !filters.searchQuery}
						>
							Clear all
						</Button>
						<Button
							size="sm"
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
