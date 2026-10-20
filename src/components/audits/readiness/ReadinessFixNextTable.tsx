"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
	ASSIGN_SIZE,
	TaskAssigneePicker,
} from "@/components/tasks/TaskAssigneePicker";
import type { TaskPerson } from "@/components/tasks/task-ui";
import Avatar from "@/components/ui/avatar";
import {
	CaalmDataTable,
	CaalmDataTableEmpty,
	DATA_TABLE_BODY_ROW_BASE,
	DATA_TABLE_CELL,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
} from "@/components/ui/caalm-data-table";
import { Card, CardContent } from "@/components/ui/card";
import { PageIndex } from "@/components/ui/page-index";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { LookedUpUser } from "@/hooks/useUsersByIds";
import { cn } from "@/lib/utils";
import { GlossaryTerm } from "./GlossaryTerm";
import {
	formatDay,
	NEUTRAL_PILL,
	PILL,
	RAG_PILL,
	REQUIREMENT_LABELS,
	SEVERITY_LABEL,
	SEVERITY_PILL,
} from "./readiness-ui";
import type { ReadinessInsight } from "./types";

const PAGE_SIZE = 12;
const SEVERITY_ORDER: Record<string, number> = {
	critical: 0,
	moderate: 1,
	low: 2,
};
const KIND_LABEL: Record<string, string> = {
	contract: "Contract",
	license: "License",
	other: "Item",
};

function sortInsights(rows: ReadinessInsight[]): ReadinessInsight[] {
	return [...rows].sort((a, b) => {
		const bySeverity =
			(SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3);
		if (bySeverity !== 0) return bySeverity;
		const aDue = a.dueDate ? Date.parse(a.dueDate) : Number.POSITIVE_INFINITY;
		const bDue = b.dueDate ? Date.parse(b.dueDate) : Number.POSITIVE_INFINITY;
		return (
			(Number.isNaN(aDue) ? Infinity : aDue) -
			(Number.isNaN(bDue) ? Infinity : bDue)
		);
	});
}

/** Same photo size and name style as the Assigned to picker, which is the source of truth. */
function PersonName({ user }: { user: LookedUpUser }) {
	return (
		<span className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
			<Avatar
				name={user.fullName}
				userId={user.$id}
				size={ASSIGN_SIZE}
				imageUrl={user.imageUrl}
			/>
			{user.fullName}
		</span>
	);
}

/** Assigned to = the record's managers, the same field /contracts shows and edits. */
function AssigneeCell({
	row,
	users,
	people,
	editable,
	onAssign,
}: {
	row: ReadinessInsight;
	users: Map<string, LookedUpUser>;
	people: TaskPerson[];
	editable: boolean;
	onAssign?: (row: ReadinessInsight, accountId: string | null) => void;
}) {
	const managers = row.assignedManagers ?? [];
	const first = managers[0];
	const person = first ? users.get(first) : undefined;
	const extra = managers.length > 1 ? ` +${managers.length - 1}` : "";

	if (editable && onAssign) {
		const currentId = person?.accountId ?? first;
		// The picker reads photos from `people`; make sure the current assignee has theirs.
		const pickerPeople = person
			? people.some((entry) => entry.id === currentId)
				? people.map((entry) =>
						entry.id === currentId && !entry.imageUrl
							? { ...entry, imageUrl: person.imageUrl }
							: entry,
					)
				: [
						{
							id: currentId,
							name: person.fullName,
							imageUrl: person.imageUrl,
						},
						...people,
					]
			: people;
		return (
			<span className="inline-flex items-center gap-1">
				<TaskAssigneePicker
					assigneeId={currentId}
					assigneeName={person?.fullName}
					people={pickerPeople}
					showName
					onChange={(accountId) => onAssign(row, accountId)}
				/>
				{extra ? <span className="caption text-slate-500">{extra}</span> : null}
			</span>
		);
	}
	if (!first) return <span className="text-slate-500">Unassigned</span>;
	return (
		<span className="inline-flex items-center gap-1">
			{person ? <PersonName user={person} /> : <span>Assigned</span>}
			{extra ? <span className="caption text-slate-500">{extra}</span> : null}
		</span>
	);
}

