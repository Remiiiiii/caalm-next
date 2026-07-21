"use client";

import { format } from "date-fns";
import { X } from "lucide-react";
import { useContractsView } from "@/components/ContractsViewContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { countActiveAdvancedFilters } from "@/lib/contracts/contractsListUtils";

const STATUS_TAB_LABELS: Record<string, string> = {
	active: "Active",
	pending: "Pending",
	expiring: "Expiring soon",
	expired: "Expired",
};

export default function ContractsFilterChips() {
	const { filters, setFilters, statusTab, setStatusTab, clearFilters } =
		useContractsView();

	const chips: { key: string; label: string; onRemove: () => void }[] = [];

	if (statusTab !== "all") {
		chips.push({
			key: "statusTab",
			label: STATUS_TAB_LABELS[statusTab] || statusTab,
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
	if (filters.contractType) {
		chips.push({
			key: "type",
			label: `Type: ${filters.contractType}`,
			onRemove: () =>
				setFilters((prev) => ({ ...prev, contractType: undefined })),
		});
	}
	if (filters.department) {
		chips.push({
			key: "dept",
			label: `Dept: ${filters.department}`,
			onRemove: () =>
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
	if (filters.uploadedOnFrom || filters.uploadedOnTo) {
		const from = filters.uploadedOnFrom
			? format(filters.uploadedOnFrom, "MMM d")
			: "…";
		const to = filters.uploadedOnTo
			? format(filters.uploadedOnTo, "MMM d")
			: "…";
		chips.push({
			key: "uploaded",
			label: `Uploaded: ${from} – ${to}`,
			onRemove: () =>
				setFilters((prev) => ({
					...prev,
					uploadedOnFrom: undefined,
					uploadedOnTo: undefined,
				})),
		});
	}
	if (filters.expiresOnFrom || filters.expiresOnTo) {
		const from = filters.expiresOnFrom
			? format(filters.expiresOnFrom, "MMM d")
			: "…";
		const to = filters.expiresOnTo ? format(filters.expiresOnTo, "MMM d") : "…";
		chips.push({
			key: "expires",
			label: `Expires: ${from} – ${to}`,
			onRemove: () =>
				setFilters((prev) => ({
					...prev,
					expiresOnFrom: undefined,
					expiresOnTo: undefined,
				})),
		});
	}

	const hasAny =
		chips.length > 0 ||
		countActiveAdvancedFilters(filters) > 0 ||
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
					<button
						type="button"
						onClick={chip.onRemove}
						className="ml-0.5 rounded-full p-0.5 hover:bg-slate-100 cursor-pointer transition-colors duration-200"
						aria-label={`Remove ${chip.label}`}
					>
						<X className="h-3 w-3" />
					</button>
				</Badge>
			))}
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className="h-7 text-xs text-slate-600 hover:text-[#0f5384] cursor-pointer"
				onClick={clearFilters}
			>
				Clear all
			</Button>
		</div>
	);
}
