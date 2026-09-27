"use client";

import { LayoutGrid, Table } from "lucide-react";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { useLicensesView } from "./LicensesView";

export function LicensesViewToggle() {
	const { view, handleViewChange } = useLicensesView();

	return (
		<SegmentedToggle
			value={view}
			onChange={handleViewChange}
			ariaLabel="License views"
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
