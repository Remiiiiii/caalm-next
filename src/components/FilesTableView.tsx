"use client";

import { Checkbox } from "@/components/ui/checkbox";
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
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
} from "@/lib/ui/data-table-styles";
import { cn, convertFileSize } from "@/lib/utils";
import type { UIFileDoc } from "@/types/files";
import ActionDropdown from "./ActionDropdown";
import FormattedDateTime from "./FormattedDateTime";
import Thumbnail from "./Thumbnail";

interface FilesTableViewProps {
	files: UIFileDoc[];
	selectedIds: string[];
	onToggleSelected: (id: string) => void;
	onToggleSelectAll: (ids: string[]) => void;
	userRole?: "executive" | "admin" | "manager";
	onRefresh?: () => void;
}

export default function FilesTableView({
	files,
	selectedIds,
	onToggleSelected,
	onToggleSelectAll,
	userRole,
	onRefresh,
}: FilesTableViewProps) {
	const visibleIds = files.map((f) => f.$id);
	const allSelected =
		visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
	const someSelected =
		visibleIds.some((id) => selectedIds.includes(id)) && !allSelected;
	const rowPad = "px-3 py-3";

	return (
		<div className="w-full overflow-x-auto px-0 sm:px-0">
			<Table>
				<TableHeader>
					<TableRow className={DATA_TABLE_HEADER_ROW}>
						<TableHead className={cn(DATA_TABLE_HEADER_CELL, "w-12 pl-4 pr-2")}>
							<Checkbox
								checked={
									allSelected ? true : someSelected ? "indeterminate" : false
								}
								onCheckedChange={() => onToggleSelectAll(visibleIds)}
								aria-label="Select all files"
								className="cursor-pointer"
							/>
						</TableHead>
						<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
							Name
						</TableHead>
						<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
							Type
						</TableHead>
						<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
							Size
						</TableHead>
						<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
							Uploaded
						</TableHead>
						<TableHead
							className={cn(DATA_TABLE_HEADER_CELL, "pl-3 pr-4 text-right")}
						>
							Actions
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody className="[&_tr:last-child>td]:border-b-0">
					{files.map((file) => (
						<TableRow
							key={file.$id}
							className={cn(
								DATA_TABLE_BODY_ROW_BASE,
								"group",
								selectedIds.includes(file.$id) && "bg-blue-50/50",
							)}
						>
							<TableCell className={cn(rowPad, "pl-4 pr-2")}>
								<Checkbox
									checked={selectedIds.includes(file.$id)}
									onCheckedChange={() => onToggleSelected(file.$id)}
									aria-label={`Select ${file.name || "file"}`}
									className="cursor-pointer"
								/>
							</TableCell>
							<TableCell className={cn(rowPad)}>
								<div className="flex min-w-0 items-center gap-3">
									<Thumbnail
										type={file.type}
										extension={file.extension}
										url={file.url}
										className="size-10! shrink-0"
										imageClassName="!size-8"
									/>
									<p
										className="subtitle-2 max-w-60 truncate whitespace-nowrap text-slate-700"
										title={file.name || "Untitled"}
									>
										{file.name || "Untitled"}
									</p>
								</div>
							</TableCell>
							<TableCell
								className={cn(rowPad, "whitespace-nowrap text-slate-700")}
							>
								<span className="capitalize">
									{file.extension || file.type || "—"}
								</span>
							</TableCell>
							<TableCell
								className={cn(
									rowPad,
									"whitespace-nowrap tabular-nums text-slate-700",
								)}
							>
								{convertFileSize({ sizeInBytes: file.size || 0 })}
							</TableCell>
							<TableCell
								className={cn(rowPad, "whitespace-nowrap text-slate-700")}
							>
								<FormattedDateTime date={file.$createdAt} className="body-2" />
							</TableCell>
							<TableCell
								className={cn(rowPad, "pr-4 text-right")}
								onClick={(e) => e.stopPropagation()}
							>
								<div className="inline-flex justify-end">
									<ActionDropdown
										file={file}
										userRole={userRole}
										onRefresh={onRefresh}
									/>
								</div>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
