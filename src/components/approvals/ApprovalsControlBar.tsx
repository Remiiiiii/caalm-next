"use client";

import { useEffect, useState } from "react";
import ApprovalsFilter from "@/components/approvals/ApprovalsFilter";
import ApprovalsFilterChips from "@/components/approvals/ApprovalsFilterChips";
import ApprovalsSavedViews from "@/components/approvals/ApprovalsSavedViews";
import ApprovalsStatusTabs from "@/components/approvals/ApprovalsStatusTabs";
import { useApprovalsView } from "@/components/approvals/ApprovalsViewContext";
import { SearchField } from "@/components/ui/search-field";
import type { ApprovalQueueItem } from "@/lib/approvals/approvalsListUtils";

interface ApprovalsControlBarProps {
	items: ApprovalQueueItem[];
	departments?: string[];
	assignedManagers?: string[];
	itemTypes?: string[];
}

export default function ApprovalsControlBar({
	items,
	departments = [],
	assignedManagers = [],
	itemTypes = [],
}: ApprovalsControlBarProps) {
	const { filters, setFilters, listAnchorRef } = useApprovalsView();
	const [searchQuery, setSearchQuery] = useState(filters.searchQuery || "");

	useEffect(() => {
		setSearchQuery(filters.searchQuery || "");
	}, [filters.searchQuery]);

	useEffect(() => {
		const timeoutId = setTimeout(() => {
			setFilters((prev) => ({
				...prev,
				searchQuery: searchQuery.trim() || undefined,
			}));
		}, 300);
		return () => clearTimeout(timeoutId);
	}, [searchQuery, setFilters]);

	return (
		<div ref={listAnchorRef} className="w-full scroll-mt-4">
			<ApprovalsStatusTabs items={items} />
			<div className="flex pt-4 pb-3 px-4 sm:px-6 gap-3 justify-between flex-wrap">
				<SearchField
					placeholder="Search approvals..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					containerClassName="w-full sm:w-72 max-w-full"
				/>
				<div className="flex items-center gap-2 justify-end flex-wrap">
					<ApprovalsFilter
						departments={departments}
						assignedManagers={assignedManagers}
						itemTypes={itemTypes}
					/>
					<ApprovalsSavedViews />
				</div>
			</div>
			<ApprovalsFilterChips />
		</div>
	);
}
