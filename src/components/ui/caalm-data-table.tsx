"use client";

/**
 * Shared CAALM data-table chrome — same look as the contracts table.
 * Prefer these helpers over inventing new table header/row classes.
 */
import { ChevronsUpDown } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableHead } from "@/components/ui/table";
import {
	DATA_TABLE_BODY_ROW_BASE,
	DATA_TABLE_BODY_ROW_CLICKABLE,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
} from "@/lib/ui/data-table-styles";
import { cn } from "@/lib/utils";

export {
	DATA_TABLE_BODY_ROW_BASE,
	DATA_TABLE_BODY_ROW_CLICKABLE,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
};

/** Wrapper matching ContractsTableView table shell */
export function CaalmDataTable({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("w-full overflow-x-auto px-2 sm:px-4 pb-4", className)}>
			<Table className="border-separate border-spacing-0">{children}</Table>
		</div>
	);
}

export function SortableDataTableHead({
	label,
	active,
	onClick,
	className,
}: {
	label: string;
	active?: boolean;
	onClick: () => void;
	className?: string;
}) {
	return (
		<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3", className)}>
			<Button
				type="button"
				variant="ghost"
				onClick={onClick}
				className="h-auto cursor-pointer px-0 py-0 font-semibold sidebar-gradient-text hover:bg-transparent hover:opacity-80"
			>
				{label}
				<ChevronsUpDown
					className={cn(
						"ml-1.5 h-3.5 w-3.5",
						active ? "text-[#0f5384] opacity-100" : "opacity-40",
					)}
				/>
			</Button>
		</TableHead>
	);
}
