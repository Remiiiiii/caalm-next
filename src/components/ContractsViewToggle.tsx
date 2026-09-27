"use client";

import { LayoutGrid, Table } from "lucide-react";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { useContractsView } from "./ContractsView";

export function ContractsViewToggle() {
	const { view, handleViewChange } = useContractsView();

	return (
		<SegmentedToggle
			value={view}
			onChange={handleViewChange}
			ariaLabel="Contract views"
			tabs={[
				{
					value: "card",
					label: "Card view",
					icon: LayoutGrid,
					hideLabel: true,
				},
				{
					value: "table",
					label: "Table view",
					icon: Table,
					hideLabel: true,
				},
			]}
		/>
	);
}
