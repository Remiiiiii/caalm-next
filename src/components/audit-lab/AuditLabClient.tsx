"use client";

import {
	Calendar,
	ClipboardList,
	GraduationCap,
	ListChecks,
	Plus,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { AuditLabShell } from "@/components/audit-lab/AuditLabShell";
import {
	type AuditLabSurface,
	SURFACE_COPY,
} from "@/components/audit-lab/audit-lab-surfaces";
import { NewSessionDialog } from "@/components/audit-lab/NewSessionDialog";
import { LoadError } from "@/components/LoadError";
import { Button } from "@/components/ui/button";
import {
	CaalmDataTable,
	CaalmDataTableEmpty,
} from "@/components/ui/caalm-data-table";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MetricStatCard } from "@/components/ui/metric-stat-card";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import type { LabCapabilities } from "@/lib/audit-lab/access";
import type { EvidenceRequest, ReviewSession } from "@/lib/audit-lab/types";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";
import { fetcher } from "@/lib/swr-config";

type OverviewPayload = {
	stats?: {
		readinessScore: number;
		openGaps: number;
		evidenceCoverage: number;
		sessionsThisQuarter: number;
	};
	suggestions?: Array<{ id: string; title: string; reason: string }>;
	upcoming?: ReviewSession[];
	sessions?: ReviewSession[];
	evidence?: EvidenceRequest[];
	gaps?: Array<{ $id: string; description: string; status: string }>;
	reports?: Array<{ $id: string; kind: string }>;
};

