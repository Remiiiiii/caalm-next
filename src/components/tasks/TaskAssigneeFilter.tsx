"use client";

import { Check, ChevronDown, Search, Users } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import Avatar from "@/components/ui/avatar";
import { DropdownScrollArea } from "@/components/ui/DropdownScrollArea";
import {
	DROPDOWN_ITEM_LABEL_CLASS,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
	TASK_DOCK_TRIGGER,
	TASK_FILTER_PILL_TRIGGER,
} from "./task-filter-pill";
import type { TaskPerson } from "./task-ui";

type DeptNode = {
	name: string;
	direct: TaskPerson[];
	divisions: Array<{ name: string; people: TaskPerson[] }>;
};

function buildDepartmentTree(people: TaskPerson[]): DeptNode[] {
	const byDept = new Map<string, TaskPerson[]>();
	for (const person of people) {
		const dept = (person.department || "Other").trim() || "Other";
		const list = byDept.get(dept) || [];
		list.push(person);
		byDept.set(dept, list);
	}

	return Array.from(byDept.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([name, members]) => {
			const byDivision = new Map<string, TaskPerson[]>();
			const direct: TaskPerson[] = [];
			for (const person of members) {
				const div = person.division?.trim();
				if (!div) {
					direct.push(person);
					continue;
				}
				const list = byDivision.get(div) || [];
				list.push(person);
				byDivision.set(div, list);
			}
			const divisions = Array.from(byDivision.entries())
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([divName, divPeople]) => ({
					name: divName,
					people: divPeople.sort((a, b) => a.name.localeCompare(b.name)),
				}));
			direct.sort((a, b) => a.name.localeCompare(b.name));
			return { name, direct, divisions };
		});
}

function PersonRow({
	person,
	selected,
	onSelect,
}: {
	person: TaskPerson;
	selected: boolean;
	onSelect: () => void;
}) {
	return (
		<DropdownMenuItem
			className="cursor-pointer gap-2"
			onSelect={(e) => {
				e.preventDefault();
				onSelect();
			}}
		>
			<Avatar
				name={person.name}
				userId={person.id}
				size="sm"
				imageUrl={person.imageUrl}
			/>
			<span
				className={cn("min-w-0 flex-1 truncate", DROPDOWN_ITEM_LABEL_CLASS)}
			>
				{person.name}
			</span>
			{selected ? (
				<Check className="h-4 w-4 shrink-0 text-[#0f5384]" aria-hidden />
			) : null}
		</DropdownMenuItem>
	);
}

function DepartmentIcon() {
	return (
		<Image
			src="/assets/icons/department.svg"
			alt=""
			width={16}
			height={16}
			className="shrink-0"
			aria-hidden
		/>
	);
}

/**
 * Nested assignee picker (department → division → people).
 * `mode="filter"` includes All / Unassigned; `mode="assign"` is for bulk assign.
 */
