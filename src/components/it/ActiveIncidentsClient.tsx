"use client";

import {
	AlertCircle,
	AlertTriangle,
	Clock,
	Copy,
	ExternalLink,
	RefreshCw,
	ShieldAlert,
	Users,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import EntityPreviewSheetShell from "@/components/preview/EntityPreviewSheetShell";
import { TaskAssigneeFilter } from "@/components/tasks/TaskAssigneeFilter";
import type { TaskPerson } from "@/components/tasks/task-ui";
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
import { MetricStatCard } from "@/components/ui/metric-stat-card";
import { PageIndex } from "@/components/ui/page-index";
import { SearchField } from "@/components/ui/search-field";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { PERMISSION_BASED_NAV } from "@/constants/navigation-permissions";
import { useToast } from "@/hooks/use-toast";
import { useUsersByIds } from "@/hooks/useUsersByIds";
import type {
	LoadIncident,
	LoadIncidentEvent,
} from "@/lib/incidents/incident.types";
import {
	browserFromUserAgent,
	elementKeyLabel,
	SCALE_LABELS,
} from "@/lib/incidents/incident.utils";
import { incidentScreenshotUrl } from "@/lib/incidents/incident-screenshot-url";
import { cn, getProfilePictureUrl } from "@/lib/utils";

interface IncidentsResponse {
	success: boolean;
	data: {
		incidents: LoadIncident[];
		summary: {
			active: number;
			unassigned: number;
			usersAffected24h: number;
			oldestOpenMs: number | null;
		};
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

/** Last path segment, title-cased — fallback when a route isn't in the nav catalog. */
function humanizeRoute(route: string): string {
	const segment = route.split("/").filter(Boolean).pop() || route;
	return segment
		.replace(/[-_]+/g, " ")
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusBadgeClasses(status: LoadIncident["status"]): string {
	if (status === "resolved") return "border-green/20 bg-green/10 text-green";
	if (status === "acknowledged") return "border-blue/20 bg-blue/10 text-blue";
	return "border-red/20 bg-red/10 text-red";
}

function statusLabel(status: LoadIncident["status"]): string {
	if (status === "resolved") return "Resolved";
	if (status === "acknowledged") return "Acknowledged";
	return "New";
}

/** Label/value row — value right-aligned to match the Activity timestamps. */
function DetailLine({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-4 py-2.5 text-sm">
			<span className="shrink-0 text-xs font-semibold uppercase text-slate-500">
				{label}
			</span>
			<span className="text-right font-medium text-slate-700">{value}</span>
		</div>
	);
}

const SCALE_OPTIONS: CaalmFilterOption<string>[] = [
	{ value: "all", label: "All" },
	{ value: "page", label: "Page" },
	{ value: "section", label: "Section" },
	{ value: "table", label: "Table" },
	{ value: "banner", label: "Banner" },
];

/** Design rule: 12 rows per page across all data tables. */
const PAGE_SIZE = 12;

export function ActiveIncidentsClient({
	canManage,
	currentUserId,
}: {
	canManage: boolean;
	currentUserId: string;
}) {
	const [search, setSearch] = useState("");
	const [scale, setScale] = useState("all");
	const [page, setPage] = useState(1);
	const [selected, setSelected] = useState<LoadIncident | null>(null);
	const [resolutionNote, setResolutionNote] = useState("");
	const [resolving, setResolving] = useState(false);
	const [people, setPeople] = useState<TaskPerson[]>([]);
	const [events, setEvents] = useState<LoadIncidentEvent[]>([]);
	const { toast } = useToast();

	const params = new URLSearchParams();
	if (search) params.set("search", search);
	if (scale !== "all") params.set("scale", scale);

	const { data, mutate, isLoading, isValidating } = useSWR<IncidentsResponse>(
		`/api/it/incidents?${params.toString()}`,
		fetcher,
	);

	const incidents = data?.data.incidents ?? [];
	const summary = data?.data.summary;
	const totalPages = Math.max(1, Math.ceil(incidents.length / PAGE_SIZE));
	const safePage = Math.min(page, totalPages);
	const pagedIncidents = incidents.slice(
		(safePage - 1) * PAGE_SIZE,
		safePage * PAGE_SIZE,
	);

	useEffect(() => {
		setPage(1);
	}, [search, scale]);

	const pageTitleByRoute = useMemo(() => {
		const map = new Map<string, string>();
		for (const section of PERMISSION_BASED_NAV) {
			for (const item of section.items) {
				map.set(item.url, item.name);
			}
		}
		return map;
	}, []);

	const pageTitleFor = (route: string) =>
		pageTitleByRoute.get(route) ?? humanizeRoute(route);

	const userIds = useMemo(
		() =>
			Array.from(
				new Set(
					incidents.flatMap((row) =>
						[row.assignedTo, row.acknowledgedBy, row.resolvedBy].filter(
							(id): id is string => Boolean(id),
						),
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

	useEffect(() => {
		if (!canManage) return;
		fetch("/api/users/directory")
			.then((r) => (r.ok ? r.json() : []))
			.then(
				(
					dirUsers: Array<{
						$id?: string;
						fullName?: string;
						email?: string;
						department?: string;
						division?: string | null;
						avatar?: string | null;
					}>,
				) => {
					const list = (Array.isArray(dirUsers) ? dirUsers : []).map((u) => ({
						id: u.$id || "",
						name: u.fullName || u.email || "User",
						imageUrl: getProfilePictureUrl(u.avatar),
						department: u.department || "Other",
						division: u.division || null,
					}));
					setPeople(list.filter((p) => p.id));
				},
			)
			.catch(() => setPeople([]));
	}, [canManage]);

	useEffect(() => {
		if (!selected) {
			setEvents([]);
			return;
		}
		let cancelled = false;
		fetch(`/api/it/incidents/${selected.$id}`)
			.then((r) => (r.ok ? r.json() : null))
			.then((body) => {
				if (!cancelled) setEvents(body?.data?.events ?? []);
			})
			.catch(() => {
				if (!cancelled) setEvents([]);
			});
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selected?.$id]);

	const act = async (incidentId: string, body: Record<string, unknown>) => {
		try {
			const res = await fetch(`/api/it/incidents/${incidentId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			const result = await res.json();
			if (!res.ok) throw new Error(result.error || "Action failed");
			await mutate();
			if (selected?.$id === incidentId) {
				setSelected(result.data.incident as LoadIncident);
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

	return (
		<div className="flex flex-col gap-6">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<MetricStatCard
					title="Active"
					value={summary?.active ?? "—"}
					icon={AlertCircle}
					iconTone="danger"
				/>
				<MetricStatCard
					title="Unassigned"
					value={summary?.unassigned ?? "—"}
					icon={ShieldAlert}
					iconTone="warning"
				/>
				<MetricStatCard
					title="Users affected (24h)"
					value={summary?.usersAffected24h ?? "—"}
					icon={Users}
				/>
				<MetricStatCard
					title="Oldest open"
					value={formatDuration(summary?.oldestOpenMs ?? null)}
					icon={Clock}
				/>
			</div>

			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 text-slate-700 sm:p-6">
					<div className="flex flex-wrap items-center gap-3">
						<SearchField
							placeholder="Search reference, page or error…"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
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
							<Button
								type="button"
								className="btn-primary"
								disabled={isValidating}
								onClick={() => void mutate()}
							>
								<RefreshCw
									className={cn("h-4 w-4", isValidating && "animate-spin")}
								/>
								Refresh
							</Button>
						</div>
					</div>

					{incidents.length === 0 && !isLoading ? (
						<CaalmDataTableEmpty
							title="No active incidents"
							description="Nothing to review right now."
						/>
					) : (
						<CaalmDataTable className="pt-4 pb-0">
							<TableHeader className="[&_tr]:border-b-0">
								<TableRow className={DATA_TABLE_HEADER_ROW}>
									<TableHead className={cn(DATA_TABLE_HEADER_CELL, "pl-4")}>
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
										)}
										onClick={() => setSelected(row)}
										onKeyDown={(e) => {
											if (e.key === "Enter") setSelected(row);
										}}
									>
										<TableCell
											className={cn(
												DATA_TABLE_CELL,
												"whitespace-nowrap pl-4 font-mono text-[#0f5384]",
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
											<p className="font-semibold">{pageTitleFor(row.route)}</p>
											<p className="text-xs text-slate-500">
												{SCALE_LABELS[row.scale]} ·{" "}
												{elementKeyLabel(row.elementKey)}
											</p>
										</TableCell>
										<TableCell className={DATA_TABLE_CELL}>
											{row.errorStatus ? (
												<span className="rounded-full border border-red/20 bg-red/10 px-2 py-0.5 text-xs font-bold text-red">
													{row.errorStatus}
												</span>
											) : null}
											<p className="mt-1.5 truncate text-xs text-slate-500">
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
													statusBadgeClasses(row.status),
												)}
											>
												{statusLabel(row.status)}
											</span>
										</TableCell>
										<TableCell className={cn(DATA_TABLE_CELL, "pr-4")}>
											{assignedLabel(row.assignedTo)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</CaalmDataTable>
					)}
					{incidents.length > 0 ? (
						<PageIndex
							page={safePage}
							totalItems={incidents.length}
							pageSize={PAGE_SIZE}
							onPageChange={setPage}
							showRange
							itemLabel="incidents"
							hideWhenSinglePage
						/>
					) : null}
				</CardContent>
			</Card>

			<EntityPreviewSheetShell
				open={selected !== null}
				onOpenChange={(open) => {
					if (!open) {
						setSelected(null);
						setResolutionNote("");
						setResolving(false);
					}
				}}
				icon={AlertTriangle}
				title={selected?.reference ?? ""}
				description={
					selected
						? `${pageTitleFor(selected.route)} · ${SCALE_LABELS[
								selected.scale
							].toLowerCase()} failed to load`
						: undefined
				}
				statusBanner={
					selected ? (
						<div
							className={cn(
								"border-b px-5 py-2 text-center text-xs font-semibold uppercase tracking-wide",
								statusBadgeClasses(selected.status),
							)}
						>
							{statusLabel(selected.status)}
						</div>
					) : null
				}
				footer={
					selected && canManage ? (
						<div className="flex w-full flex-col gap-3">
							<div className="flex w-full flex-wrap items-center gap-2">
								<Button
									type="button"
									className="btn-primary"
									disabled={selected.status !== "new"}
									onClick={() =>
										void act(selected.$id, { action: "acknowledge" })
									}
								>
									Acknowledge
								</Button>
								<TaskAssigneeFilter
									value={selected.assignedTo || ""}
									people={people}
									mode="assign"
									triggerLabel="Assign…"
									ariaLabel="Assign incident"
									onChange={(assigneeId) =>
										assigneeId &&
										void act(selected.$id, {
											action: "assign",
											assignedTo: assigneeId,
										})
									}
								/>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="rounded-full text-slate-700"
									disabled={selected.status === "resolved"}
									onClick={() => setResolving((v) => !v)}
								>
									Mark resolved
								</Button>
								<Button
									type="button"
									variant="outline"
									size="icon"
									className="h-8 w-8 rounded-full text-slate-700"
									aria-label="Copy reference ID"
									onClick={() => {
										void navigator.clipboard.writeText(selected.reference);
										toast({ title: "Reference copied" });
									}}
								>
									<Copy className="h-3.5 w-3.5" />
								</Button>
							</div>
							{resolving ? (
								<div className="flex flex-col gap-2 border-t border-slate-200 pt-3">
									<textarea
										className="w-full rounded-md border border-slate-300 p-2 text-sm text-slate-700"
										placeholder="Resolution note (required to resolve)"
										value={resolutionNote}
										onChange={(e) => setResolutionNote(e.target.value)}
										rows={2}
									/>
									<div className="flex items-center justify-end gap-2">
										<Button
											type="button"
											variant="outline"
											size="sm"
											className="rounded-full text-slate-700"
											onClick={() => {
												setResolving(false);
												setResolutionNote("");
											}}
										>
											Cancel
										</Button>
										<Button
											type="button"
											size="sm"
											className="btn-primary"
											disabled={!resolutionNote.trim()}
											onClick={async () => {
												const ok = await act(selected.$id, {
													action: "resolve",
													resolutionNote,
												});
												if (ok) {
													setResolving(false);
													setResolutionNote("");
												}
											}}
										>
											Confirm resolve
										</Button>
									</div>
								</div>
							) : null}
						</div>
					) : undefined
				}
			>
				{selected ? (
					<>
						<div>
							<p className="mb-2 text-xs font-semibold uppercase text-slate-500">
								What the user saw
							</p>
							{selected.screenshotPath ? (
								<div className="overflow-hidden rounded-lg border border-slate-200">
									<div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-100 px-3 py-1.5">
										<span className="h-2 w-2 rounded-full bg-slate-300" />
										<span className="h-2 w-2 rounded-full bg-slate-300" />
										<span className="h-2 w-2 rounded-full bg-slate-300" />
										<span className="ml-2 truncate text-xs text-slate-500">
											{selected.route}
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
							{selected.screenshotPath ? (
								<div className="mt-2 flex items-center justify-between gap-3">
									<p className="text-xs text-slate-400">
										{selected.screenshotCapturedAt
											? `Captured ${formatDateTime(selected.screenshotCapturedAt)} (first occurrence)`
											: null}
									</p>
									<a
										href={incidentScreenshotUrl(selected.screenshotPath)}
										target="_blank"
										rel="noreferrer"
										className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[#0f5384] hover:underline"
									>
										Open full size
										<ExternalLink className="h-3 w-3" />
									</a>
								</div>
							) : null}
						</div>

						<div>
							<p className="mb-2 text-xs font-semibold uppercase text-slate-500">
								Details
							</p>
							<div className="divide-y divide-slate-200">
								<DetailLine label="Page / route" value={selected.route} />
								<DetailLine
									label="Failed request"
									value={`${selected.requestPath ?? "—"} · ${selected.errorStatus ?? "—"}`}
								/>
								<DetailLine label="Trace ID" value={selected.traceId ?? "—"} />
								<DetailLine
									label="Occurrences"
									value={`${selected.occurrences} · ${selected.affectedUsers} users`}
								/>
								<DetailLine
									label="First / last seen"
									value={`${formatTime(selected.firstSeenAt)} / ${formatTime(selected.lastSeenAt)}`}
								/>
								<DetailLine
									label="Browser · viewport"
									value={
										[
											browserFromUserAgent(selected.userAgent),
											selected.viewport?.replace("x", "×"),
										]
											.filter(Boolean)
											.join(" · ") || "—"
									}
								/>
								<DetailLine
									label="App version"
									value={selected.appVersion ?? "—"}
								/>
							</div>
						</div>

						<div>
							<p className="mb-2 text-xs font-semibold uppercase text-slate-500">
								Activity
							</p>
							<div className="divide-y divide-slate-200">
								<div className="flex items-center justify-between gap-4 py-2.5 text-sm">
									<span className="text-slate-600">Created automatically</span>
									<span className="font-medium text-slate-700">
										{formatTime(selected.firstSeenAt)}
									</span>
								</div>
								{selected.screenshotCapturedAt ? (
									<div className="flex items-center justify-between gap-4 py-2.5 text-sm">
										<span className="text-slate-600">Screenshot captured</span>
										<span className="font-medium text-slate-700">
											{formatTime(selected.screenshotCapturedAt)}
										</span>
									</div>
								) : null}
								{events.length > 1 ? (
									<div className="flex items-center justify-between gap-4 py-2.5 text-sm">
										<span className="text-slate-600">
											Seen again ({events.length - 1} more time
											{events.length - 1 === 1 ? "" : "s"})
										</span>
										<span className="font-medium text-slate-700">
											{formatTime(selected.lastSeenAt)}
										</span>
									</div>
								) : null}
							</div>
						</div>
					</>
				) : null}
			</EntityPreviewSheetShell>
		</div>
	);
}
