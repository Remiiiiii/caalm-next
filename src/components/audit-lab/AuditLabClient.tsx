"use client";

import {
	Calendar,
	CalendarClock,
	ClipboardList,
	Clock,
	Globe,
	ListChecks,
	Plus,
} from "lucide-react";
import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import useSWR from "swr";
import { AuditLabShell } from "@/components/audit-lab/AuditLabShell";
import {
	type AuditLabSurface,
	SURFACE_COPY,
} from "@/components/audit-lab/audit-lab-surfaces";
import { CoverageChart } from "@/components/audit-lab/CoverageChart";
import { InterviewScriptCanvas } from "@/components/audit-lab/InterviewScriptCanvas";
import { NewSessionDialog } from "@/components/audit-lab/NewSessionDialog";
import { PracticeRoundPanel } from "@/components/audit-lab/PracticeRoundPanel";
import { TrendChart } from "@/components/audit-lab/TrendChart";
import { LoadError } from "@/components/LoadError";
import Avatar from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	CaalmDataTable,
	CaalmDataTableEmpty,
} from "@/components/ui/caalm-data-table";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MetricStatCard } from "@/components/ui/metric-stat-card";
import { PageIndex, pageCountFromItems } from "@/components/ui/page-index";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import type { LabCapabilities } from "@/lib/audit-lab/access";
import type {
	OverviewActivity,
	OverviewSuggestion,
} from "@/lib/audit-lab/overview";
import {
	type EvidenceRequest,
	parseParticipants,
	type ReviewQuestion,
	type ReviewSession,
} from "@/lib/audit-lab/types";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";
import { fetcher } from "@/lib/swr-config";
import { cn } from "@/lib/utils";

type OverviewPayload = {
	stats?: {
		readinessScore: number;
		readinessTrend?: number;
		openGaps: number;
		openGapsTrendLabel?: string;
		evidenceCoverage: number;
		sessionsThisQuarter: number;
	};
	suggestions?: OverviewSuggestion[];
	upcoming?: ReviewSession[];
	sessions?: ReviewSession[];
	evidence?: EvidenceRequest[];
	gaps?: Array<{ $id: string; description: string; status: string }>;
	reports?: Array<{ $id: string; kind: string }>;
	activity?: OverviewActivity[];
};

const SUGGESTION_TAG_CLASS: Record<OverviewSuggestion["tagTone"], string> = {
	danger: "bg-red/10 text-red border-red/20",
	warning: "bg-orange/10 text-orange border-orange/20",
	info: "bg-purple-100 text-purple-700 border-purple-200",
};

const ACTIVITY_DOT_CLASS: Record<OverviewActivity["tone"], string> = {
	success: "bg-green",
	warning: "bg-orange",
	danger: "bg-red",
	info: "bg-[#0f5384]",
};

const SESSION_STATUS_BADGE: Record<string, string> = {
	draft: "bg-slate-100 text-slate-600 border-slate-200",
	scheduled: "bg-blue/10 text-[#0f5384] border-blue/20",
	prep: "bg-orange/10 text-orange border-orange/20",
	in_progress: "bg-blue/10 text-[#0f5384] border-blue/20",
	completed: "bg-green/10 text-green border-green/20",
	report_ready: "bg-green/10 text-green border-green/20",
	archived: "bg-slate-100 text-slate-600 border-slate-200",
	cancelled: "bg-red/10 text-red border-red/20",
};