export function TaskAssigneeFilter({
	value,
	people,
	onChange,
	mode = "filter",
	triggerLabel,
	ariaLabel = "Filter by assignee",
	variant = "filter",
	open: openProp,
	onOpenChange,
}: {
	/** "" = all, "unassigned", or user id (filter). Assign mode uses user id or "" for unassigned. */
	value: string;
	people: TaskPerson[];
	onChange: (assigneeId: string) => void;
	mode?: "filter" | "assign";
	triggerLabel?: string;
	ariaLabel?: string;
	variant?: "filter" | "dock";
	/** Controlled open (e.g. bulk bar — only one menu at a time) */
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}) {
	const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
	const controlled = openProp !== undefined;
	const open = controlled ? openProp : uncontrolledOpen;
	const setOpen = (next: boolean) => {
		if (!controlled) setUncontrolledOpen(next);
		onOpenChange?.(next);
	};
	const [query, setQuery] = useState("");

	const selectedLabel = useMemo(() => {
		if (triggerLabel) return triggerLabel;
		if (mode === "assign") {
			if (!value) return "Assign to";
			return people.find((p) => p.id === value)?.name || "Assign to";
		}
		if (!value || value === "all") return "All assignees";
		if (value === "unassigned") return "Unassigned";
		return people.find((p) => p.id === value)?.name || "Assignee";
	}, [value, people, mode, triggerLabel]);

	const tree = useMemo(() => buildDepartmentTree(people), [people]);

	const searchHits = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return null;
		return people.filter(
			(p) =>
				p.name.toLowerCase().includes(q) ||
				(p.department || "").toLowerCase().includes(q) ||
				(p.division || "").toLowerCase().includes(q),
		);
	}, [people, query]);

	const select = (next: string) => {
		if (mode === "filter") {
			onChange(next === "all" ? "" : next);
		} else {
			onChange(next);
		}
		setOpen(false);
		setQuery("");
	};

	const isAll = mode === "filter" && (!value || value === "all");
	const isDock = variant === "dock";

	return (
		<DropdownMenu
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (!next) setQuery("");
			}}
		>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label={ariaLabel}
					className={isDock ? TASK_DOCK_TRIGGER : TASK_FILTER_PILL_TRIGGER}
				>
					<Users className="h-4 w-4 shrink-0 text-slate-600" aria-hidden />
					<span className="max-w-[9rem] truncate">{selectedLabel}</span>
					<ChevronDown
						className={cn(
							"h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform duration-200",
							open && "rotate-180",
						)}
						aria-hidden
					/>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-72 overflow-x-hidden p-0">
				<div className="border-b border-slate-200/80 p-2">
					<label className="flex h-9 items-center gap-2 rounded-md border-[0.25px] border-slate-300 bg-white px-2.5">
						<Search className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
						<input
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search people…"
							className="h-full w-full border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
							aria-label="Search people"
							onKeyDown={(e) => e.stopPropagation()}
						/>
					</label>
				</div>
				<DropdownScrollArea className="px-1 py-1">
					{searchHits ? (
						searchHits.length === 0 ? (
							<p className="px-3 py-4 text-center text-xs text-slate-500">
								No people match that search.
							</p>
						) : (
							searchHits.map((p) => (
								<PersonRow
									key={p.id}
									person={p}
									selected={value === p.id}
									onSelect={() => select(p.id)}
								/>
							))
						)
					) : (
						<>
							{mode === "filter" ? (
								<>
									<DropdownMenuItem
										className="cursor-pointer gap-2"
										onSelect={(e) => {
											e.preventDefault();
											select("all");
										}}
									>
										<span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-700">
											<Users className="h-3.5 w-3.5" aria-hidden />
										</span>
										<span className={cn("flex-1", DROPDOWN_ITEM_LABEL_CLASS)}>
											All assignees
										</span>
										{isAll ? (
											<Check className="h-4 w-4 text-[#0f5384]" aria-hidden />
										) : null}
									</DropdownMenuItem>
									<DropdownMenuItem
										className="cursor-pointer gap-2"
										onSelect={(e) => {
											e.preventDefault();
											select("unassigned");
										}}
									>
										<span className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-slate-300" />
										<span className={cn("flex-1", DROPDOWN_ITEM_LABEL_CLASS)}>
											Unassigned
										</span>
										{value === "unassigned" ? (
											<Check className="h-4 w-4 text-[#0f5384]" aria-hidden />
										) : null}
									</DropdownMenuItem>
									<DropdownMenuSeparator />
								</>
							) : (
								<>
									<DropdownMenuItem
										className="cursor-pointer gap-2"
										onSelect={(e) => {
											e.preventDefault();
											select("");
										}}
									>
										<span className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-slate-300" />
										<span className={cn("flex-1", DROPDOWN_ITEM_LABEL_CLASS)}>
											Unassigned
										</span>
									</DropdownMenuItem>
									<DropdownMenuSeparator />
								</>
							)}
							{tree.map((dept) => {
								const hasDivisions = dept.divisions.length > 0;
								const onlyDirect = !hasDivisions && dept.direct.length > 0;
								if (onlyDirect) {
									return (
										<DropdownMenuSub key={dept.name}>
											<DropdownMenuSubTrigger className="cursor-pointer gap-2">
												<DepartmentIcon />
												<span
													className={cn(
														"min-w-0 flex-1 truncate",
														DROPDOWN_ITEM_LABEL_CLASS,
													)}
												>
													{dept.name}
												</span>
												<span className="shrink-0 text-xs tabular-nums text-slate-500">
													{dept.direct.length}
												</span>
											</DropdownMenuSubTrigger>
											<DropdownMenuSubContent className="w-56 overflow-hidden p-1">
												<DropdownScrollArea maxHeightClassName="max-h-64">
													{dept.direct.map((p) => (
														<PersonRow
															key={p.id}
															person={p}
															selected={value === p.id}
															onSelect={() => select(p.id)}
														/>
													))}
												</DropdownScrollArea>
											</DropdownMenuSubContent>
										</DropdownMenuSub>
									);
								}

								if (hasDivisions) {
									return (
										<DropdownMenuSub key={dept.name}>
											<DropdownMenuSubTrigger className="cursor-pointer gap-2">
												<DepartmentIcon />
												<span
													className={cn(
														"min-w-0 flex-1 truncate",
														DROPDOWN_ITEM_LABEL_CLASS,
													)}
												>
													{dept.name}
												</span>
											</DropdownMenuSubTrigger>
											<DropdownMenuSubContent className="w-56 overflow-hidden p-1">
												<DropdownScrollArea maxHeightClassName="max-h-72">
													{dept.direct.map((p) => (
														<PersonRow
															key={p.id}
															person={p}
															selected={value === p.id}
															onSelect={() => select(p.id)}
														/>
													))}
													{dept.direct.length > 0 &&
													dept.divisions.length > 0 ? (
														<DropdownMenuSeparator />
													) : null}
													{dept.divisions.map((div) => (
														<DropdownMenuSub key={`${dept.name}:${div.name}`}>
															<DropdownMenuSubTrigger className="cursor-pointer gap-2">
																<DepartmentIcon />
																<span
																	className={cn(
																		"min-w-0 flex-1 truncate",
																		DROPDOWN_ITEM_LABEL_CLASS,
																	)}
																>
																	{div.name}
																</span>
																<span className="shrink-0 text-xs tabular-nums text-slate-500">
																	{div.people.length}
																</span>
															</DropdownMenuSubTrigger>
															<DropdownMenuSubContent className="w-56 overflow-hidden p-1">
																<DropdownScrollArea maxHeightClassName="max-h-64">
																	{div.people.map((p) => (
																		<PersonRow
																			key={p.id}
																			person={p}
																			selected={value === p.id}
																			onSelect={() => select(p.id)}
																		/>
																	))}
																</DropdownScrollArea>
															</DropdownMenuSubContent>
														</DropdownMenuSub>
													))}
												</DropdownScrollArea>
											</DropdownMenuSubContent>
										</DropdownMenuSub>
									);
								}

								return null;
							})}
							{tree.length === 0 ? (
								<p className="px-3 py-4 text-center text-xs text-slate-500">
									No people available.
								</p>
							) : null}
						</>
					)}
				</DropdownScrollArea>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
