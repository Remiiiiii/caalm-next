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
	const dropFromList = (
		key: "status" | "contractType" | "department" | "assignedTo",
		value: string,
	) => {
		setFilters((prev) => {
			const next = (prev[key] || []).filter((item) => item !== value);
			return { ...prev, [key]: next.length > 0 ? next : undefined };
		});
	};

	for (const status of filters.status || []) {
		chips.push({
			key: `status-${status}`,
			label: `Status: ${status.replace("-", " ")}`,
			onRemove: () => dropFromList("status", status),
		});
	}
	for (const type of filters.contractType || []) {
		chips.push({
			key: `type-${type}`,
			label: `Type: ${type}`,
			onRemove: () => dropFromList("contractType", type),
		});
	}
	for (const dept of filters.department || []) {
		chips.push({
			key: `dept-${dept}`,
			label: `Dept: ${dept}`,
			onRemove: () => dropFromList("department", dept),
		});
	}
	for (const assignee of filters.assignedTo || []) {
		chips.push({
			key: `assignee-${assignee}`,
			label: `Assigned: ${assignee}`,
			onRemove: () => dropFromList("assignedTo", assignee),
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
					className="inline-flex items-center px-2 py-0.5 text-xs rounded-md font-medium border bg-blue/10 text-blue border-blue/20 gap-1"
				>
					{chip.label}
					<button
						type="button"
						onClick={chip.onRemove}
						className="ml-0.5 rounded-full p-0.5 hover:bg-blue/15 cursor-pointer transition-colors duration-200"
						aria-label={`Remove ${chip.label}`}
					>
						<X className="h-3 w-3" />
					</button>
				</Badge>
			))}
			<Button
				type="button"
				size="sm"
				className="btn-primary px-3 sm:px-4"
				onClick={clearFilters}
			>
				<X className="h-4 w-4" />
				Clear all
			</Button>
		</div>
	);
}
