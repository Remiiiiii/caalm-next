"use client";

import { LayoutGrid, Table } from "lucide-react";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";

export type FilesViewType = "card" | "table";

interface FilesViewToggleProps {
	view: FilesViewType;
	onViewChange: (view: FilesViewType) => void;
}

export function FilesViewToggle({ view, onViewChange }: FilesViewToggleProps) {
	return (
		<SegmentedToggle
			value={view}
			onChange={onViewChange}
			ariaLabel="File views"
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
