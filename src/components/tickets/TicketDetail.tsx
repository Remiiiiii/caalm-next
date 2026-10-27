"use client";

import {
	CheckCircle2,
	ExternalLink,
	FileText,
	Hand,
	Info,
	Paperclip,
	RefreshCw,
	Send,
	TriangleAlert,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Avatar from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useOrgTimezone } from "@/hooks/useOrgTimezone";
import {
	getEnterpriseFormatHint,
	getEnterpriseInputAccept,
	validateEnterpriseFile,
} from "@/lib/files/enterprise-file-formats";
import type { UserProfile } from "@/lib/tickets/submitter-avatars";
import type {
	GitHubIssueSnapshot,
	Ticket,
	TicketEvent,
} from "@/lib/tickets/ticket.types";
import { resolveTicketLane } from "@/lib/tickets/ticket.types";
import type { TicketAttachmentInfo } from "@/lib/tickets/ticket-attachments";
import { cn } from "@/lib/utils";
import { AgentCanvasWorkspace } from "./detail/AgentCanvasWorkspace";
import { formatTicketDateTime } from "./detail/format";
import { TicketAuditTrail } from "./detail/TicketAuditTrail";
import { TicketDetailCard } from "./detail/TicketDetailCard";
import { TicketSlaCard } from "./detail/TicketSlaCard";
import { TicketAttachments } from "./TicketAttachments";

const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const FRESH_SYNC_MS = 5 * 60 * 1000;

type AttachmentEntry = { id: string; file: File };

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseEventMetadata(
	metadata: string | null | undefined,
): Record<string, unknown> | null {
	if (!metadata) return null;
	try {
		const parsed = JSON.parse(metadata) as unknown;
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
			return parsed as Record<string, unknown>;
		}
	} catch {
		return null;
	}
	return null;
}

function SidebarCard({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<Card className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="space-y-3 p-4 sm:p-6">
				<p className="text-sm font-medium sidebar-gradient-text">{title}</p>
				{children}
			</CardContent>
		</Card>
	);
}