function sessionStatusLabel(status: string): string {
	return status
		.split("_")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

/** Renders `**bold**` spans from mock/activity text as <strong>. */
function BoldText({ text }: { text: string }) {
	const parts = text.split(/(\*\*[^*]+\*\*)/g);
	return (
		<>
			{parts.map((part, index) =>
				part.startsWith("**") && part.endsWith("**") ? (
					<strong key={index}>{part.slice(2, -2)}</strong>
				) : (
					<Fragment key={index}>{part}</Fragment>
				),
			)}
		</>
	);
}

export function AuditLabClient({
	surface,
	capabilities: initialCapabilities,
}: {
	surface: AuditLabSurface;
	capabilities: LabCapabilities;
}) {
	const copy = SURFACE_COPY[surface];
	const { data: capsData } = useSWR<{
		data?: { capabilities: LabCapabilities };
	}>("/api/audit-lab/capabilities", fetcher, { refreshInterval: 30_000 });
	const capabilities = capsData?.data?.capabilities ?? initialCapabilities;
	const canManageSessions = capabilities.canCreateSession;
	const canManageEvidence = capabilities.canManageEvidence;
	const canPractice = capabilities.canRunPractice;
	const canScore = capabilities.canScorePractice;

	const { toast } = useToast();
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [cancelOpen, setCancelOpen] = useState(false);
	const [newOpen, setNewOpen] = useState(false);
	const [busy, setBusy] = useState(false);
	const [evidenceGroup, setEvidenceGroup] = useState<
		"department" | "owner" | "assignee"
	>("department");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [upcomingPage, setUpcomingPage] = useState(1);

	const overviewUrl =
		surface === "overview"
			? "/api/audit-lab/overview"
			: "/api/audit-lab/sessions";

	const { data, error, isLoading, mutate } = useSWR<{ data?: OverviewPayload }>(
		overviewUrl,
		fetcher,
	);

	const payload = data?.data;
	const sessions = payload?.sessions ?? payload?.upcoming ?? [];
	const evidence = payload?.evidence ?? [];
	const selected = sessions.find((s) => s.$id === selectedId) ?? sessions[0];

	const UPCOMING_PAGE_SIZE = 6;
	const upcomingItems = payload?.upcoming ?? [];
	const upcomingTotalPages = pageCountFromItems(
		upcomingItems.length,
		UPCOMING_PAGE_SIZE,
	);
	const upcomingPageSafe = Math.min(upcomingPage, upcomingTotalPages);
	const pagedUpcoming = upcomingItems.slice(
		(upcomingPageSafe - 1) * UPCOMING_PAGE_SIZE,
		upcomingPageSafe * UPCOMING_PAGE_SIZE,
	);

	const { data: bankData, mutate: mutateBank } = useSWR<{
		data?: {
			questions: ReviewQuestion[];
			script?: { itemsJson?: string; version?: number } | null;
			version?: number;
		};
	}>(
		surface === "interview" && selected
			? `/api/audit-lab/interview/bank?sessionId=${selected.$id}`
			: null,
		fetcher,
	);

	const coverageByDept = useMemo(() => {
		const map: Record<string, { total: number; accepted: number }> = {};
		for (const item of evidence) {
			const name = item.department || "Unassigned";
			map[name] ??= { total: 0, accepted: 0 };
			map[name].total += 1;
			if (item.status === "accepted") map[name].accepted += 1;
		}
		return Object.entries(map).map(([name, stats]) => ({
			name,
			acceptedPct:
				stats.total === 0
					? 0
					: Math.round((stats.accepted / stats.total) * 100),
		}));
	}, [evidence]);

	const filteredEvidence = useMemo(() => {
		return evidence.filter((item) =>
			statusFilter === "all" ? true : item.status === statusFilter,
		);
	}, [evidence, statusFilter]);

	const trendSeries = useMemo(() => {
		return coverageByDept.map((row) => ({
			label: row.name,
			readiness: row.acceptedPct,
			practice: Math.max(0, row.acceptedPct - 8),
		}));
	}, [coverageByDept]);

	const stats = useMemo(() => {
		if (payload?.stats) return payload.stats;
		const upcoming = sessions.filter(
			(s) => s.status === "scheduled" || s.status === "draft",
		).length;
		const missing = evidence.filter((e) => e.status !== "accepted").length;
		return {
			readinessScore: 0,
			readinessTrend: undefined as number | undefined,
			openGaps: payload?.gaps?.length ?? 0,
			openGapsTrendLabel: undefined as string | undefined,
			evidenceCoverage: 0,
			sessionsThisQuarter: upcoming,
			upcoming,
			missing,
		};
	}, [sessions, evidence, payload]);

	async function postJson(url: string, body: unknown) {
		const res = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
		const json = (await res.json()) as { error?: string; data?: unknown };
		if (!res.ok) throw new Error(json.error || "Request failed");
		return json;
	}

	async function patchSession(id: string, body: unknown) {
		const res = await fetch(`/api/audit-lab/sessions/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
		const json = (await res.json()) as { error?: string };
		if (!res.ok) throw new Error(json.error || "Request failed");
	}

	const onError = (err: unknown, fallback: string) => {
		toast({
			title: "Audit Lab",
			description: toUserFacingErrorMessage(err, fallback),
			variant: "destructive",
		});
	};

	const primaryAction =
		surface === "sessions" && canManageSessions ? (
			<Button
				type="button"
				className="btn-primary px-3 sm:px-4"
				onClick={() => setNewOpen(true)}
			>
				<Plus className="h-4 w-4" />
				New session
			</Button>
		) : null;

	return (
		<AuditLabShell
			title={copy.title}
			description={copy.description}
			capabilities={capabilities}
			primaryAction={primaryAction}
		>
			{error ? (
				<LoadError
					scale="section"
					title="Audit Lab didn't load"
					elementKey="audit-lab-client"
					error={{ requestPath: overviewUrl }}
					onRetry={() => void mutate()}
				/>
			) : isLoading ? (
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6 text-slate-600">
						Loading…
					</CardContent>
				</Card>
			) : (
				<>
					{surface === "overview" ? (
						<div className="space-y-6">
							<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
								<MetricStatCard
									title="Readiness score"
									value={`${stats.readinessScore ?? 0}%`}
									icon={ListChecks}
									description={
										typeof stats.readinessTrend === "number" ? (
											<span className="text-green">
												▲ {stats.readinessTrend}
											</span>
										) : undefined
									}
									footer={
										<div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
											<div
												className="h-full rounded-full bg-[#0f5384]"
												style={{
													width: `${Math.min(100, Math.max(0, stats.readinessScore ?? 0))}%`,
												}}
											/>
										</div>
									}
								/>
								<MetricStatCard
									title="Open rehearsal gaps"
									value={stats.openGaps ?? 0}
									icon={ClipboardList}
									description={
										stats.openGapsTrendLabel ? (
											<span className="text-red">
												▼ {stats.openGapsTrendLabel}
											</span>
										) : undefined
									}
								/>
								<MetricStatCard
									title="Evidence coverage"
									value={`${stats.evidenceCoverage ?? 0}%`}
									icon={Globe}
									footer={
										<div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
											<div
												className="h-full rounded-full bg-orange"
												style={{
													width: `${Math.min(100, Math.max(0, stats.evidenceCoverage ?? 0))}%`,
												}}
											/>
										</div>
									}
								/>
								<MetricStatCard
									title="Sessions this quarter"
									value={stats.sessionsThisQuarter ?? 0}
									icon={Calendar}
								/>
							</div>

							<Card className="glass-card">
								<div className="glass-card-cap" />
								<CardContent className="p-4 sm:p-6">
									<div className="mb-4 border-b border-slate-200 pb-4">
										<div className="flex items-center justify-between gap-3">
											<p className="text-sm font-semibold sidebar-gradient-text">
												Suggested for review
											</p>
											<p className="text-xs text-slate-500">
												Risk-based, refreshed daily
											</p>
										</div>
										<p className="mt-1 text-xs text-slate-500">
											Findings most likely to resurface in your next audit.
											Schedule a rehearsal before they do.
										</p>
									</div>
									{(payload?.suggestions?.length ?? 0) > 0 ? (
										<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
											{payload?.suggestions?.map((s) => (
												<div
													key={s.id}
													className="rounded-lg border border-slate-200 bg-white/80 p-4"
												>
													<span
														className={cn(
															"inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
															SUGGESTION_TAG_CLASS[s.tagTone],
														)}
													>
														{s.tag}
													</span>
													<p className="mt-3 text-sm font-semibold text-slate-800">
														{s.title}
													</p>
													<p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
														<Clock className="h-3.5 w-3.5" aria-hidden />
														{s.reason}
													</p>
													{canManageSessions ? (
														<Button
															type="button"
															size="sm"
															className="btn-primary mt-3 w-full!"
															onClick={() => setNewOpen(true)}
														>
															<CalendarClock className="h-3.5 w-3.5" />
															Schedule
														</Button>
													) : null}
												</div>
											))}
										</div>
									) : (
										<p className="text-sm text-slate-500">
											No suggestions yet. Import audit findings to seed drill
											material.
										</p>
									)}
								</CardContent>
							</Card>

							<div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.62fr_1fr]">
								<Card className="glass-card flex max-h-[521px] flex-col">
									<div className="glass-card-cap" />
									<CardContent className="flex min-h-0 flex-1 flex-col p-4 sm:p-6">
										<div className="mb-4 shrink-0 border-b border-slate-200 pb-4">
											<div className="flex items-center justify-between gap-3">
												<p className="text-sm font-semibold sidebar-gradient-text">
													Upcoming sessions
												</p>
												<Link
													href="/audit-lab/sessions"
													className="text-xs font-semibold text-[#0f5384] hover:underline"
												>
													View all
												</Link>
											</div>
											<p className="mt-1 text-xs text-slate-500">
												Rehearsals scheduled across departments this quarter.
											</p>
										</div>
										<div className="min-h-0 flex-1 overflow-y-auto">
											{upcomingItems.length > 0 ? (
												<ul className="divide-y divide-slate-200">
													{pagedUpcoming.map((session) => {
														const participants = parseParticipants(
															session.participantsJson,
														);
														return (
															<li
																key={session.$id}
																className="grid grid-cols-[minmax(0,calc(50%-2.5rem))_4rem_6rem_1fr] items-center gap-2 py-3 first:pt-0 last:pb-0"
															>
																<div className="min-w-0 pr-2">
																	<p className="truncate text-sm font-semibold text-slate-800">
																		{session.title}
																	</p>
																	<p className="truncate text-xs text-slate-500">
																		{session.department}
																		{session.framework
																			? ` · ${session.framework}`
																			: ""}
																	</p>
																</div>
																<div className="flex items-center justify-self-start">
																	{participants.slice(0, 3).map((p) => (
																		<Avatar
																			key={p.userId}
																			userId={p.userId}
																			name={p.name}
																			size="xs"
																			className="-ml-1.5 first:ml-0"
																		/>
																	))}
																	{participants.length > 3 ? (
																		<span className="-ml-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#FCFEFF] bg-slate-200 text-[10px] font-medium text-slate-600">
																			+{participants.length - 3}
																		</span>
																	) : null}
																</div>
																<p className="translate-x-[90px] truncate text-left text-xs text-slate-600">
																	{session.scheduledAt ?? "—"}
																</p>
																<span
																	className={cn(
																		"w-fit shrink-0 justify-self-end whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold",
																		SESSION_STATUS_BADGE[session.status] ??
																			"bg-slate-100 text-slate-600 border-slate-200",
																	)}
																>
																	{sessionStatusLabel(session.status)}
																</span>
															</li>
														);
													})}
												</ul>
											) : (
												<p className="text-sm text-slate-500">
													No sessions scheduled yet.
												</p>
											)}
										</div>
									</CardContent>
									{upcomingTotalPages > 1 ? (
										<div className="shrink-0 rounded-b-lg border-t border-slate-200/80 bg-slate-50/60 px-4 sm:px-6">
											<PageIndex
												page={upcomingPageSafe}
												totalItems={upcomingItems.length}
												pageSize={UPCOMING_PAGE_SIZE}
												onPageChange={setUpcomingPage}
												hideWhenSinglePage
												className="mx-0 my-3 justify-between px-0"
											/>
										</div>
									) : null}
								</Card>

								<Card className="glass-card flex max-h-[521px] flex-col">
									<div className="glass-card-cap" />
									<CardContent className="flex min-h-0 flex-1 flex-col p-4 sm:p-6">
										<div className="mb-4 shrink-0 border-b border-slate-200 pb-4">
											<p className="text-sm font-semibold sidebar-gradient-text">
												Recent activity
											</p>
											<p className="mt-1 text-xs text-slate-500">
												What changed across sessions, evidence, and gaps.
											</p>
										</div>
										{(payload?.activity?.length ?? 0) > 0 ? (
											<ul className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
												{payload?.activity?.map((item) => (
													<li key={item.id} className="flex gap-2.5">
														<span
															className={cn(
																"mt-1.5 h-2 w-2 shrink-0 rounded-full",
																ACTIVITY_DOT_CLASS[item.tone],
															)}
															aria-hidden
														/>
														<div className="min-w-0">
															<p className="text-sm text-slate-700">
																<BoldText text={item.text} />
															</p>
															<p className="text-xs text-slate-500">
																{item.timestamp}
															</p>
														</div>
													</li>
												))}
											</ul>
										) : (
											<p className="text-sm text-slate-500">
												No recent activity.
											</p>
										)}
									</CardContent>
								</Card>
							</div>
						</div>
					) : null}

					{surface === "sessions" ? (
						<div className="space-y-4">
							{sessions.length === 0 ? (
								<p className="text-sm text-slate-500">
									No sessions yet. Schedule your first review.
								</p>
							) : (
								<CaalmDataTable className="pt-2">
									<TableHeader>
										<TableRow className="border-slate-200/80 hover:bg-transparent">
											<TableHead>Session</TableHead>
											<TableHead>Framework</TableHead>
											<TableHead>Scheduled</TableHead>
											<TableHead>Status</TableHead>
											<TableHead />
										</TableRow>
									</TableHeader>
									<TableBody>
										{sessions.map((session) => (
											<TableRow key={session.$id}>
												<TableCell>
													<Link
														href={`/audit-lab/sessions/${session.$id}`}
														className="font-medium text-[#0f5384]"
													>
														{session.title}
													</Link>
													<p className="text-xs text-slate-500">
														{session.department}
													</p>
												</TableCell>
												<TableCell className="text-sm text-slate-600">
													{session.framework ?? "—"}
												</TableCell>
												<TableCell className="text-sm text-slate-600">
													{session.scheduledAt ?? "—"}
												</TableCell>
												<TableCell className="text-sm">
													{session.status}
												</TableCell>
												<TableCell>
													{canManageSessions &&
													session.status !== "cancelled" ? (
														<Button
															type="button"
															variant="outline"
															size="sm"
															onClick={() => {
																setSelectedId(session.$id);
																setCancelOpen(true);
															}}
														>
															Cancel
														</Button>
													) : null}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</CaalmDataTable>
							)}
						</div>
					) : null}

					{surface === "interview" ? (
						<div className="space-y-4">
							<div className="flex flex-wrap items-center gap-3">
								<select
									className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
									value={selected?.$id ?? ""}
									onChange={(e) => setSelectedId(e.target.value)}
									aria-label="Session for interview"
								>
									{sessions.map((s) => (
										<option key={s.$id} value={s.$id}>
											{s.title}
										</option>
									))}
								</select>
								{canManageSessions && selected ? (
									<>
										<Button
											type="button"
											className="btn-primary"
											disabled={busy}
											onClick={async () => {
												setBusy(true);
												try {
													await postJson("/api/audit-lab/interview", {
														action: "generate_bank",
														sessionId: selected.$id,
													});
													await mutateBank();
												} catch (err) {
													onError(err, "I couldn't generate questions.");
												} finally {
													setBusy(false);
												}
											}}
										>
											<ClipboardList className="h-4 w-4" />
											Generate questions
										</Button>
										<Button
											type="button"
											variant="outline"
											disabled={busy}
											onClick={async () => {
												setBusy(true);
												try {
													await postJson("/api/audit-lab/interview", {
														action: "import_findings",
														sessionId: selected.$id,
													});
													await mutateBank();
												} catch (err) {
													onError(err, "I couldn't import findings.");
												} finally {
													setBusy(false);
												}
											}}
										>
											Import findings
										</Button>
										<Button
											type="button"
											variant="outline"
											disabled={busy}
											onClick={async () => {
												setBusy(true);
												try {
													await postJson("/api/audit-lab/interview", {
														action: "script",
														sessionId: selected.$id,
													});
													await mutateBank();
												} catch (err) {
													onError(err, "I couldn't build the script.");
												} finally {
													setBusy(false);
												}
											}}
										>
											Seed script
										</Button>
									</>
								) : null}
							</div>
							{selected ? (
								<InterviewScriptCanvas
									key={`${selected.$id}-${bankData?.data?.version ?? 0}-${bankData?.data?.questions?.length ?? 0}`}
									sessionId={selected.$id}
									questions={bankData?.data?.questions ?? []}
									initialItemsJson={bankData?.data?.script?.itemsJson}
									initialVersion={
										bankData?.data?.version ??
										bankData?.data?.script?.version ??
										0
									}
									canEdit={canManageSessions}
								/>
							) : (
								<p className="text-sm text-slate-500">
									Schedule a session before building an interview script.
								</p>
							)}
						</div>
					) : null}

					{surface === "evidence" ? (
						<div className="space-y-4">
							{coverageByDept.length > 0 ? (
								<CoverageChart byDepartment={coverageByDept} />
							) : null}
							<div className="flex flex-wrap items-center gap-3">
								{canManageEvidence && selected ? (
									<Button
										type="button"
										className="btn-primary px-3 sm:px-4"
										disabled={busy}
										onClick={async () => {
											setBusy(true);
											try {
												await postJson("/api/audit-lab/evidence", {
													action: "generate",
													sessionId: selected.$id,
												});
												await mutate();
											} catch (err) {
												onError(err, "I couldn't generate the evidence list.");
											} finally {
												setBusy(false);
											}
										}}
									>
										<ListChecks className="h-4 w-4" />
										Generate evidence list
									</Button>
								) : null}
								<SegmentedToggle
									value={evidenceGroup}
									onChange={setEvidenceGroup}
									ariaLabel="Group evidence by"
									tabs={[
										{ value: "department", label: "Department" },
										{ value: "owner", label: "Owner" },
										{ value: "assignee", label: "Assignee" },
									]}
								/>
								<select
									className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
									value={statusFilter}
									onChange={(e) => setStatusFilter(e.target.value)}
									aria-label="Status filter"
								>
									<option value="all">All statuses</option>
									<option value="not_started">Not started</option>
									<option value="in_progress">In progress</option>
									<option value="internal_review">Internal review</option>
									<option value="submitted">Submitted</option>
									<option value="follow_up_requested">Follow-up</option>
									<option value="accepted">Accepted</option>
									<option value="rejected_resubmit">Rejected</option>
								</select>
							</div>
							{filteredEvidence.length === 0 ? (
								<CaalmDataTableEmpty
									title="No evidence requests"
									description="Generate a list from the session scope."
								/>
							) : (
								<CaalmDataTable className="pt-2">
									<TableHeader>
										<TableRow className="hover:bg-transparent">
											<TableHead>Ref / title</TableHead>
											<TableHead>
												{evidenceGroup === "department"
													? "Department"
													: evidenceGroup === "owner"
														? "Owner"
														: "Assignee"}
											</TableHead>
											<TableHead>Due</TableHead>
											<TableHead>Status</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{filteredEvidence.map((item) => {
											const groupValue =
												evidenceGroup === "department"
													? item.department
													: evidenceGroup === "owner"
														? item.ownerUserId
														: item.assigneeUserId;
											return (
												<TableRow key={item.$id}>
													<TableCell>
														<Link
															href={`/audit-lab/evidence/${item.$id}`}
															className="font-medium text-[#0f5384]"
														>
															{item.title}
														</Link>
														<p className="text-xs text-slate-500">
															{item.controlRef ?? "—"}
															{item.ownerUserId &&
															item.assigneeUserId &&
															item.ownerUserId === item.assigneeUserId
																? " · single-person"
																: ""}
														</p>
													</TableCell>
													<TableCell className="text-sm text-slate-600">
														{groupValue ?? "—"}
													</TableCell>
													<TableCell className="text-sm text-slate-600">
														{item.dueAt ?? "—"}
													</TableCell>
													<TableCell className="text-sm">
														{item.status}
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</CaalmDataTable>
							)}
						</div>
					) : null}

					{surface === "practice" ? (
						<PracticeRoundPanel
							sessions={sessions}
							canPractice={canPractice}
							canScore={canScore}
						/>
					) : null}

					{surface === "reports" ? (
						<div className="space-y-4">
							{trendSeries.length > 0 ? (
								<TrendChart series={trendSeries} />
							) : null}
							<div className="flex flex-wrap gap-3">
								<a
									href="/api/audit-lab/reports/export"
									className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700"
								>
									Download CSV
								</a>
							</div>
							<ul className="space-y-1 text-sm text-slate-600">
								{(payload?.reports ?? []).map((r) => (
									<li key={r.$id}>
										{r.kind} report{" "}
										<span className="text-slate-400">{r.$id}</span>
									</li>
								))}
							</ul>
							{(payload?.reports?.length ?? 0) === 0 ? (
								<p className="text-sm text-slate-500">
									No published reports yet. Complete a session to generate one.
								</p>
							) : null}
						</div>
					) : null}
				</>
			)}

			<NewSessionDialog
				open={newOpen}
				onOpenChange={setNewOpen}
				onSubmit={async (body) => {
					const json = await postJson("/api/audit-lab/sessions", body);
					const created = json.data as ReviewSession | undefined;
					await mutate(
						(current) => {
							if (!created) return current;
							const rows = current?.data?.sessions ?? sessions;
							return {
								data: {
									...current?.data,
									sessions: [
										created,
										...rows.filter((s) => s.$id !== created.$id),
									],
								},
							};
						},
						{ revalidate: true },
					);
				}}
			/>

			<ConfirmDialog
				open={cancelOpen}
				onOpenChange={setCancelOpen}
				icon={<Calendar className="h-5 w-5" />}
				title="Cancel this session?"
				description="Invitees will keep the record, but the session will no longer run."
				confirmLabel="Cancel session"
				onConfirm={async () => {
					if (!selectedId) return;
					try {
						await patchSession(selectedId, { action: "cancel" });
						await mutate();
					} catch (err) {
						onError(err, "I couldn't cancel that session.");
					}
				}}
			/>
		</AuditLabShell>
	);
}
