"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
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
			<div className="relative w-full sm:w-72 max-w-full">
				<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
				<Input
					aria-label="Search licenses"
					placeholder="Search licenses..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="pl-9! w-full bg-white border-slate-200"
				/>
			</div>
		</div>
	);
}
