"use client";

import { Folder } from "lucide-react";
import {
	CaalmDataTable,
	CaalmDataTableEmpty,
	DATA_TABLE_BODY_ROW_CLICKABLE,
	DATA_TABLE_CELL,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
	DATA_TABLE_PRIMARY_TITLE,
} from "@/components/ui/caalm-data-table";
import { Checkbox } from "@/components/ui/checkbox";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { FileFolderGroup } from "@/lib/files/folder-groups";
import { cn } from "@/lib/utils";
import { FormattedDateTime } from "./FormattedDateTime";

interface FilesFolderTableViewProps {
	groups: FileFolderGroup[];
	selectedDepartments: string[];
	onToggleSelected: (department: string) => void;
	onToggleSelectAll: (departments: string[]) => void;
	onOpenFolder: (department: string) => void;
}

/**
 * Department-level "folder table" that fronts /documents (and every other
 * /[type] file route) before a user drills into one department's actual
 * files. Selection here is visual parity with the screenshot this was built
 * from only — it isn't wired to any bulk action yet, since "delete/move a
 * whole department" isn't a defined operation. Wire it up once one is.
 */
export default function FilesFolderTableView({
	groups,
	selectedDepartments,
	onToggleSelected,
	onToggleSelectAll,
	onOpenFolder,
}: FilesFolderTableViewProps) {
	const allDepartments = groups.map((g) => g.department);
	const allSelected =
		allDepartments.length > 0 &&
		allDepartments.every((d) => selectedDepartments.includes(d));
	const someSelected =
		allDepartments.some((d) => selectedDepartments.includes(d)) && !allSelected;

	if (groups.length === 0) {
		return (
			<CaalmDataTableEmpty
				title="No folders yet"
				description="Files will be grouped here by department once they're uploaded."
			/>
		);
	}

	return (
		<CaalmDataTable>
			<TableHeader className="[&_tr]:border-b-0">
				<TableRow className={DATA_TABLE_HEADER_ROW}>
					<TableHead className={cn(DATA_TABLE_HEADER_CELL, "w-12 pl-4 pr-2")}>
						<Checkbox
							checked={
								allSelected ? true : someSelected ? "indeterminate" : false
							}
							onCheckedChange={() => onToggleSelectAll(allDepartments)}
							aria-label="Select all folders"
						/>
					</TableHead>
					<TableHead className={DATA_TABLE_HEADER_CELL}>Name</TableHead>
					<TableHead className={DATA_TABLE_HEADER_CELL}>Modified</TableHead>
					<TableHead className={DATA_TABLE_HEADER_CELL}>By</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{groups.map((group) => (
					<TableRow
						key={group.department}
						className={DATA_TABLE_BODY_ROW_CLICKABLE}
						onClick={() => onOpenFolder(group.department)}
					>
						<TableCell
							className={cn(DATA_TABLE_CELL, "pl-4 pr-2")}
							onClick={(e) => e.stopPropagation()}
						>
							<Checkbox
								checked={selectedDepartments.includes(group.department)}
								onCheckedChange={() => onToggleSelected(group.department)}
								aria-label={`Select ${group.department}`}
							/>
						</TableCell>
						<TableCell className={DATA_TABLE_CELL}>
							<div className="flex items-center gap-2">
								<Folder
									className="h-4 w-4 shrink-0 text-[#078fab]"
									aria-hidden
								/>
								<span className={DATA_TABLE_PRIMARY_TITLE}>
									{group.department}
								</span>
								<span className="text-xs text-slate-400">({group.count})</span>
							</div>
						</TableCell>
						<TableCell className={DATA_TABLE_CELL}>
							{group.lastModifiedAt ? (
								<FormattedDateTime date={group.lastModifiedAt} />
							) : (
								<span className="text-slate-400">—</span>
							)}
						</TableCell>
						<TableCell className={DATA_TABLE_CELL}>
							{group.lastModifiedBy}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</CaalmDataTable>
	);
}
