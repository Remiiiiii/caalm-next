"use client";

import { Folder, LayoutGrid, Table } from "lucide-react";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";

export type FilesViewType = "folders" | "card" | "table";

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
					value: "folders",
					label: "Folder view",
					icon: Folder,
					hideLabel: true,
				},
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
