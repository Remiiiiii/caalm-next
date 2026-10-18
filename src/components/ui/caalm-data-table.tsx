"use client";

/**
 * CAALM data-table design component.
 *
 * Canonical reference UI: Assign Tasks at `/team/tasks`
 * (`src/components/tasks/TasksDataTable.tsx`).
 *
 * Use this shell + `DATA_TABLE_*` tokens for every list table. Domain columns,
 * badges, and row actions layer on top — do not invent new header/row chrome.
 *
 * @example
 * ```tsx
 * <CaalmDataTable>
 *   <TableHeader className="[&_tr]:border-b-0">
 *     <TableRow className={DATA_TABLE_HEADER_ROW}>
 *       <SortableDataTableHead label="Name" active={…} onClick={…} />
 *       <TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>Status</TableHead>
 *     </TableRow>
 *   </TableHeader>
 *   <TableBody>
 *     <TableRow className={DATA_TABLE_BODY_ROW_CLICKABLE}>…</TableRow>
 *   </TableBody>
 * </CaalmDataTable>
 * ```
 */
import { ChevronsUpDown } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	DATA_TABLE_BODY_ROW_BASE,
	DATA_TABLE_BODY_ROW_CLICKABLE,
	DATA_TABLE_CELL,
	DATA_TABLE_CELL_FIRST,
	DATA_TABLE_CELL_LAST,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
} from "@/lib/ui/data-table-styles";
import { cn } from "@/lib/utils";

export {
	DATA_TABLE_BODY_ROW_BASE,
	DATA_TABLE_BODY_ROW_CLICKABLE,
	DATA_TABLE_CELL,
	DATA_TABLE_CELL_FIRST,
	DATA_TABLE_CELL_LAST,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
};

/** Scrollable shell matching Assign Tasks */
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

/** Empty / zero-results message inside a table card */
export function CaalmDataTableEmpty({
	title,
	description,
	className,
}: {
	title: string;
	description?: string;
	className?: string;
}) {
	return (
		<div className={cn("px-4 py-12 text-center", className)}>
			<p className="font-medium text-slate-700">{title}</p>
			{description ? (
				<p className="mt-1 text-sm text-slate-500">{description}</p>
			) : null}
		</div>
	);
}

/** Placeholder rows while a list table loads inside a glass card (not branded spinner) */
export function CaalmDataTableSkeleton({
	columns = 8,
	rows = 6,
	className,
}: {
	columns?: number;
	rows?: number;
	className?: string;
}) {
	return (
		<div role="status" aria-label="Loading table" aria-busy="true">
		<CaalmDataTable className={cn("pt-2", className)}>
			<TableHeader className="[&_tr]:border-b-0">
				<TableRow className={DATA_TABLE_HEADER_ROW}>
					{Array.from({ length: columns }).map((_, i) => (
						<TableHead
							key={`sk-h-${i}`}
							className={cn(
								DATA_TABLE_HEADER_CELL,
								"px-3",
								i === 0 && "pl-4 pr-2",
								i === columns - 1 && "pl-3 pr-4",
							)}
						>
							<Skeleton className="h-3.5 w-16" />
						</TableHead>
					))}
				</TableRow>
			</TableHeader>
			<TableBody className="[&_tr:last-child>td]:border-b-0">
				{Array.from({ length: rows }).map((_, row) => (
					<TableRow key={`sk-r-${row}`} className={DATA_TABLE_BODY_ROW_BASE}>
						{Array.from({ length: columns }).map((_, col) => (
							<TableCell
								key={`sk-c-${row}-${col}`}
								className={cn(
									DATA_TABLE_CELL,
									col === 0 && DATA_TABLE_CELL_FIRST,
									col === columns - 1 && DATA_TABLE_CELL_LAST,
								)}
							>
								<Skeleton
									className={cn(
										"h-4",
										col === 1 ? "w-40 max-w-full" : "w-16",
									)}
								/>
							</TableCell>
						))}
					</TableRow>
				))}
			</TableBody>
		</CaalmDataTable>
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
