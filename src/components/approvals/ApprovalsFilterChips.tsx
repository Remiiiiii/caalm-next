"use client";

import { format } from "date-fns";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApprovalsView } from "@/components/approvals/ApprovalsViewContext";
import { countActiveApprovalFilters } from "@/lib/approvals/approvalsListUtils";

const TAB_LABELS: Record<string, string> = {
	"needs-me": "Needs me",
	"pending-review": "Pending review",
	"action-required": "Action required",
	"recently-decided": "Recently decided",
};

export default function ApprovalsFilterChips() {
	const { filters, setFilters, tab, setTab, clearFilters } = useApprovalsView();

	const chips: { key: string; label: string; onRemove: () => void }[] = [];

	if (tab !== "needs-me") {
		chips.push({
			key: "tab",
			label: TAB_LABELS[tab] || tab,
			onRemove: () => setTab("needs-me"),
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
	if (filters.itemType) {
		chips.push({
			key: "type",
			label: `Type: ${filters.itemType}`,
			onRemove: () => setFilters((prev) => ({ ...prev, itemType: undefined })),
		});
	}
	if (filters.submittedFrom || filters.submittedTo) {
		const from = filters.submittedFrom
			? format(filters.submittedFrom, "MMM d")
			: "…";
		const to = filters.submittedTo
			? format(filters.submittedTo, "MMM d")
			: "…";
		chips.push({
			key: "submitted",
			label: `Submitted: ${from} – ${to}`,
			onRemove: () =>
				setFilters((prev) => ({
					...prev,
					submittedFrom: undefined,
					submittedTo: undefined,
				})),
		});
	}

	const hasAny =
		chips.length > 0 ||
		countActiveApprovalFilters(filters) > 0 ||
		Boolean(filters.searchQuery) ||
		tab !== "needs-me";

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