export function AuditLabClient({
	surface,
	capabilities,
}: {
	surface: AuditLabSurface;
	capabilities: LabCapabilities;
}) {
	const copy = SURFACE_COPY[surface];
	const canManageSessions = capabilities.canCreateSession;
	const canManageEvidence = capabilities.canManageEvidence;
	const canPractice = capabilities.canRunPractice;

	const { toast } = useToast();
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [cancelOpen, setCancelOpen] = useState(false);
	const [newOpen, setNewOpen] = useState(false);
	const [busy, setBusy] = useState(false);

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

	const stats = useMemo(() => {
		if (payload?.stats) return payload.stats;
		const upcoming = sessions.filter(
			(s) => s.status === "scheduled" || s.status === "draft",
		).length;
		const missing = evidence.filter((e) => e.status !== "accepted").length;
		return {
			readinessScore: 0,
			openGaps: payload?.gaps?.length ?? 0,
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
								/>
								<MetricStatCard
									title="Open rehearsal gaps"
									value={stats.openGaps ?? 0}
									icon={ClipboardList}
								/>
								<MetricStatCard
									title="Evidence coverage"
									value={`${stats.evidenceCoverage ?? 0}%`}
									icon={GraduationCap}
								/>
								<MetricStatCard
									title="Sessions this quarter"
									value={stats.sessionsThisQuarter ?? 0}
									icon={Calendar}
								/>
							</div>
							{(payload?.suggestions?.length ?? 0) > 0 ? (
								<ul className="space-y-2">
									{payload?.suggestions?.map((s) => (
										<li
											key={s.id}
											className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
										>
											<strong>{s.title}</strong>
											<span className="text-slate-500"> — {s.reason}</span>
										</li>
									))}
								</ul>
							) : (
								<p className="text-sm text-slate-500">
									No suggestions yet. Import audit findings to seed drill
									material.
								</p>
							)}
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
						<SurfaceSessionTools
							label="Interview Builder"
							selected={selected}
							canManage={canManageSessions}
							busy={busy}
							setBusy={setBusy}
							onError={onError}
							postJson={postJson}
							actions={[
								{
									key: "generate_bank",
									label: "Generate questions",
									icon: ClipboardList,
								},
								{
									key: "import_findings",
									label: "Import findings",
									variant: "outline" as const,
								},
								{
									key: "script",
									label: "Build script",
									variant: "outline" as const,
								},
							]}
						/>
					) : null}

					{surface === "evidence" ? (
						<div className="space-y-4">
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
							{evidence.length === 0 ? (
								<CaalmDataTableEmpty
									title="No evidence requests"
									description="Generate a list from the session scope."
								/>
							) : (
								<ul className="space-y-2">
									{evidence.map((item) => (
										<li
											key={item.$id}
											className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
										>
											<Link
												href={`/audit-lab/evidence/${item.$id}`}
												className="text-[#0f5384]"
											>
												{item.title}
											</Link>
											<span className="text-xs text-slate-500">
												{item.controlRef} · {item.status}
											</span>
										</li>
									))}
								</ul>
							)}
						</div>
					) : null}

					{surface === "practice" ? (
						<div className="space-y-3">
							<p className="text-sm text-slate-600">
								Practice against an auditor persona. Honest “I don’t know, I’ll
								find out” answers score as acceptable.
							</p>
							{canPractice && selected ? (
								<Button
									type="button"
									className="btn-primary px-3 sm:px-4"
									disabled={busy}
									onClick={async () => {
										setBusy(true);
										try {
											const json = await postJson("/api/audit-lab/practice", {
												action: "start",
												sessionId: selected.$id,
											});
											const attempt = (
												json.data as { attempt?: { $id?: string } }
											)?.attempt;
											if (attempt?.$id) {
												toast({
													title: "Practice started",
													description: "Continue on the practice detail page.",
												});
											}
										} catch (err) {
											onError(err, "I couldn't start practice.");
										} finally {
											setBusy(false);
										}
									}}
								>
									<GraduationCap className="h-4 w-4" />
									Start practice
								</Button>
							) : (
								<p className="text-sm text-slate-600">
									Practice needs the run practice permission.
								</p>
							)}
						</div>
					) : null}

					{surface === "reports" ? (
						<div className="space-y-2 text-sm text-slate-600">
							<p>
								Session reports are created when a session reaches completed or
								report ready.
							</p>
							<ul className="space-y-1">
								{(payload?.reports ?? []).map((r) => (
									<li key={r.$id}>
										{r.kind} report{" "}
										<span className="text-slate-400">{r.$id}</span>
									</li>
								))}
							</ul>
							{(payload?.reports?.length ?? 0) === 0 ? (
								<p className="text-slate-500">No published reports yet.</p>
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

function SurfaceSessionTools({
	label,
	selected,
	canManage,
	busy,
	setBusy,
	onError,
	postJson,
	actions,
}: {
	label: string;
	selected?: ReviewSession;
	canManage: boolean;
	busy: boolean;
	setBusy: (v: boolean) => void;
	onError: (e: unknown, m: string) => void;
	postJson: (url: string, body: unknown) => Promise<{ data?: unknown }>;
	actions: Array<{
		key: string;
		label: string;
		icon?: typeof ClipboardList;
		variant?: "outline";
	}>;
}) {
	const { toast } = useToast();
	return (
		<div className="space-y-3">
			<p className="text-sm text-slate-600">
				{selected
					? `Working on ${selected.title}.`
					: `Pick a session on ${label}.`}
			</p>
			{canManage && selected ? (
				<div className="flex flex-wrap gap-3">
					{actions.map((action) => {
						const Icon = action.icon;
						return (
							<Button
								key={action.key}
								type="button"
								className={
									action.variant === "outline"
										? undefined
										: "btn-primary px-3 sm:px-4"
								}
								variant={action.variant}
								disabled={busy}
								onClick={async () => {
									setBusy(true);
									try {
										await postJson("/api/audit-lab/interview", {
											action: action.key,
											sessionId: selected.$id,
										});
										toast({ title: "Saved", description: action.label });
									} catch (err) {
										onError(err, `I couldn't run ${action.label}.`);
									} finally {
										setBusy(false);
									}
								}}
							>
								{Icon ? <Icon className="h-4 w-4" /> : null}
								{action.label}
							</Button>
						);
					})}
				</div>
			) : null}
		</div>
	);
}
