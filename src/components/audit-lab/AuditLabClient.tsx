"use client";

import { Calendar, ClipboardList, GraduationCap, ListChecks } from "lucide-react";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { AuditsSectionNav } from "@/components/audits/AuditsSectionNav";
import { AuditPageShell } from "@/components/audits/AuditPageShell";
import { LoadError } from "@/components/LoadError";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { MetricStatCard } from "@/components/ui/metric-stat-card";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { useToast } from "@/hooks/use-toast";
import type { EvidenceRequest, ReviewSession } from "@/lib/audit-lab/types";
import { fetcher } from "@/lib/swr-config";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";

type Tab = "sessions" | "interview" | "evidence" | "practice";

type Overview = {
	sessions: ReviewSession[];
	evidence: EvidenceRequest[];
	gaps: Array<{ $id: string; description: string; status: string }>;
	reports: Array<{ $id: string; kind: string }>;
};

export function AuditLabClient({
	canManageSessions,
	canManageEvidence,
	canPractice,
}: {
	canManageSessions: boolean;
	canManageEvidence: boolean;
	canPractice: boolean;
}) {
	const { toast } = useToast();
	const [tab, setTab] = useState<Tab>("sessions");
	const [department, setDepartment] = useState("");
	const [scheduledAt, setScheduledAt] = useState("");
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [cancelOpen, setCancelOpen] = useState(false);
	const [busy, setBusy] = useState(false);

	const { data, error, isLoading, mutate } = useSWR<{ data?: Overview }>(
		"/api/audit-lab/sessions",
		fetcher,
	);
	const overview = data?.data;
	const sessions = overview?.sessions ?? [];
	const evidence = overview?.evidence ?? [];
	const selected = sessions.find((s) => s.$id === selectedId) ?? sessions[0];

	const stats = useMemo(() => {
		const upcoming = sessions.filter(
			(s) => s.status === "scheduled" || s.status === "draft",
		).length;
		const missing = evidence.filter((e) => e.status !== "accepted").length;
		return { upcoming, missing, gaps: overview?.gaps.length ?? 0 };
	}, [sessions, evidence, overview?.gaps.length]);

	async function postJson(url: string, body: unknown) {
		const res = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
		const json = (await res.json()) as { error?: string; data?: unknown };
		if (!res.ok) {
			throw new Error(json.error || "Request failed");
		}
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

	return (
		<AuditPageShell
			title="Audit Lab"
			subtitle="Schedule mock audits, build interview scripts, track evidence, and practice against an auditor."
		>
			<AuditsSectionNav />
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
				<MetricStatCard title="Upcoming sessions" value={stats.upcoming} />
				<MetricStatCard title="Open evidence items" value={stats.missing} />
				<MetricStatCard title="Rehearsal gaps" value={stats.gaps} />
			</div>

			<SegmentedToggle<Tab>
				value={tab}
				onChange={setTab}
				ariaLabel="Audit Lab sections"
				className="mb-6"
				tabs={[
					{ value: "sessions", label: "Sessions", icon: Calendar },
					{ value: "interview", label: "Interview", icon: ClipboardList },
					{ value: "evidence", label: "Evidence", icon: ListChecks },
					{ value: "practice", label: "Practice", icon: GraduationCap },
				]}
			/>

			{error ? (
				<LoadError
					title="Audit Lab didn't load"
					description="I couldn't load Audit Lab. Please try again."
					error={error}
					onRetry={() => {
						void mutate();
					}}
				/>
			) : isLoading ? (
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6 text-slate-600">
						Loading sessions…
					</CardContent>
				</Card>
			) : (
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6 text-slate-700 space-y-4">
						{tab === "sessions" && (
							<>
								{canManageSessions ? (
									<form
										className="flex flex-wrap items-end gap-3"
										onSubmit={async (event) => {
											event.preventDefault();
											setBusy(true);
											try {
												const json = await postJson("/api/audit-lab/sessions", {
													department,
													scheduledAt: scheduledAt || undefined,
												});
												setDepartment("");
												const created = json.data as ReviewSession | undefined;
												await mutate(
													(current) => {
														if (!created) return current;
														const sessions = current?.data?.sessions ?? [];
														return {
															data: {
																sessions: [
																	created,
																	...sessions.filter((s) => s.$id !== created.$id),
																],
																evidence: current?.data?.evidence ?? [],
																gaps: current?.data?.gaps ?? [],
																reports: current?.data?.reports ?? [],
															},
														};
													},
													{ revalidate: true },
												);
											} catch (err) {
												onError(err, "I couldn't schedule that session.");
											} finally {
												setBusy(false);
											}
										}}
									>
										<div>
											<label className="text-xs text-slate-500">Department</label>
											<Input
												className="border-[0.25px] border-slate-300"
												value={department}
												onChange={(e) => setDepartment(e.target.value)}
												placeholder="Finance"
											/>
										</div>
										<div>
											<label className="text-xs text-slate-500">When</label>
											<Input
												type="datetime-local"
												className="border-[0.25px] border-slate-300"
												value={scheduledAt}
												onChange={(e) => setScheduledAt(e.target.value)}
											/>
										</div>
										<Button
											type="submit"
											className="btn-primary px-3 sm:px-4"
											disabled={busy || !department.trim()}
										>
											<Calendar className="h-4 w-4" />
											Schedule
										</Button>
									</form>
								) : (
									<p className="text-sm text-slate-600">
										You can view scheduled sessions. Creating sessions needs extra
										permission.
									</p>
								)}
								<ul className="space-y-2">
									{sessions.length === 0 ? (
										<li className="text-sm text-slate-500">
											No sessions yet. Schedule a department review to start.
										</li>
									) : (
										sessions.map((session) => (
											<li
												key={session.$id}
												className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2"
											>
												<button
													type="button"
													className="text-left cursor-pointer"
													onClick={() => setSelectedId(session.$id)}
												>
													<p className="font-medium text-[#0f5384]">
														{session.title}
													</p>
													<p className="text-xs text-slate-500">
														{session.department} · {session.status}
														{session.scheduledAt
															? ` · ${session.scheduledAt}`
															: ""}
													</p>
												</button>
												{canManageSessions && session.status !== "cancelled" ? (
													<Button
														type="button"
														variant="outline"
														onClick={() => {
															setSelectedId(session.$id);
															setCancelOpen(true);
														}}
													>
														Cancel
													</Button>
												) : null}
											</li>
										))
									)}
								</ul>
							</>
						)}

						{tab === "interview" && (
							<div className="space-y-3">
								<p className="text-sm text-slate-600">
									{selected
										? `Working on ${selected.title}.`
										: "Select a session first."}
								</p>
								{canManageSessions && selected ? (
									<div className="flex flex-wrap gap-3">
										<Button
											type="button"
											className="btn-primary px-3 sm:px-4"
											disabled={busy}
											onClick={async () => {
												setBusy(true);
												try {
													await postJson("/api/audit-lab/interview", {
														action: "generate_bank",
														sessionId: selected.$id,
													});
													toast({
														title: "Question bank ready",
														description: "Three starter questions were added.",
													});
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
													toast({
														title: "Imported from findings",
														description: "Prior-year findings are now drill questions.",
													});
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
													toast({
														title: "Script saved",
														description: "A timed script version was stored.",
													});
												} catch (err) {
													onError(err, "I couldn't build the script.");
												} finally {
													setBusy(false);
												}
											}}
										>
											Build script
										</Button>
									</div>
								) : null}
							</div>
						)}

						{tab === "evidence" && (
							<div className="space-y-3">
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
								<ul className="space-y-2">
									{evidence.length === 0 ? (
										<li className="text-sm text-slate-500">
											No evidence requests yet.
										</li>
									) : (
										evidence.map((item) => (
											<li
												key={item.$id}
												className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
											>
												<span>
													{item.title}
													<span className="ml-2 text-xs text-slate-500">
														{item.controlRef} · {item.status}
													</span>
												</span>
											</li>
										))
									)}
								</ul>
							</div>
						)}

						{tab === "practice" && (
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
												const first = (
													json.data as {
														firstQuestion?: { prompt?: string };
													}
												)?.firstQuestion?.prompt;
												toast({
													title: "Practice started",
													description:
														first || "Answer the first question in Ask CAALM.",
												});
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
										Practice is view-only for your permission set.
									</p>
								)}
							</div>
						)}
					</CardContent>
				</Card>
			)}

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
		</AuditPageShell>
	);
}
