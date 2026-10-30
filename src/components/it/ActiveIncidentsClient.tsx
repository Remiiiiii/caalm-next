"use client";

import {
	AlertCircle,
	Check,
	ChevronDown,
	Clock,
	Copy,
	RefreshCw,
	RotateCcw,
	Search,
	ShieldAlert,
	Trash2,
	Users,
} from "lucide-react";
import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import Avatar from "@/components/ui/avatar";
import { BulkActionDock } from "@/components/ui/bulk-action-dock";
import { Button } from "@/components/ui/button";
import {
	type CaalmFilterOption,
	CaalmFilterSelect,
} from "@/components/ui/CaalmFilterSelect";
import {
	CaalmDataTable,
	CaalmDataTableEmpty,
	DATA_TABLE_BODY_ROW_CLICKABLE,
	DATA_TABLE_CELL,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
} from "@/components/ui/caalm-data-table";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FILTER_PILL_TRIGGER } from "@/components/ui/filter-pill";
import {
	MetricSegmentBar,
	MetricStatCard,
	StatRows,
} from "@/components/ui/metric-stat-card";
import { PageIndex } from "@/components/ui/page-index";
import { SearchField } from "@/components/ui/search-field";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useUsersByIds } from "@/hooks/useUsersByIds";
import type { LoadIncident } from "@/lib/incidents/incident.types";
import { SCALE_LABELS } from "@/lib/incidents/incident.utils";
import { incidentScreenshotUrl } from "@/lib/incidents/incident-screenshot-url";
import { IT_DROPDOWN_PANEL } from "@/lib/ui/it-routes";
import { cn } from "@/lib/utils";

interface IncidentsSummary {
	active: number;
	newCount: number;
	acknowledgedCount: number;
	reopenedCount: number;
	openedLastHour: number;

	unassigned: number;
	oldestUnassignedMs: number | null;
	pastResponseTarget: number;
	pageLevelFailures: number;
	sectionOrTableFailures: number;
	assignedToYou: number;

	usersAffected24h: number;
	organizationsAffected24h: number;
	mostAffectedPage: { route: string; count: number } | null;
	largestOrganization: { name: string; users: number } | null;
	repeatHits24h: number;
	totalErrorViews24h: number;

	oldestOpenMs: number | null;
	oldestOpenIncident: {
		reference: string;
		route: string;
		errorStatus: number | null;
	} | null;
	medianAckMs: number | null;
	medianAgeMs: number | null;
	openLongerThan1h: number;
	resolvedToday: number;
}

