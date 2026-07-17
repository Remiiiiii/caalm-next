"use client";

import { format } from "date-fns";
import { Filter } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { CONTRACT_TYPES } from "@/components/contract-upload/constants";
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
							Filter contracts
						</SheetTitle>
					</div>
					<SheetDescription className="text-sm text-slate-600 ml-8">
						Refine your contract list
					</SheetDescription>
				</SheetHeader>

				<div className="flex-1 overflow-y-auto p-6 bg-slate-50">
					<div className="space-y-4">
						<div className="space-y-2">
							<Label className="text-slate-700 font-medium">Status</Label>
							<Select
								value={filters.status || "all"}
								onValueChange={(value) =>
									updateFilter("status", value === "all" ? undefined : value)
								}
							>
								<SelectTrigger className="bg-white">
									<SelectValue placeholder="All statuses" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All statuses</SelectItem>
									{CONTRACT_STATUS_OPTIONS.map((status) => (
										<SelectItem key={status.value} value={status.value}>
											{status.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label className="text-slate-700 font-medium">Type</Label>
							<Select
								value={filters.contractType || "all"}
								onValueChange={(value) =>
									updateFilter(
										"contractType",
										value === "all" ? undefined : value,
									)
								}
							>
								<SelectTrigger className="bg-white">
									<SelectValue placeholder="All types" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All types</SelectItem>
									{CONTRACT_TYPES.map((type) => (
										<SelectItem key={type} value={type}>
											{type}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label className="text-slate-700 font-medium">Uploaded On</Label>
							<div className="grid grid-cols-2 gap-2">
								<Popover>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className="justify-start text-left font-normal bg-white cursor-pointer"
											size="sm"
										>
											{filters.uploadedOnFrom
												? format(filters.uploadedOnFrom, "MMM dd, yyyy")
												: "From"}
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
										<Calendar
											mode="single"
											selected={filters.uploadedOnFrom}
											onSelect={(date) => updateFilter("uploadedOnFrom", date)}
											initialFocus
										/>
									</PopoverContent>
								</Popover>
								<Popover>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className="justify-start text-left font-normal bg-white cursor-pointer"
											size="sm"
										>
											{filters.uploadedOnTo
												? format(filters.uploadedOnTo, "MMM dd, yyyy")
												: "To"}
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
										<Calendar
											mode="single"
											selected={filters.uploadedOnTo}
											onSelect={(date) => updateFilter("uploadedOnTo", date)}
											initialFocus
										/>
									</PopoverContent>
								</Popover>
							</div>
						</div>

						<div className="space-y-2">
							<Label className="text-slate-700 font-medium">Expires On</Label>
							<div className="grid grid-cols-2 gap-2">
								<Popover>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className="justify-start text-left font-normal bg-white cursor-pointer"
											size="sm"
										>
											{filters.expiresOnFrom
												? format(filters.expiresOnFrom, "MMM dd, yyyy")
												: "From"}
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
										<Calendar
											mode="single"
											selected={filters.expiresOnFrom}
											onSelect={(date) => updateFilter("expiresOnFrom", date)}
											initialFocus
										/>
									</PopoverContent>
								</Popover>
								<Popover>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className="justify-start text-left font-normal bg-white cursor-pointer"
											size="sm"
										>
											{filters.expiresOnTo
												? format(filters.expiresOnTo, "MMM dd, yyyy")
												: "To"}
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
										<Calendar
											mode="single"
											selected={filters.expiresOnTo}
											onSelect={(date) => updateFilter("expiresOnTo", date)}
											initialFocus
										/>
									</PopoverContent>
								</Popover>
							</div>
						</div>

						<div className="space-y-2">
							<Label className="text-slate-700 font-medium">Department</Label>
							<Select
								value={filters.department || "all"}
								onValueChange={(value) =>
									updateFilter(
										"department",
										value === "all" ? undefined : value,
									)
								}
							>
								<SelectTrigger className="bg-white">
									<SelectValue placeholder="All departments" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All departments</SelectItem>
									{allDepartments.map((dept) => (
										<SelectItem key={dept} value={dept}>
											{dept}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label className="text-slate-700 font-medium">Assigned To</Label>
							<Select
								value={filters.assignedTo || "all"}
								onValueChange={(value) =>
									updateFilter(
										"assignedTo",
										value === "all" ? undefined : value,
									)
								}
							>
								<SelectTrigger className="bg-white">
									<SelectValue placeholder="All managers" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All managers</SelectItem>
									{allAssignedManagers.map((manager) => (
										<SelectItem key={manager} value={manager}>
											{manager}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
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
};

export default ContractsFilter;
