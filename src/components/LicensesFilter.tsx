"use client";

import { format } from "date-fns";
import { Filter } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
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
import {
	type LicenseFilters,
	countActiveAdvancedLicenseFilters,
} from "@/lib/licenses/licensesListUtils";
import { useLicensesFilter } from "./LicensesView";

const LICENSE_TYPES = [
	"perpetual",
	"subscription",
	"concurrent",
	"named_user",
	"certificate",
	"coi",
	"purchase_order",
];

const CATEGORIES = [
	"saas",
	"on_premise",
	"cloud",
	"certificate",
	"insurance",
	"other",
];

const COMPLIANCE_OPTIONS = [
	{ value: "compliant", label: "Compliant" },
	{ value: "at-risk", label: "At risk" },
	{ value: "non-compliant", label: "Non-compliant" },
	{ value: "action-required", label: "Action required" },
];

const LICENSE_STATUS_OPTIONS = [
	{ value: "active", label: "Active" },
	{ value: "inactive", label: "Inactive" },
	{ value: "expired", label: "Expired" },
	{ value: "pending-review", label: "Pending Review" },
	{ value: "suspended", label: "Suspended" },
	{ value: "action-required", label: "Action Required" },
];

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

interface LicensesFilterProps {
	departments?: string[];
	assignedManagers?: string[];
}

const LicensesFilter: React.FC<LicensesFilterProps> = ({
	departments = [],
	assignedManagers = [],
}) => {
	const { filters, setFilters, clearFilters } = useLicensesFilter();
	const [open, setOpen] = useState(false);

	const allDepartments = useMemo(() => {
		const uniqueDepts = new Set([...COMMON_DEPARTMENTS, ...departments]);
		return Array.from(uniqueDepts).sort();
	}, [departments]);

	const allAssignedManagers = useMemo(() => {
		return Array.from(new Set(assignedManagers)).sort();
	}, [assignedManagers]);

	const activeCount = countActiveAdvancedLicenseFilters(filters);

	const updateFilter = (key: keyof LicenseFilters, value: unknown) => {
		setFilters((prev) => ({
			...prev,
			[key]: value === "" || value === null ? undefined : value,
		}));
	};

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className="primary-btn px-3 sm:px-4 cursor-pointer"
					aria-label={
						activeCount > 0 ? `Filter, ${activeCount} active` : "Filter"
					}
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
							Filter licenses
						</SheetTitle>
					</div>
					<SheetDescription className="text-sm text-slate-600 ml-8">
						Refine your license list
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
									{LICENSE_STATUS_OPTIONS.map((status) => (
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
								value={filters.licenseType || "all"}
								onValueChange={(value) =>
									updateFilter(
										"licenseType",
										value === "all" ? undefined : value,
									)
								}
							>
								<SelectTrigger className="bg-white">
									<SelectValue placeholder="All types" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All types</SelectItem>
									{LICENSE_TYPES.map((type) => (
										<SelectItem key={type} value={type}>
											{type
												.replace(/_/g, " ")
												.replace(/\b\w/g, (l) => l.toUpperCase())}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label className="text-slate-700 font-medium">Category</Label>
							<Select
								value={filters.category || "all"}
								onValueChange={(value) =>
									updateFilter("category", value === "all" ? undefined : value)
								}
							>
								<SelectTrigger className="bg-white">
									<SelectValue placeholder="All categories" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All categories</SelectItem>
									{CATEGORIES.map((category) => (
										<SelectItem key={category} value={category}>
											{category
												.replace(/_/g, " ")
												.replace(/\b\w/g, (l) => l.toUpperCase())}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label className="text-slate-700 font-medium">Compliance</Label>
							<Select
								value={filters.compliance || "all"}
								onValueChange={(value) =>
									updateFilter(
										"compliance",
										value === "all" ? undefined : value,
									)
								}
							>
								<SelectTrigger className="bg-white">
									<SelectValue placeholder="All compliance" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All compliance</SelectItem>
									{COMPLIANCE_OPTIONS.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label className="text-slate-700 font-medium">Auto-renew</Label>
							<Select
								value={
									filters.autoRenew === undefined
										? "all"
										: filters.autoRenew
											? "yes"
											: "no"
								}
								onValueChange={(value) =>
									updateFilter(
										"autoRenew",
										value === "all" ? undefined : value === "yes",
									)
								}
							>
								<SelectTrigger className="bg-white">
									<SelectValue placeholder="Any" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Any</SelectItem>
									<SelectItem value="yes">Auto-renew on</SelectItem>
									<SelectItem value="no">Auto-renew off</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label className="text-slate-700 font-medium">
								Issuing authority
							</Label>
							<Input
								value={filters.issuingAuthority || ""}
								onChange={(e) =>
									updateFilter("issuingAuthority", e.target.value || undefined)
								}
								placeholder="Search authority…"
								className="bg-white"
							/>
						</div>

						<div className="space-y-2">
							<Label className="text-slate-700 font-medium">Issue date</Label>
							<div className="grid grid-cols-2 gap-2">
								<Popover>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className="justify-start text-left font-normal bg-white cursor-pointer"
											size="sm"
										>
											{filters.issueDateFrom
												? format(filters.issueDateFrom, "MMM dd, yyyy")
												: "From"}
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
										<Calendar
											mode="single"
											selected={filters.issueDateFrom}
											onSelect={(date) => updateFilter("issueDateFrom", date)}
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
											{filters.issueDateTo
												? format(filters.issueDateTo, "MMM dd, yyyy")
												: "To"}
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
										<Calendar
											mode="single"
											selected={filters.issueDateTo}
											onSelect={(date) => updateFilter("issueDateTo", date)}
											initialFocus
										/>
									</PopoverContent>
								</Popover>
							</div>
						</div>

						<div className="space-y-2">
							<Label className="text-slate-700 font-medium">Expiry date</Label>
							<div className="grid grid-cols-2 gap-2">
								<Popover>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className="justify-start text-left font-normal bg-white cursor-pointer"
											size="sm"
										>
											{filters.expiryDateFrom
												? format(filters.expiryDateFrom, "MMM dd, yyyy")
												: "From"}
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
										<Calendar
											mode="single"
											selected={filters.expiryDateFrom}
											onSelect={(date) => updateFilter("expiryDateFrom", date)}
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
											{filters.expiryDateTo
												? format(filters.expiryDateTo, "MMM dd, yyyy")
												: "To"}
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
										<Calendar
											mode="single"
											selected={filters.expiryDateTo}
											onSelect={(date) => updateFilter("expiryDateTo", date)}
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
							<Label className="text-slate-700 font-medium">Assigned to</Label>
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
					<div className="flex items-center gap-3">
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

export default LicensesFilter;