interface IncidentsResponse {
	success: boolean;
	data: {
		incidents: LoadIncident[];
		summary: IncidentsSummary;
	};
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function formatDuration(ms: number | null): string {
	if (ms === null) return "—";
	const h = Math.floor(ms / 3_600_000);
	const m = Math.floor((ms % 3_600_000) / 60_000);
	if (h === 0) return `${m}m`;
	return `${h}h ${m}m`;
}

function formatTime(iso: string): string {
	return new Date(iso).toLocaleTimeString([], {
		hour: "numeric",
		minute: "2-digit",
	});
}

function formatDateTime(iso: string): string {
	return new Date(iso).toLocaleString([], {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

function humanizeRoute(route: string): string {
	const last = route.split("/").filter(Boolean).pop() ?? route;
	return last
		.split("-")
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

const SCALE_OPTIONS: CaalmFilterOption<string>[] = [
	{ value: "all", label: "All" },
	{ value: "page", label: "Page" },
	{ value: "section", label: "Section" },
	{ value: "table", label: "Table" },
	{ value: "banner", label: "Banner" },
];

/** Lives in the page header, next to the subtitle — revalidates the incidents list regardless of current filters. */
export function RefreshIncidentsButton() {
	const { mutate } = useSWRConfig();
	const [refreshing, setRefreshing] = useState(false);

	const handleRefresh = async () => {
		setRefreshing(true);
		try {
			await mutate(
				(key) => typeof key === "string" && key.startsWith("/api/it/incidents"),
			);
		} finally {
			setRefreshing(false);
		}
	};

	return (
		<Button
			type="button"
			variant="brand"
			disabled={refreshing}
			onClick={() => void handleRefresh()}
		>
			<RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
			Refresh
		</Button>
	);
}

export function ActiveIncidentsClient({
	canManage,
	currentUserId,
}: {
	canManage: boolean;
	currentUserId: string;
}) {
	const [search, setSearch] = useState("");
	const [scale, setScale] = useState("all");
	const [selected, setSelected] = useState<LoadIncident | null>(null);
	const [resolutionNote, setResolutionNote] = useState("");
	const [resolvingOpen, setResolvingOpen] = useState(false);
	const [assignSearch, setAssignSearch] = useState("");
	const [copied, setCopied] = useState(false);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [page, setPage] = useState(1);
	const tableRef = useRef<HTMLDivElement>(null);
	const { toast } = useToast();

	const { data: itStaff } = useSWR<
		Array<{
			$id: string;
			accountId?: string;
			fullName: string;
			imageUrl?: string | null;
		}>
	>(canManage ? "/api/it/staff" : null, fetcher);

	const params = new URLSearchParams();
	if (search) params.set("search", search);
	if (scale !== "all") params.set("scale", scale);

	const { data, mutate, isLoading } = useSWR<IncidentsResponse>(
		`/api/it/incidents?${params.toString()}`,
		fetcher,
	);

	const PAGE_SIZE = 12;
	const incidents = data?.data.incidents ?? [];
	const summary = data?.data.summary;
	const totalPages = Math.max(1, Math.ceil(incidents.length / PAGE_SIZE));
	const safePage = Math.min(page, totalPages);
	const pagedIncidents = incidents.slice(
		(safePage - 1) * PAGE_SIZE,
		safePage * PAGE_SIZE,
	);
	const visibleIds = pagedIncidents.map((r) => r.$id);
	const allSelected =
		visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
	const someSelected =
		!allSelected && visibleIds.some((id) => selectedIds.includes(id));

	const userIds = useMemo(
		() =>
			Array.from(
				new Set(
					incidents.flatMap((row) =>
						[
							row.assignedTo,
							row.acknowledgedBy,
							row.resolvedBy,
							row.unresolvedBy,
						].filter((id): id is string => Boolean(id)),
					),
				),
			),
		[incidents],
	);
	const users = useUsersByIds(userIds);

	const assignedLabel = (userId: string | null) => {
		if (!userId) return "Unassigned";
		return users.get(userId)?.fullName ?? userId;
	};

	const act = async (incidentId: string, body: Record<string, unknown>) => {
		try {
			const res = await fetch(`/api/it/incidents/${incidentId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			const result = await res.json();
			if (!res.ok) throw new Error(result.error || "Action failed");
			const updated = result.data.incident as LoadIncident;
			await mutate();
			if (selected?.$id === incidentId) {
				setSelected(updated);
			}
			return true;
		} catch (err) {
			toast({
				title: "Couldn't update incident",
				description: err instanceof Error ? err.message : undefined,
				variant: "destructive",
			});
			return false;
		}
	};

	const bulkDelete = async () => {
		try {
			const res = await fetch("/api/it/incidents", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ids: selectedIds }),
			});
			if (!res.ok) throw new Error("Delete failed");
			const count = selectedIds.length;
			setSelectedIds([]);
			await mutate();
			toast({ title: `${count} incident(s) removed` });
		} catch {
			toast({
				title: "Couldn't delete incidents",
				variant: "destructive",
			});
		}
	};

	return (
		<div className="flex flex-col gap-6">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<MetricStatCard
					title="Active"
					value={summary ? `${summary.active} open incidents` : "—"}
					description={
						summary
							? `${summary.newCount} new · ${summary.acknowledgedCount} acknowledged · ${summary.openedLastHour} opened in the last hour`
							: undefined
					}
					icon={AlertCircle}
					iconTone="danger"
					pinFooter
					footer={
						<StatRows
							top={
								<MetricSegmentBar
									segments={[
										{
											key: "new",
											label: "New",
											count: summary?.newCount ?? 0,
											colorClass: "bg-red",
											textClass: "text-red",
										},
										{
											key: "acknowledged",
											label: "Acknowledged",
											count: summary?.acknowledgedCount ?? 0,
											colorClass: "bg-blue",
											textClass: "text-blue",
										},
									]}
								/>
							}
							rows={[
								["New", summary?.newCount ?? "—"],
								["Acknowledged", summary?.acknowledgedCount ?? "—"],
								["Regressions (reopened)", summary?.reopenedCount ?? "—"],
							]}
						/>
					}
				/>
				<MetricStatCard
					title="Unassigned"
					value={summary ? `${summary.unassigned} waiting for an owner` : "—"}
					description={
						summary
							? `Oldest unassigned for ${formatDuration(summary.oldestUnassignedMs)}`
							: undefined
					}
					icon={ShieldAlert}
					iconTone="warning"
					pinFooter
					footer={
						<StatRows
							rows={[
								[
									"Past response target",
									<span
										key="past-target"
										className="inline-flex min-w-7 justify-center rounded-md border border-orange/20 bg-orange/10 px-2 py-0.5 text-xs font-bold text-orange"
									>
										{summary?.pastResponseTarget ?? 0}
									</span>,
								],
								["Page-level failures", summary?.pageLevelFailures ?? "—"],
								[
									"Section or table failures",
									summary?.sectionOrTableFailures ?? "—",
								],
								["Assigned to you", summary?.assignedToYou ?? "—"],
							]}
						/>
					}
				/>
				<MetricStatCard
					title="Users affected (24h)"
					value={summary ? `${summary.usersAffected24h} users` : "—"}
					description={
						summary
							? `Across ${summary.organizationsAffected24h} organizations`
							: undefined
					}
					icon={Users}
					pinFooter
					footer={
						<StatRows
							rows={[
								[
									"Most affected page",
									summary?.mostAffectedPage
										? `${humanizeRoute(summary.mostAffectedPage.route)} · ${summary.mostAffectedPage.count}`
										: "—",
								],
								[
									"Largest organization",
									summary?.largestOrganization
										? `${summary.largestOrganization.name} · ${summary.largestOrganization.users} users`
										: "—",
								],
								["Hit the error more than once", summary?.repeatHits24h ?? "—"],
								["Total error views", summary?.totalErrorViews24h ?? "—"],
							]}
						/>
					}
				/>
				<MetricStatCard
					title="Oldest open"
					value={formatDuration(summary?.oldestOpenMs ?? null)}
					description={
						summary?.oldestOpenIncident
							? `${summary.oldestOpenIncident.reference} · ${humanizeRoute(summary.oldestOpenIncident.route)}${
									summary.oldestOpenIncident.errorStatus
										? ` · HTTP ${summary.oldestOpenIncident.errorStatus}`
										: ""
								}`
							: undefined
					}
					icon={Clock}
					pinFooter
					footer={
						<StatRows
							rows={[
								[
									"Median time to acknowledge",
									formatDuration(summary?.medianAckMs ?? null),
								],
								[
									"Median age of open incidents",
									formatDuration(summary?.medianAgeMs ?? null),
								],
								["Open longer than 1h", summary?.openLongerThan1h ?? "—"],
								["Resolved today", summary?.resolvedToday ?? "—"],
							]}
						/>
					}
				/>
			</div>

			<Card ref={tableRef} className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 text-slate-700 sm:p-6">
					<div className="flex flex-wrap items-center gap-3 mb-5">
						<SearchField
							placeholder="Search reference, page or error…"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							containerClassName="w-[26rem] max-w-full shrink-0"
						/>
						<div className="ml-auto flex items-center gap-3">
							<CaalmFilterSelect
								value={scale}
								options={SCALE_OPTIONS}
								onChange={setScale}
								ariaLabel="Filter by scale"
								triggerLabel={`Scale: ${
									SCALE_OPTIONS.find((o) => o.value === scale)?.label ?? "All"
								}`}
							/>
						</div>
					</div>

					{incidents.length === 0 && !isLoading ? (
						<CaalmDataTableEmpty
							title="No active incidents"
							description="Nothing to review right now."
						/>
					) : (
						<CaalmDataTable className="pb-0">
							<TableHeader className="[&_tr]:border-b-0">
								<TableRow className={DATA_TABLE_HEADER_ROW}>
									<TableHead
										className={cn(DATA_TABLE_HEADER_CELL, "w-10 pl-4")}
									>
										<Checkbox
											checked={
												allSelected
													? true
													: someSelected
														? "indeterminate"
														: false
											}
											onCheckedChange={(checked) => {
												if (checked) {
													setSelectedIds((prev) => [
														...new Set([...prev, ...visibleIds]),
													]);
												} else {
													setSelectedIds((prev) =>
														prev.filter((id) => !visibleIds.includes(id)),
													);
												}
											}}
										/>
									</TableHead>
									<TableHead className={cn(DATA_TABLE_HEADER_CELL)}>
										Reference
									</TableHead>
									<TableHead className={DATA_TABLE_HEADER_CELL}>
										Last seen
									</TableHead>
									<TableHead className={DATA_TABLE_HEADER_CELL}>
										Page · element
									</TableHead>
									<TableHead className={DATA_TABLE_HEADER_CELL}>
										Error
									</TableHead>
									<TableHead className={DATA_TABLE_HEADER_CELL}>Hits</TableHead>
									<TableHead className={DATA_TABLE_HEADER_CELL}>
										Screen
									</TableHead>
									<TableHead className={DATA_TABLE_HEADER_CELL}>
										Status
									</TableHead>
									<TableHead className={cn(DATA_TABLE_HEADER_CELL, "pr-4")}>
										Assigned
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody className="[&_tr:last-child>td]:border-b-0">
								{pagedIncidents.map((row) => (
									<TableRow
										key={row.$id}
										tabIndex={0}
										className={cn(
											DATA_TABLE_BODY_ROW_CLICKABLE,
											selected?.$id === row.$id && "bg-blue/10",
											selectedIds.includes(row.$id) &&
												"bg-blue/10 [&>td:first-child]:relative [&>td:first-child]:before:absolute [&>td:first-child]:before:inset-y-0 [&>td:first-child]:before:left-0 [&>td:first-child]:before:w-0.5 [&>td:first-child]:before:bg-[#0f5384]",
										)}
										onClick={() => setSelected(row)}
										onKeyDown={(e) => {
											if (e.key === "Enter") setSelected(row);
										}}
									>
										<TableCell
											className={cn(DATA_TABLE_CELL, "w-10 pl-4")}
											onClick={(e) => e.stopPropagation()}
										>
											<Checkbox
												checked={selectedIds.includes(row.$id)}
												onCheckedChange={(checked) => {
													setSelectedIds((prev) =>
														checked
															? [...prev, row.$id]
															: prev.filter((id) => id !== row.$id),
													);
												}}
											/>
										</TableCell>
										<TableCell
											className={cn(
												DATA_TABLE_CELL,
												"whitespace-nowrap font-mono text-[#0f5384]",
											)}
										>
											{row.reference}
										</TableCell>
										<TableCell
											className={cn(DATA_TABLE_CELL, "whitespace-nowrap")}
										>
											{formatTime(row.lastSeenAt)}
										</TableCell>
										<TableCell className={DATA_TABLE_CELL}>
											<p className="font-semibold">{row.route}</p>
											<p className="text-xs text-slate-500">
												{SCALE_LABELS[row.scale]} · {row.elementKey}
											</p>
										</TableCell>
										<TableCell className={DATA_TABLE_CELL}>
											{row.errorStatus ? (
												<span className="rounded-full border border-red/20 bg-red/10 px-2.5 py-0.5 text-xs font-bold text-red">
													{row.errorStatus}
												</span>
											) : null}
											<p className="mt-1 truncate text-xs text-slate-500">
												{row.requestPath}
											</p>
										</TableCell>
										<TableCell className={DATA_TABLE_CELL}>
											{row.occurrences}
										</TableCell>
										<TableCell
											className={DATA_TABLE_CELL}
											onClick={(e) => e.stopPropagation()}
										>
											{row.screenshotPath ? (
												<Image
													src={incidentScreenshotUrl(row.screenshotPath)}
													alt={`Screenshot of ${row.reference}`}
													width={96}
													height={56}
													className="rounded border border-slate-200 object-cover"
													unoptimized
												/>
											) : (
												<div className="flex h-14 w-24 items-center justify-center rounded border border-slate-200 bg-slate-50 text-[10px] text-slate-400">
													No screenshot
												</div>
											)}
										</TableCell>
										<TableCell className={DATA_TABLE_CELL}>
											<span
												className={cn(
													"inline-block rounded-full border px-2 py-0.5 text-xs",
													row.status === "new"
														? "border-red/20 bg-red/10 text-red"
														: row.status === "resolved"
															? "border-green/20 bg-green/10 text-green"
															: "border-blue/20 bg-blue/10 text-blue",
												)}
											>
												{row.status === "new"
													? "New"
													: row.status === "resolved"
														? "Resolved"
														: "Acknowledged"}
											</span>
										</TableCell>
										<TableCell className={cn(DATA_TABLE_CELL, "pr-4")}>
											{row.assignedTo ? (
												<TooltipProvider delayDuration={200}>
													<Tooltip>
														<TooltipTrigger asChild>
															<span className="inline-block cursor-default">
																<Avatar
																	name={
																		users.get(row.assignedTo)?.fullName ?? "?"
																	}
																	userId={row.assignedTo}
																	size="sm"
																	imageUrl={users.get(row.assignedTo)?.imageUrl}
																/>
															</span>
														</TooltipTrigger>
														<TooltipContent glass>
															{assignedLabel(row.assignedTo)}
														</TooltipContent>
													</Tooltip>
												</TooltipProvider>
											) : (
												<span className="text-slate-400">—</span>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</CaalmDataTable>
					)}
					{incidents.length > PAGE_SIZE && (
						<div className="pt-4">
							<PageIndex
								page={safePage}
								totalPages={totalPages}
								totalItems={incidents.length}
								pageSize={PAGE_SIZE}
								onPageChange={setPage}
							/>
						</div>
					)}
				</CardContent>
			</Card>

			{selectedIds.length > 0 && (
				<BulkActionDock
					count={selectedIds.length}
					noun="incident"
					anchorRef={tableRef}
					onClear={() => setSelectedIds([])}
				>
					<Button
						size="sm"
						variant="destructive"
						className="delete-btn"
						onClick={() => void bulkDelete()}
					>
						<Trash2 className="h-3.5 w-3.5" />
						Remove
					</Button>
				</BulkActionDock>
			)}

			<Sheet
				open={selected !== null}
				onOpenChange={(open) => {
					if (!open) {
						setSelected(null);
						setResolutionNote("");
						setResolvingOpen(false);
					}
				}}
			>
				<SheetContent
					side="right"
					className="my-4 mr-4 !h-auto max-h-[calc(100vh-2rem)] w-[500px] overflow-hidden rounded-xl border border-slate-200 p-0 shadow-xl sm:max-w-[500px]"
				>
					{selected && (
						<div className="flex h-full min-h-0 flex-col">
							{/* ── card cap ── */}
							<div className="glass-card-cap" />

							{/* ── header ── */}
							<div className="shrink-0 px-6 pt-8 pb-4">
								<div className="flex items-center justify-between gap-3">
									<div className="flex items-center gap-2 min-w-0">
										<SheetTitle className="text-base font-bold text-slate-800">
											{selected.reference}
										</SheetTitle>
										<button
											type="button"
											aria-label="Copy reference"
											className="shrink-0"
											onClick={() => {
												void navigator.clipboard.writeText(selected.reference);
												setCopied(true);
												setTimeout(() => setCopied(false), 1500);
											}}
										>
											{copied ? (
												<Check className="h-4 w-4 text-green-500" />
											) : (
												<Copy className="h-4 w-4 text-slate-400 hover:text-slate-600" />
											)}
										</button>
									</div>
									<span
										className={cn(
											"inline-block shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
											selected.status === "new"
												? "border-red/20 bg-red/10 text-red"
												: selected.status === "resolved"
													? "border-green/20 bg-green/10 text-green"
													: "border-blue/20 bg-blue/10 text-blue",
										)}
									>
										{selected.status === "new"
											? "New"
											: selected.status === "resolved"
												? "Resolved"
												: "Acknowledged"}
									</span>
								</div>
								<p className="mt-0.5 text-sm text-slate-500">
									{humanizeRoute(selected.route)} ·{" "}
									{SCALE_LABELS[selected.scale]} failed to load
								</p>
							</div>

							{/* ── scrollable body ── */}
							<div className="min-h-0 flex-1 overflow-y-auto">
								{/* ── what the user saw ── */}
								<div className="border-t border-slate-200 px-6 py-4">
									<p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
										What the user saw
									</p>
									{selected.screenshotPath ? (
										<div className="overflow-hidden rounded-lg border border-slate-200">
											<div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-100 px-3 py-1.5">
												<span className="h-2 w-2 rounded-full bg-slate-300" />
												<span className="h-2 w-2 rounded-full bg-slate-300" />
												<span className="h-2 w-2 rounded-full bg-slate-300" />
												<span className="ml-2 truncate text-xs text-slate-500">
													…{selected.route}
												</span>
											</div>
											<Image
												src={incidentScreenshotUrl(selected.screenshotPath)}
												alt={`Screenshot of ${selected.reference}`}
												width={460}
												height={260}
												className="w-full object-cover"
												unoptimized
											/>
										</div>
									) : (
										<div className="flex h-40 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-400">
											Screenshot not available
										</div>
									)}
									{selected.screenshotCapturedAt && (
										<div className="mt-2 flex items-center justify-between gap-3">
											<p className="text-xs text-slate-400">
												Captured {formatDateTime(selected.screenshotCapturedAt)}{" "}
												(first occurrence)
											</p>
											{selected.screenshotPath ? (
												<a
													href={incidentScreenshotUrl(selected.screenshotPath)}
													target="_blank"
													rel="noreferrer"
													className="shrink-0 text-xs font-medium text-[#0f5384] hover:underline"
												>
													Open full size ↗
												</a>
											) : null}
										</div>
									)}
								</div>

								{/* ── details ── */}
								<div className="border-t border-slate-200 px-6 py-4">
									<p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
										Details
									</p>
									<dl className="divide-y divide-slate-200 text-sm">
										<Row label="Page / route" value={selected.route} />
										<Row
											label="Failed request"
											value={`${selected.requestPath ?? "—"} · ${selected.errorStatus ?? "—"}`}
										/>
										<Row label="Trace ID" value={selected.traceId ?? "—"} />
										<Row
											label="Occurrences"
											value={`${selected.occurrences} · ${selected.affectedUsers} users · 1 org`}
										/>
										<Row
											label="First / last seen"
											value={`${formatTime(selected.firstSeenAt)} / ${formatTime(selected.lastSeenAt)}`}
										/>
										<Row
											label="Browser · viewport"
											value={selected.viewport ?? "—"}
										/>
										<Row
											label="App version"
											value={selected.appVersion ?? "—"}
										/>
									</dl>
								</div>

								{/* ── actions ── */}
								<div className="border-t border-slate-200 px-6 py-4">
									<p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
										Actions
									</p>
									<div className="flex flex-col gap-3">
										{/* ── assign dropdown ── */}
										<div className="flex items-center justify-between">
											<span className="text-sm text-slate-600">Assign to</span>
											<DropdownMenu>
												<DropdownMenuTrigger
													disabled={!canManage}
													className={cn(
														FILTER_PILL_TRIGGER,
														"disabled:opacity-50",
													)}
												>
													{selected.assignedTo ? (
														<>
															<Avatar
																name={
																	users.get(selected.assignedTo)?.fullName ??
																	"?"
																}
																userId={selected.assignedTo}
																size="xs"
																imageUrl={
																	users.get(selected.assignedTo)?.imageUrl
																}
															/>
															<span className="max-w-[10rem] truncate">
																{assignedLabel(selected.assignedTo)}
															</span>
														</>
													) : (
														<span className="text-slate-400">Unassigned</span>
													)}
													<ChevronDown className="h-3.5 w-3.5 text-slate-400" />
												</DropdownMenuTrigger>
												<DropdownMenuContent
													align="end"
													className={`${IT_DROPDOWN_PANEL} w-64 p-0`}
												>
													<div className="flex items-center gap-2 border-b border-slate-200/80 px-3 py-2">
														<Search className="h-4 w-4 shrink-0 text-slate-400" />
														<input
															type="text"
															className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
															placeholder="Search staff…"
															value={assignSearch}
															onChange={(e) => setAssignSearch(e.target.value)}
															onClick={(e) => e.stopPropagation()}
															onKeyDown={(e) => e.stopPropagation()}
														/>
													</div>
													<div className="max-h-52 overflow-y-auto py-1">
														{(itStaff ?? [])
															.filter((u) =>
																u.fullName
																	.toLowerCase()
																	.includes(assignSearch.toLowerCase()),
															)
															.map((u) => (
																<DropdownMenuItem
																	key={u.$id}
																	className="flex items-center gap-2.5 px-3 py-2"
																	onSelect={() => {
																		void act(selected.$id, {
																			action: "assign",
																			assignedTo: u.accountId || u.$id,
																		});
																		setAssignSearch("");
																	}}
																>
																	<Avatar
																		name={u.fullName}
																		userId={u.accountId || u.$id}
																		size="xs"
																		imageUrl={u.imageUrl}
																	/>
																	<span className="truncate">{u.fullName}</span>
																	{(u.accountId || u.$id) ===
																		selected.assignedTo && (
																		<Check className="ml-auto h-4 w-4 shrink-0 text-green-600" />
																	)}
																</DropdownMenuItem>
															))}
														{itStaff &&
															itStaff.filter((u) =>
																u.fullName
																	.toLowerCase()
																	.includes(assignSearch.toLowerCase()),
															).length === 0 && (
																<p className="px-3 py-4 text-center text-sm text-slate-400">
																	No matching staff
																</p>
															)}
														{!itStaff && (
															<p className="px-3 py-4 text-center text-sm text-slate-400">
																Loading…
															</p>
														)}
													</div>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>

										{/* ── acknowledge switch ── */}
										<div className="flex items-center justify-between">
											<span className="text-sm text-slate-600">
												Acknowledged
											</span>
											<Switch
												checked={selected.status !== "new"}
												disabled={!canManage || selected.status !== "new"}
												onCheckedChange={() =>
													void act(selected.$id, { action: "acknowledge" })
												}
											/>
										</div>

										{/* ── mark resolved switch + textarea ── */}
										<div className="flex items-center justify-between">
											<span className="text-sm text-slate-600">Resolved</span>
											<Switch
												checked={
													selected.status === "resolved" || resolvingOpen
												}
												disabled={!canManage}
												onCheckedChange={async (checked) => {
													if (!checked && selected.status === "resolved") {
														await act(selected.$id, { action: "unresolve" });
													} else {
														setResolvingOpen(checked);
													}
												}}
											/>
										</div>
										{resolvingOpen &&
											canManage &&
											selected.status !== "resolved" && (
												<div className="flex flex-col gap-2">
													<textarea
														className="w-full rounded-md border border-slate-300 p-2 text-sm"
														placeholder="Resolution note (required to resolve)"
														value={resolutionNote}
														onChange={(e) => setResolutionNote(e.target.value)}
														rows={2}
													/>
													<Button
														size="sm"
														variant="brand"
														className="self-end"
														disabled={!resolutionNote.trim()}
														onClick={async () => {
															const ok = await act(selected.$id, {
																action: "resolve",
																resolutionNote,
															});
															if (ok) {
																setResolvingOpen(false);
															}
														}}
													>
														Confirm resolved
													</Button>
												</div>
											)}
									</div>
								</div>

								{/* ── activity ── */}
								<div className="border-t border-slate-200 px-6 py-4">
									<p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
										Activity
									</p>
									<div className="divide-y divide-slate-100 text-sm">
										<div className="flex justify-between gap-4 py-2">
											<span className="text-slate-600">
												Created automatically
											</span>
											<span className="whitespace-nowrap tabular-nums text-slate-500">
												{formatDateTime(selected.$createdAt)}
											</span>
										</div>
										{selected.screenshotCapturedAt && (
											<div className="flex justify-between gap-4 py-2">
												<span className="text-slate-600">
													Screenshot captured
												</span>
												<span className="whitespace-nowrap tabular-nums text-slate-500">
													{formatDateTime(selected.screenshotCapturedAt)}
												</span>
											</div>
										)}
										{selected.acknowledgedAt && (
											<div className="flex justify-between gap-4 py-2">
												<span className="text-slate-600">
													Acknowledged
													{selected.acknowledgedBy &&
														users.get(selected.acknowledgedBy) &&
														` by ${users.get(selected.acknowledgedBy)!.fullName}`}
												</span>
												<span className="whitespace-nowrap tabular-nums text-slate-500">
													{formatDateTime(selected.acknowledgedAt)}
												</span>
											</div>
										)}
										{selected.assignedTo && (
											<div className="flex justify-between gap-4 py-2">
												<span className="text-slate-600">
													Assigned to {assignedLabel(selected.assignedTo)}
												</span>
												<span className="whitespace-nowrap tabular-nums text-slate-500">
													{formatDateTime(selected.$updatedAt)}
												</span>
											</div>
										)}
										{selected.occurrences > 1 && (
											<div className="flex justify-between gap-4 py-2">
												<span className="text-slate-600">
													Seen again ({selected.occurrences - 1} more{" "}
													{selected.occurrences - 1 === 1 ? "time" : "times"})
												</span>
												<span className="whitespace-nowrap tabular-nums text-slate-500">
													{formatDateTime(selected.lastSeenAt)}
												</span>
											</div>
										)}
										{selected.resolvedAt && (
											<div className="py-2">
												<div className="flex justify-between gap-4">
													<span className="text-slate-600">
														Resolved
														{selected.resolvedBy &&
															users.get(selected.resolvedBy) &&
															` by ${users.get(selected.resolvedBy)!.fullName}`}
													</span>
													<span className="whitespace-nowrap tabular-nums text-slate-500">
														{formatDateTime(selected.resolvedAt)}
													</span>
												</div>
												{selected.resolutionNote && (
													<p className="mt-1.5 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600 italic">
														{selected.resolutionNote}
													</p>
												)}
												{canManage && (
													<button
														type="button"
														className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-[#0f5384] hover:underline"
														onClick={() =>
															void act(selected.$id, {
																action: "unresolve",
															})
														}
													>
														<RotateCcw className="h-3 w-3" />
														Undo resolve
													</button>
												)}
											</div>
										)}
										{selected.unresolvedAt && (
											<div className="flex justify-between gap-4 py-2">
												<span className="text-slate-600">
													<RotateCcw className="mr-1 inline h-3 w-3" />
													Resolve undone
													{selected.unresolvedBy &&
														users.get(selected.unresolvedBy) &&
														` by ${users.get(selected.unresolvedBy)!.fullName}`}
												</span>
												<span className="whitespace-nowrap tabular-nums text-slate-500">
													{formatDateTime(selected.unresolvedAt)}
												</span>
											</div>
										)}
									</div>
								</div>
							</div>
						</div>
					)}
				</SheetContent>
			</Sheet>
		</div>
	);
}

function Row({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex justify-between gap-4 py-2">
			<dt className="text-slate-500">{label}</dt>
			<dd className="text-right font-medium text-slate-800">{value}</dd>
		</div>
	);
}
