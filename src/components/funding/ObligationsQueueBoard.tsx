"use client";

import { ChevronRight, Clock, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageIndex } from "@/components/ui/page-index";
import { SearchField } from "@/components/ui/search-field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	formatObligationDueLine,
	OBLIGATION_KIND_LABEL,
	OBLIGATION_STATUS_LABEL,
	obligationStatusBadgeClass,
} from "@/lib/funding/obligation-display";
import type { ObligationQueueResult } from "@/lib/funding/obligation-queue.service";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
const DUE_WINDOWS = [
	{ value: "all", label: "Any due date" },
	{ value: "7", label: "Due in 7 days" },
	{ value: "30", label: "Due in 30 days" },
	{ value: "90", label: "Due in 90 days" },
] as const;

export function ObligationsQueueBoard({
	refreshToken,
	onViewStream,
}: {
	refreshToken: number;
	onViewStream: (contractId: string) => void;
}) {
	const [search, setSearch] = useState("");
	const [owner, setOwner] = useState("all");
	const [overdueOnly, setOverdueOnly] = useState("all");
	const [dueWindow, setDueWindow] = useState("all");
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<ObligationQueueResult | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		const params = new URLSearchParams();
		if (search.trim()) params.set("search", search.trim());
		if (owner !== "all") params.set("owner", owner);
		if (overdueOnly === "overdue") params.set("overdueOnly", "true");
		if (dueWindow !== "all") params.set("dueWithinDays", dueWindow);
		params.set("page", String(page));
		params.set("pageSize", String(PAGE_SIZE));

		try {
			const res = await fetch(`/api/funding/obligations/queue?${params}`);
			if (!res.ok) throw new Error("Could not load obligation queue");
			const json = (await res.json()) as ObligationQueueResult;
			setResult(json);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load");
		} finally {
			setLoading(false);
		}
	}, [search, owner, overdueOnly, dueWindow, page]);

	useEffect(() => {
		void load();
	}, [load, refreshToken]);

	useEffect(() => {
		setPage(1);
	}, [search, owner, overdueOnly, dueWindow]);

	const owners = result?.owners ?? [];
	const items = result?.items ?? [];
	const totalItems = result?.totalItems ?? 0;

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
				<StatCard
					title="Open"
					value={String(result?.summary.openCount ?? 0)}
					hint="Open obligations across all streams"
				/>
				<StatCard
					title="Overdue"
					value={String(result?.summary.overdueCount ?? 0)}
					hint="Past due or marked overdue"
				/>
			</div>

			<div className="glass-card flex flex-col overflow-hidden rounded-xl">
				<div className="glass-card-cap" />
				<div className="shrink-0 border-b border-slate-200 px-4 py-3 sm:px-6">
					<h2 className="mt-4 text-xl font-semibold sidebar-gradient-text">
						Obligation queue
					</h2>
					<p className="mt-1 text-sm text-slate-600">
						Open work across funded contracts. Filter by owner, due window, or
						overdue, then jump back to the stream.
					</p>
					<div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
						<SearchField
							containerClassName="sm:col-span-1"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search obligations…"
							aria-label="Search obligations"
						/>
						<Select value={owner} onValueChange={setOwner}>
							<SelectTrigger
								className="h-10 border-[0.25px] border-slate-300"
								aria-label="Filter by owner"
							>
								<SelectValue placeholder="Owner" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All owners</SelectItem>
								{owners.map((name) => (
									<SelectItem key={name} value={name}>
										{name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Select value={overdueOnly} onValueChange={setOverdueOnly}>
							<SelectTrigger
								className="h-10 border-[0.25px] border-slate-300"
								aria-label="Filter by overdue"
							>
								<SelectValue placeholder="Overdue" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Open and overdue</SelectItem>
								<SelectItem value="overdue">Overdue only</SelectItem>
							</SelectContent>
						</Select>
						<Select value={dueWindow} onValueChange={setDueWindow}>
							<SelectTrigger
								className="h-10 border-[0.25px] border-slate-300"
								aria-label="Filter by due window"
							>
								<SelectValue placeholder="Due window" />
							</SelectTrigger>
							<SelectContent>
								{DUE_WINDOWS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				{error ? (
					<p className="px-4 py-4 text-sm text-slate-700 sm:px-6">{error}</p>
				) : loading && !result ? (
					<p className="px-4 py-6 text-sm text-slate-500 sm:px-6">
						Loading obligation queue…
					</p>
				) : items.length === 0 ? (
					<p className="px-4 py-6 text-sm text-slate-500 sm:px-6">
						No open obligations match this filter.
					</p>
				) : (
					<ul className="divide-y divide-slate-200">
						{items.map((item) => {
							const dueLine = formatObligationDueLine(item.dueDate);
							const status = item.isOverdue ? "overdue" : item.status;
							return (
								<li key={item.$id} className="px-4 py-4 sm:px-6">
									<div className="flex items-start justify-between gap-4">
										<div className="min-w-0">
											<p className="truncate font-medium text-slate-700">
												{item.title}
											</p>
											<p className="mt-1 text-xs text-slate-500">
												{item.contractName || "Untitled contract"}
											</p>
											<div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
												<span
													className={cn(
														"inline-block rounded-full border px-2 py-0.5 text-xs font-medium",
														obligationStatusBadgeClass(status),
													)}
												>
													{item.isOverdue
														? "Overdue"
														: OBLIGATION_STATUS_LABEL[item.status]}
												</span>
												<span className="inline-block rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
													{OBLIGATION_KIND_LABEL[item.kind]}
												</span>
												<span className="inline-flex items-center gap-1">
													<User className="h-3.5 w-3.5 text-slate-400" />
													{item.ownerName?.trim() || "Unassigned"}
												</span>
												<span className="inline-flex items-center gap-1">
													<Clock className="h-3.5 w-3.5 text-slate-400" />
													{dueLine || "No due date"}
												</span>
											</div>
										</div>
										<Button
											type="button"
											variant="outline"
											className="shrink-0 border-[0.25px] border-slate-300 px-3 sm:px-4"
											onClick={() => onViewStream(item.contractId)}
										>
											View stream
											<ChevronRight className="h-4 w-4" />
										</Button>
									</div>
								</li>
							);
						})}
					</ul>
				)}

				<div className="border-t border-slate-200 px-4 py-3 sm:px-6">
					<PageIndex
						page={page}
						totalItems={totalItems}
						pageSize={PAGE_SIZE}
						onPageChange={setPage}
						hideWhenSinglePage
						showRange
						scrollToTop
						itemLabel="obligations"
					/>
				</div>
			</div>
		</div>
	);
}

function StatCard({
	title,
	value,
	hint,
}: {
	title: string;
	value: string;
	hint: string;
}) {
	return (
		<Card className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6">
				<p className="text-sm font-medium sidebar-gradient-text">{title}</p>
				<div className="flex items-center pt-2 text-3xl font-bold tabular-nums text-slate-700">
					<span>{value}</span>
				</div>
				<p className="mt-1 text-xs text-slate-600">{hint}</p>
			</CardContent>
		</Card>
	);
}
