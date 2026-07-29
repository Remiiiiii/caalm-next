"use client";

import { format } from "date-fns";
import { X } from "lucide-react";
import { useLicensesView } from "@/components/LicensesView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	countActiveAdvancedLicenseFilters,
	LICENSE_STATUS_TAB_LABELS,
} from "@/lib/licenses/licensesListUtils";

export default function LicensesFilterChips() {
	const {
		filters,
		setFilters,
		statusTab,
		setStatusTab,
		clearFilters,
		lockDepartmentFilter,
	} = useLicensesView();

	const chips: {
		key: string;
		label: string;
		onRemove?: () => void;
	}[] = [];

	if (statusTab !== "all") {
		chips.push({
			key: "statusTab",
			label: LICENSE_STATUS_TAB_LABELS[statusTab] || statusTab,
			onRemove: () => setStatusTab("all"),
		});
	}
	if (filters.searchQuery) {
		chips.push({
			key: "search",
			label: `Search: ${filters.searchQuery}`,
			onRemove: () =>
				setFilters((prev) => ({ ...prev, searchQuery: undefined })),
		});
	}
	if (filters.status) {
		chips.push({
			key: "status",
			label: `Status: ${filters.status.replace("-", " ")}`,
			onRemove: () => setFilters((prev) => ({ ...prev, status: undefined })),
		});
	}
	if (filters.licenseType) {
		chips.push({
			key: "type",
			label: `Type: ${filters.licenseType.replace(/_/g, " ")}`,
			onRemove: () =>
				setFilters((prev) => ({ ...prev, licenseType: undefined })),
		});
	}
	if (filters.category) {
		chips.push({
			key: "category",
			label: `Category: ${filters.category.replace(/_/g, " ")}`,
			onRemove: () => setFilters((prev) => ({ ...prev, category: undefined })),
		});
	}
	if (filters.compliance) {
		chips.push({
			key: "compliance",
			label: `Compliance: ${filters.compliance.replace("-", " ")}`,
			onRemove: () =>
				setFilters((prev) => ({ ...prev, compliance: undefined })),
		});
	}
	if (filters.autoRenew !== undefined) {
		chips.push({
			key: "autoRenew",
			label: filters.autoRenew ? "Auto-renew on" : "Auto-renew off",
			onRemove: () => setFilters((prev) => ({ ...prev, autoRenew: undefined })),
		});
	}
	if (filters.issuingAuthority) {
		chips.push({
			key: "authority",
			label: `Authority: ${filters.issuingAuthority}`,
			onRemove: () =>
				setFilters((prev) => ({ ...prev, issuingAuthority: undefined })),
		});
	}
	if (filters.department) {
		chips.push({
			key: "dept",
			label: `Dept: ${filters.department}`,
			onRemove: lockDepartmentFilter
				? undefined
				: () =>
						setFilters((prev) => ({ ...prev, department: undefined })),
		});
	}
	if (filters.assignedTo) {
		chips.push({
			key: "assignee",
			label: `Assigned: ${filters.assignedTo}`,
			onRemove: () =>
				setFilters((prev) => ({ ...prev, assignedTo: undefined })),
		});
	}
	if (filters.issueDateFrom || filters.issueDateTo) {
		const from = filters.issueDateFrom
			? format(filters.issueDateFrom, "MMM d")
			: "…";
		const to = filters.issueDateTo ? format(filters.issueDateTo, "MMM d") : "…";
		chips.push({
			key: "issued",
			label: `Issued: ${from} – ${to}`,
			onRemove: () =>
				setFilters((prev) => ({
					...prev,
					issueDateFrom: undefined,
					issueDateTo: undefined,
				})),
		});
	}
	if (filters.expiryDateFrom || filters.expiryDateTo) {
		const from = filters.expiryDateFrom
			? format(filters.expiryDateFrom, "MMM d")
			: "…";
		const to = filters.expiryDateTo
			? format(filters.expiryDateTo, "MMM d")
			: "…";
		chips.push({
			key: "expires",
			label: `Expires: ${from} – ${to}`,
			onRemove: () =>
				setFilters((prev) => ({
					...prev,
					expiryDateFrom: undefined,
					expiryDateTo: undefined,
				})),
		});
	}

	const hasAny =
		chips.length > 0 ||
		countActiveAdvancedLicenseFilters(filters) > 0 ||
		Boolean(filters.searchQuery) ||
		statusTab !== "all";

	if (!hasAny || chips.length === 0) return null;

	return (
		<div className="px-4 sm:px-6 pb-3 flex flex-wrap items-center gap-2">
			{chips.map((chip) => (
				<Badge
					key={chip.key}
					variant="outline"
					className="pl-2.5 pr-1 py-1 gap-1 border-slate-200 bg-white text-slate-700 font-medium"
				>
					{chip.label}
					{chip.onRemove ? (
						<button
							type="button"
							aria-label={`Remove ${chip.label}`}
							className="rounded-full p-0.5 hover:bg-slate-100 cursor-pointer"
							onClick={chip.onRemove}
						>
							<X className="h-3 w-3" />
						</button>
					) : null}
				</Badge>
			))}
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className="h-7 text-xs text-slate-600 cursor-pointer"
				onClick={() => clearFilters()}
			>
				Clear all
			</Button>
		</div>
	);
}