export function ReadinessFixNextTable({
	insights,
	users = new Map(),
	canAssign,
	people = [],
	onAssign,
}: {
	insights: ReadinessInsight[];
	/** People for the ids stored on records, keyed by account id and document id. */
	users?: Map<string, LookedUpUser>;
	/** Whether the viewer may reassign each kind of record (same gate as /contracts). */
	canAssign?: { contract: boolean; license: boolean };
	/** Directory keyed by account id, the id contracts and licenses store managers by. */
	people?: TaskPerson[];
	onAssign?: (row: ReadinessInsight, accountId: string | null) => void;
}) {
	const [page, setPage] = useState(1);
	const rows = useMemo(() => sortInsights(insights), [insights]);
	const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	return (
		<Card className="glass-card h-full">
			<div className="glass-card-cap" />
			<CardContent className="p-4 text-slate-700 sm:p-6">
				<div className="flex flex-wrap items-baseline justify-between gap-2">
					<div>
						<p className="h5 sidebar-gradient-text">Fix next</p>
						<p className="caption text-slate-500">
							Ranked by severity, then due date
						</p>
					</div>
					<Link
						href="/contracts"
						className="rounded-sm text-sm font-medium text-[#078FAB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB]"
					>
						View all in Contracts →
					</Link>
				</div>

				{rows.length === 0 ? (
					<CaalmDataTableEmpty
						title="Nothing to fix right now"
						description="New items appear here when a contract or license needs attention."
					/>
				) : (
					<CaalmDataTable className="pb-0 pt-4">
						<TableHeader className="[&_tr]:border-b-0">
							<TableRow className={DATA_TABLE_HEADER_ROW}>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3 pl-4")}>
									Item
								</TableHead>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
									Severity
								</TableHead>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
									Requirements
								</TableHead>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
									Due
								</TableHead>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
									Assigned to
								</TableHead>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3 pr-4")}>
									Assigned by
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody className="[&_tr:last-child>td]:border-b-0">
							{pageRows.map((row) => (
								<TableRow key={row.id} className={DATA_TABLE_BODY_ROW_BASE}>
									<TableCell
										className={cn(DATA_TABLE_CELL, "max-w-[22rem] pl-4")}
									>
										<div className="flex flex-col">
											<Link
												href={row.moduleLink}
												className="font-semibold text-[#0f5384] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB]"
											>
												{row.itemTitle ?? row.title}
											</Link>
											<span className="caption text-slate-500">
												{[
													KIND_LABEL[row.itemKind ?? ""] ?? row.moduleLabel,
													row.category,
													row.owner,
												]
													.filter(Boolean)
													.join(" · ")}
											</span>
										</div>
									</TableCell>
									<TableCell className={DATA_TABLE_CELL}>
										<span
											className={cn(
												PILL,
												"whitespace-nowrap",
												row.isEvidenceGap
													? RAG_PILL.amber
													: (SEVERITY_PILL[row.severity] ?? NEUTRAL_PILL),
											)}
										>
											{row.isEvidenceGap
												? "Evidence gap"
												: (SEVERITY_LABEL[row.severity] ?? row.severity)}
										</span>
									</TableCell>
									<TableCell className={DATA_TABLE_CELL}>
										<div className="flex flex-wrap gap-1">
											{(row.requirementTags ?? []).map((tag) => {
												const label = REQUIREMENT_LABELS[tag] ?? tag;
												return (
													<span
														key={tag}
														className="rounded-md border border-slate-200 bg-slate-50 px-2 py-px text-xs text-slate-600"
													>
														<GlossaryTerm term={label}>{label}</GlossaryTerm>
													</span>
												);
											})}
										</div>
									</TableCell>
									<TableCell
										className={cn(DATA_TABLE_CELL, "whitespace-nowrap")}
									>
										{formatDay(row.dueDate)}
									</TableCell>
									<TableCell className={cn(DATA_TABLE_CELL, "text-slate-600")}>
										<AssigneeCell
											row={row}
											users={users}
											people={people}
											editable={Boolean(
												onAssign &&
													((row.itemKind === "contract" &&
														canAssign?.contract) ||
														(row.itemKind === "license" && canAssign?.license)),
											)}
											onAssign={onAssign}
										/>
									</TableCell>
									<TableCell
										className={cn(DATA_TABLE_CELL, "pr-4 text-slate-600")}
									>
										{row.assignedBy && users.get(row.assignedBy) ? (
											<PersonName
												user={users.get(row.assignedBy) as LookedUpUser}
											/>
										) : (
											<span className="text-slate-500">—</span>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</CaalmDataTable>
				)}

				<PageIndex
					page={page}
					totalItems={rows.length}
					pageSize={PAGE_SIZE}
					onPageChange={setPage}
					hideWhenSinglePage
					showRange
					itemLabel="items"
					className="mt-4"
				/>
			</CardContent>
		</Card>
	);
}