export function TicketDetail({
	ticket: initialTicket,
	events,
	attachments: ticketAttachments,
	profiles,
	canClaim,
	canClose,
	canEscalate,
	canStartFixAgent,
}: {
	ticket: Ticket;
	events: TicketEvent[];
	attachments: TicketAttachmentInfo[];
	/** Names and photos by user id (submitter, assignee, event actors). */
	profiles: Record<string, UserProfile>;
	canClaim: boolean;
	canClose: boolean;
	canEscalate: boolean;
	canStartFixAgent: boolean;
}) {
	const timeZone = useOrgTimezone();
	// Stopping the agent updates the ticket in place.
	const [override, setOverride] = useState<Partial<Ticket>>({});
	const ticket: Ticket = { ...initialTicket, ...override };
	const [stopping, setStopping] = useState(false);
	const lane = resolveTicketLane(ticket);
	const isOpen = ticket.status !== "RESOLVED";
	const showClaim = canClaim && !ticket.assigneeCaalmUserId && isOpen;
	const showClose = canClose && isOpen;
	const showEscalate = canEscalate && lane === "help" && isOpen;
	const showAgentPanel =
		lane === "engineering" || Boolean(ticket.githubIssueNumber);

	const [issue, setIssue] = useState<GitHubIssueSnapshot | null>(null);
	const [syncedAt, setSyncedAt] = useState<number | null>(null);
	const [loading, setLoading] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [instructions, setInstructions] = useState("");
	const [attachments, setAttachments] = useState<AttachmentEntry[]>([]);
	const [fileError, setFileError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const loadIssue = useCallback(async () => {
		if (!ticket.githubIssueNumber) return;
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(`/api/tickets/${ticket.$id}/github`);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to load GitHub issue");
			setIssue(data.issue);
			setSyncedAt(Date.now());
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load issue");
		} finally {
			setLoading(false);
		}
	}, [ticket.$id, ticket.githubIssueNumber]);

	useEffect(() => {
		if (showAgentPanel) void loadIssue();
	}, [loadIssue, showAgentPanel]);

	const issueTitle = issue?.title || ticket.title;
	const freshlySynced =
		syncedAt !== null && Date.now() - syncedAt < FRESH_SYNC_MS;

	const addFiles = useCallback((fileList: FileList | File[]) => {
		const incoming = Array.from(fileList);
		if (incoming.length === 0) return;

		setFileError(null);
		setAttachments((prev) => {
			const next = [...prev];
			for (const file of incoming) {
				if (next.length >= MAX_FILES) {
					setFileError(`You can attach up to ${MAX_FILES} files.`);
					break;
				}
				const validation = validateEnterpriseFile(file, "attachment");
				if (!validation.ok) {
					setFileError(validation.reason);
					continue;
				}
				if (file.size > MAX_FILE_BYTES) {
					setFileError(`${file.name} exceeds the 10 MB limit.`);
					continue;
				}
				next.push({
					id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
					file,
				});
			}
			return next;
		});
	}, []);

	const removeFile = useCallback((id: string) => {
		setAttachments((prev) => prev.filter((entry) => entry.id !== id));
		setFileError(null);
	}, []);

	const clearDraft = useCallback(() => {
		setInstructions("");
		setAttachments([]);
		setFileError(null);
		if (fileInputRef.current) fileInputRef.current.value = "";
	}, []);

	const runAction = async (
		path: "claim" | "close" | "escalate" | "resolve",
		body?: FormData | Record<string, unknown>,
	) => {
		setBusy(true);
		setError(null);
		try {
			const init: RequestInit = { method: "POST" };
			if (body instanceof FormData) {
				init.body = body;
			} else if (body) {
				init.headers = { "Content-Type": "application/json" };
				init.body = JSON.stringify(body);
			}
			const res = await fetch(`/api/tickets/${ticket.$id}/${path}`, init);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Action failed");
			window.location.reload();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Action failed");
		} finally {
			setBusy(false);
		}
	};

	const onStartFixAgent = async () => {
		const form = new FormData();
		const trimmed = instructions.trim();
		if (trimmed) form.set("instructions", trimmed);
		for (const entry of attachments.slice(0, MAX_FILES)) {
			form.append("attachments", entry.file);
		}
		await runAction("resolve", form);
	};

	const onStopFixAgent = async () => {
		setStopping(true);
		setError(null);
		try {
			const res = await fetch(`/api/tickets/${ticket.$id}/fix-agent`, {
				method: "DELETE",
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to stop the agent");
			setOverride(data.ticket);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to stop the agent");
		} finally {
			setStopping(false);
		}
	};

	const agentActive = Boolean(ticket.cursorAgentRunId);
	const hasDraft = Boolean(instructions.trim() || attachments.length > 0);
	const agentLabel = busy
		? "Starting agent…"
		: hasDraft
			? "Start fix agent with instructions"
			: "Start fix agent";

	const lastFailureReason = useMemo(() => {
		for (let i = events.length - 1; i >= 0; i -= 1) {
			const event = events[i];
			if (event.eventType !== "FAILED") continue;
			const meta = parseEventMetadata(event.metadata);
			const message = meta?.error;
			if (typeof message === "string" && message.trim()) return message.trim();
		}
		return null;
	}, [events]);

	const actorNames = useMemo(() => {
		const names: Record<string, string> = {};
		for (const [id, profile] of Object.entries(profiles)) {
			if (profile.name) names[id] = profile.name;
		}
		return names;
	}, [profiles]);

	const assignee = ticket.assigneeCaalmUserId
		? profiles[ticket.assigneeCaalmUserId]
		: undefined;
	const submitter = profiles[ticket.submittedByUserId];
	const errorMessage =
		ticket.status === "FAILED" ? error || lastFailureReason : error;

	return (
		<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
			<div className="min-w-0 space-y-5">
				{errorMessage ? (
					<p
						role="alert"
						className="rounded-md border border-red/20 bg-red/5 px-3 py-2 text-sm text-red"
					>
						{errorMessage}
					</p>
				) : null}

				<TicketDetailCard
					ticket={ticket}
					timeZone={timeZone}
					submitterName={submitter?.name || ticket.submittedByName}
					submitterAvatarUrl={submitter?.avatarUrl}
				/>

				<TicketAttachments
					ticketId={ticket.$id}
					attachments={ticketAttachments}
				/>

				{showAgentPanel ? (
					agentActive ? (
						<Card className="glass-card overflow-hidden p-0">
							<div className="glass-card-cap" />
							<div className="mt-4 space-y-3 px-4 pb-4 sm:px-6">
								<p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#0f5384]">
									Fix agent workspace
								</p>
								<AgentCanvasWorkspace
									ticket={ticket}
									canControl={canStartFixAgent}
									stopping={stopping}
									onStop={() => void onStopFixAgent()}
								/>
							</div>
						</Card>
					) : (
						<Card className="glass-card overflow-hidden p-0">
							<div className="glass-card-cap" />
							<div className="mt-4 space-y-2 px-4 py-4 sm:px-6">
								<div className="flex items-center justify-between gap-2">
									<p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-500">
										Direct the agent
									</p>
									<span className="text-[9px] uppercase tracking-[0.04em] text-slate-500">
										Optional
									</span>
								</div>
								<div className="overflow-hidden rounded-md border border-[#078FAB] bg-white/80 transition-all duration-200 focus-within:border-[#078FAB] focus-within:ring-2 focus-within:ring-[#078FAB]/20">
									<Textarea
										value={instructions}
										onChange={(event) => setInstructions(event.target.value)}
										placeholder={
											'Tell the agent how to fix this — e.g. "Focus on the accordion collapse behavior, don\'t touch the search bar". Leave blank to run automatically.'
										}
										className="min-h-18 resize-none rounded-none border-0! bg-transparent px-3.5 pb-1.5 pt-3 text-[13px] text-slate-700 shadow-none! ring-0! focus-visible:border-0! focus-visible:shadow-none! focus-visible:ring-0!"
										disabled={!canStartFixAgent || busy}
									/>
									{attachments.length > 0 ? (
										<ul className="space-y-1.5 px-3 pb-2">
											{attachments.map((entry) => (
												<li
													key={entry.id}
													className="flex items-center gap-2 rounded-md border border-slate-200/60 bg-slate-50/80 px-2.5 py-1.5 text-xs"
												>
													<FileText
														className="h-3.5 w-3.5 shrink-0 text-slate-600"
														aria-hidden
													/>
													<span className="truncate text-slate-700">
														{entry.file.name}
													</span>
													<span className="shrink-0 text-[10px] text-slate-500">
														{formatFileSize(entry.file.size)}
													</span>
													<button
														type="button"
														onClick={() => removeFile(entry.id)}
														disabled={busy}
														className="ml-auto shrink-0 cursor-pointer rounded p-0.5 text-slate-500 transition-colors duration-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 disabled:cursor-not-allowed disabled:opacity-50"
														aria-label={`Remove ${entry.file.name}`}
													>
														<X className="h-3.5 w-3.5" aria-hidden />
													</button>
												</li>
											))}
										</ul>
									) : null}
									{fileError ? (
										<p className="px-3.5 pb-1.5 text-[11px] text-red">
											{fileError}
										</p>
									) : null}
									<div className="flex items-center gap-2 px-2.5 pb-2.5 pl-3">
										<button
											type="button"
											onClick={() => fileInputRef.current?.click()}
											disabled={!canStartFixAgent || busy}
											className={cn(
												"inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
												(!canStartFixAgent || busy) &&
													"cursor-not-allowed opacity-50",
											)}
											title={`Attach files (max ${MAX_FILES}, 10 MB each)`}
											aria-label="Attach files"
										>
											<Paperclip className="h-5 w-5" aria-hidden />
										</button>
										<span className="text-xs text-slate-500">
											{attachments.length > 0
												? `${attachments.length}/${MAX_FILES} attached`
												: getEnterpriseFormatHint("attachment")}
										</span>
										<input
											ref={fileInputRef}
											type="file"
											multiple
											accept={getEnterpriseInputAccept("attachment")}
											className="hidden"
											disabled={!canStartFixAgent || busy}
											onChange={(event) => {
												if (event.target.files?.length) {
													addFiles(event.target.files);
												}
												event.target.value = "";
											}}
										/>
									</div>
								</div>
								<p className="text-[11px] text-slate-500">
									Starting an agent opens an isolated Cursor environment. The
									agent will read the ticket, reproduce the issue, and push a
									fix branch.
								</p>
							</div>
							<div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/80 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-end sm:px-6">
								<Button
									type="button"
									variant="outline"
									className="primary-btn px-3 sm:px-4"
									disabled={!hasDraft || busy}
									onClick={clearDraft}
								>
									Dismiss
								</Button>
								<Button
									type="button"
									className="primary-btn px-3 sm:px-4"
									disabled={
										!canStartFixAgent || busy || !ticket.githubIssueNumber
									}
									onClick={() => void onStartFixAgent()}
								>
									<Send className="h-4 w-4" aria-hidden />
									{agentLabel}
								</Button>
							</div>
							{!canStartFixAgent ? (
								<p className="border-t border-slate-200/80 px-4 py-2 text-xs text-slate-500 sm:px-6">
									Claim this Engineering ticket (or escalate from Help) before
									starting the fix agent.
								</p>
							) : null}
						</Card>
					)
				) : null}
			</div>

			<aside className="space-y-5 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto">
				<SidebarCard title="Staff actions">
					<div className="flex items-center justify-between gap-2 text-[11.5px] text-slate-600">
						<span>Assigned to</span>
						{ticket.assigneeCaalmUserId ? (
							<span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-800">
								<Avatar
									name={assignee?.name}
									userId={ticket.assigneeCaalmUserId}
									size="xs"
									imageUrl={assignee?.avatarUrl}
								/>
								{assignee?.name || "Assigned"}
							</span>
						) : (
							<span className="italic text-slate-400">Unassigned</span>
						)}
					</div>
					<div className="flex flex-col gap-2">
						{showClaim ? (
							<Button
								type="button"
								className="primary-btn w-full px-3 sm:px-4"
								disabled={busy}
								onClick={() => void runAction("claim")}
							>
								<Hand className="h-4 w-4" aria-hidden />
								{busy ? "Working…" : "Claim ticket"}
							</Button>
						) : null}
						{showClose ? (
							<Button
								type="button"
								variant="outline"
								className="w-full border-green/30 bg-green/10 text-green hover:bg-green/20"
								disabled={busy}
								onClick={() => void runAction("close")}
							>
								<CheckCircle2 className="h-4 w-4" aria-hidden />
								{busy ? "Working…" : "Mark resolved"}
							</Button>
						) : null}
						{showEscalate ? (
							<Button
								type="button"
								variant="outline"
								className="w-full border-orange/30 bg-orange/10 text-orange hover:bg-orange/20"
								disabled={busy}
								onClick={() => void runAction("escalate")}
							>
								<TriangleAlert className="h-4 w-4" aria-hidden />
								{busy ? "Working…" : "Escalate to Engineering"}
							</Button>
						) : null}
					</div>
					{ticket.assigneeCaalmUserId && !canClose && isOpen ? (
						<p className="flex items-start gap-1.5 text-[11.5px] text-slate-500">
							<Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
							Ticket is assigned. Only the assignee or an admin can mark it
							resolved.
						</p>
					) : null}
					{showClose && !ticket.assigneeCaalmUserId ? (
						<p className="text-[11.5px] text-slate-500">
							Claim the ticket before marking it resolved.
						</p>
					) : null}
				</SidebarCard>

				<TicketSlaCard ticket={ticket} timeZone={timeZone} />

				{showAgentPanel ? (
					<SidebarCard title="GitHub issue">
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0 space-y-0.5">
								<p className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-800">
									<span
										className={cn(
											"h-2 w-2 shrink-0 rounded-full",
											syncedAt === null ? "bg-slate-300" : "bg-green",
											freshlySynced && "animate-pulse",
										)}
										aria-hidden
									/>
									<span className="truncate">
										{ticket.githubIssueNumber
											? `#${ticket.githubIssueNumber} · ${issueTitle}`
											: "No GitHub issue linked yet"}
									</span>
								</p>
								{syncedAt !== null ? (
									<p className="text-[11px] text-slate-500">
										Synced{" "}
										{formatTicketDateTime(
											new Date(syncedAt).toISOString(),
											timeZone,
										)}
									</p>
								) : null}
							</div>
							<Button
								type="button"
								variant="outline"
								className="primary-btn shrink-0 px-3"
								onClick={() => void loadIssue()}
								disabled={loading || !ticket.githubIssueNumber}
							>
								<RefreshCw
									className={cn("h-4 w-4", loading && "animate-spin")}
									aria-hidden
								/>
								Refresh
							</Button>
						</div>
						{ticket.githubIssueUrl ? (
							<a
								href={ticket.githubIssueUrl}
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center gap-1 text-xs font-medium text-[#078FAB] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
							>
								<ExternalLink className="h-3 w-3" aria-hidden />
								View on GitHub
							</a>
						) : null}
						{issue && issue.comments.length > 0 ? (
							<ul className="space-y-2">
								{issue.comments.map((comment) => (
									<li
										key={comment.id}
										className="rounded-md border border-slate-200 bg-white/80 p-3 text-xs text-slate-600"
									>
										<span className="font-medium text-slate-700">
											{comment.author}
										</span>{" "}
										· {formatTicketDateTime(comment.createdAt, timeZone)}
										<p className="mt-1 whitespace-pre-wrap">{comment.body}</p>
									</li>
								))}
							</ul>
						) : null}
					</SidebarCard>
				) : null}

				<TicketAuditTrail
					events={events}
					timeZone={timeZone}
					actorNames={actorNames}
				/>
			</aside>
		</div>
	);
}
