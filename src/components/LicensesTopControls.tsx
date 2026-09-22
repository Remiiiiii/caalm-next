"use client";

import { useEffect, useState } from "react";
import { SearchField } from "@/components/ui/search-field";
import type { License } from "@/types/licenses";
import { useLicensesFilter } from "./LicensesView";

interface LicensesTopControlsProps {
	licenses: License[];
}

export default function LicensesTopControls(_props: LicensesTopControlsProps) {
	const { filters, setFilters } = useLicensesFilter();
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
		<div className="flex items-center gap-3 flex-wrap min-w-0 flex-1">
			<SearchField
				aria-label="Search licenses"
				placeholder="Search licenses..."
				value={searchQuery}
				onChange={(e) => setSearchQuery(e.target.value)}
				containerClassName="w-full min-w-0 max-w-xl"
			/>
		</div>
	);
}
