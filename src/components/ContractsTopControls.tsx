"use client";

import { useEffect, useState } from "react";
import { SearchField } from "@/components/ui/search-field";
import type { UIFileDoc } from "@/types/files";
import { useContractsFilter } from "./ContractsViewContext";

interface ContractsTopControlsProps {
	files: UIFileDoc[];
	departments?: string[];
	assignedManagers?: string[];
}

export default function ContractsTopControls(
	_props: ContractsTopControlsProps,
) {
	const { filters, setFilters } = useContractsFilter();
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
				aria-label="Search contracts"
				placeholder="Search contracts..."
				value={searchQuery}
				onChange={(e) => setSearchQuery(e.target.value)}
				containerClassName="w-full min-w-0 max-w-xl"
			/>
		</div>
	);
}
