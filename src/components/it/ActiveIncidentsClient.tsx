"use client";

import {
	AlertCircle,
	Clock,
	RefreshCw,
	ShieldAlert,
	Users,
} from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import useSWR from "swr";
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
import { SearchField } from "@/components/ui/search-field";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useUsersByIds } from "@/hooks/useUsersByIds";
import type { LoadIncident } from "@/lib/incidents/incident.types";
import { SCALE_LABELS } from "@/lib/incidents/incident.utils";
import { incidentScreenshotUrl } from "@/lib/incidents/incident-screenshot-url";
import { cn } from "@/lib/utils";

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

const SCALE_OPTIONS: CaalmFilterOption<string>[] = [
	{ value: "all", label: "All" },
	{ value: "page", label: "Page" },
	{ value: "section", label: "Section" },
	{ value: "table", label: "Table" },
	{ value: "banner", label: "Banner" },
];

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
	const { toast } = useToast();

	const params = new URLSearchParams();
	if (search) params.set("search", search);
	if (scale !== "all") params.set("scale", scale);

	const { data, mutate, isLoading } = useSWR<IncidentsResponse>(
		`/api/it/incidents?${params.toString()}`,
		fetcher,
	);

	const incidents = data?.data.incidents ?? [];
	const summary = data?.data.summary;

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
							containerClassName="max-w-xs"
						/>
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
							variant="outline"
							size="sm"
							className="ml-auto rounded-full"
							onClick={() => void mutate()}
						>
							<RefreshCw className="h-4 w-4" />
							Refresh
						</Button>
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
								{incidents.map((row) => (
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
											<p className="font-semibold">{row.route}</p>
											<p className="text-xs text-slate-500">
												{SCALE_LABELS[row.scale]} · {row.elementKey}
											</p>
										</TableCell>
										<TableCell className={DATA_TABLE_CELL}>
											{row.errorStatus ? (
												<span className="rounded-md border border-red/20 bg-red/10 px-2 py-0.5 text-xs font-bold text-red">
													{row.errorStatus}
												</span>
											) : null}
											<p className="mt-0.5 truncate text-xs text-slate-500">
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
														: "border-blue/20 bg-blue/10 text-blue",
												)}
											>
												{row.status === "new" ? "New" : "Acknowledged"}
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
				</CardContent>
			</Card>

			<Sheet
				open={selected !== null}
				onOpenChange={(open) => {
					if (!open) {
						setSelected(null);
						setResolutionNote("");
					}
				}}
			>
				<SheetContent side="right" className="w-[500px] sm:max-w-[500px]">
					{selected && (
						<div className="flex h-full min-h-0 flex-col">
							<SheetHeader className="shrink-0">
								<SheetTitle>{selected.reference}</SheetTitle>
								<p className="text-sm text-slate-500">
									{selected.route} · {SCALE_LABELS[selected.scale]} failed to
									load
								</p>
							</SheetHeader>

							<div className="min-h-0 flex-1 space-y-5 overflow-y-auto py-4">
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
									{selected.screenshotCapturedAt && (
										<p className="mt-1 text-xs text-slate-400">
											Captured {formatTime(selected.screenshotCapturedAt)}
										</p>
									)}
								</div>

								<div>
									<p className="mb-2 text-xs font-semibold uppercase text-slate-500">
										Details
									</p>
									<dl className="space-y-2 text-sm">
										<Row label="Page / route" value={selected.route} />
										<Row
											label="Failed request"
											value={`${selected.requestPath ?? "—"} · ${selected.errorStatus ?? "—"}`}
										/>
										<Row label="Trace ID" value={selected.traceId ?? "—"} />
										<Row
											label="Occurrences"
											value={`${selected.occurrences} · ${selected.affectedUsers} users`}
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

								{canManage && (
									<div>
										<p className="mb-2 text-xs font-semibold uppercase text-slate-500">
											Actions
										</p>
										<div className="flex flex-wrap items-center gap-2">
											<button
												type="button"
												className="btn-primary"
												disabled={selected.status !== "new"}
												onClick={() =>
													void act(selected.$id, { action: "acknowledge" })
												}
											>
												Acknowledge
											</button>
											<Button
												variant="outline"
												size="sm"
												className="rounded-full"
												onClick={() =>
													void act(selected.$id, {
														action: "assign",
														assignedTo: currentUserId,
													})
												}
											>
												Assign to me
											</Button>
										</div>
										<div className="mt-3 flex flex-col gap-2">
											<textarea
												className="w-full rounded-md border border-slate-300 p-2 text-sm"
												placeholder="Resolution note (required to resolve)"
												value={resolutionNote}
												onChange={(e) => setResolutionNote(e.target.value)}
												rows={2}
											/>
											<Button
												variant="outline"
												size="sm"
												className="self-start rounded-full"
												disabled={!resolutionNote.trim()}
												onClick={() =>
													void act(selected.$id, {
														action: "resolve",
														resolutionNote,
													})
												}
											>
												Mark resolved
											</Button>
										</div>
									</div>
								)}
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
		<div className="flex justify-between gap-4">
			<dt className="text-slate-500">{label}</dt>
			<dd className="text-right font-medium text-slate-800">{value}</dd>
		</div>
	);
}
