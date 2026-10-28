"use client";

import { FileText, Paperclip, X, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { TicketDetailCard } from "./detail/TicketDetailCard";
import { TicketSheet } from "./detail/TicketSheet";
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

export function TicketDetail({
	ticket: initialTicket,
	events,
	attachments: ticketAttachments,
	profiles,
	canAssign,
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
	canAssign: boolean;
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
		<div className="min-w-0 space-y-4">
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
				<div className="overflow-hidden rounded-[14px] border border-slate-200/70 bg-white/60">
					<div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/90 px-4 py-2.5">
						<div className="flex items-center gap-2">
							<span
								className={cn(
									"h-[7px] w-[7px] rounded-full",
									agentActive
										? "bg-[#3DD9B3] shadow-[0_0_6px_#3DD9B3]"
										: "bg-[#cbd5e1]",
								)}
								aria-hidden
							/>
							<p className="text-[11px] font-bold uppercase text-[#0f5384]">
								Fix Agent Workspace
							</p>
						</div>
						{agentActive && ticket.cursorAgentRunId ? (
							<span className="max-w-[14rem] truncate rounded border border-[#56B8FF]/20 bg-[#56B8FF]/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#56B8FF]">
								{ticket.cursorAgentRunId}
							</span>
						) : null}
					</div>
					{agentActive ? (
						<AgentCanvasWorkspace
							ticket={ticket}
							canControl={canStartFixAgent}
							stopping={stopping}
							onStop={() => void onStopFixAgent()}
							canClose={showClose}
							closing={busy}
							onMarkResolved={() => void runAction("close")}
						/>
					) : (
						<div className="space-y-2 p-5">
							<p className="text-[11px] font-bold uppercase text-slate-400">
								Direct the agent{" "}
								<span className="text-[10px] font-normal normal-case">
									(optional)
								</span>
							</p>
							<Textarea
								value={instructions}
								onChange={(event) => setInstructions(event.target.value)}
								placeholder={
									'Tell the agent how to fix this — e.g. "Focus on the accordion collapse behavior, don\'t touch the search bar". Leave blank to run automatically.'
								}
								className="h-20 resize-none rounded-[10px] border-[1.5px] border-slate-200 bg-white px-3.5 py-3 text-[13px] text-slate-700 shadow-none placeholder:text-slate-400 focus-visible:border-[#078FAB] focus-visible:ring-0"
								disabled={!canStartFixAgent || busy}
							/>
							{attachments.length > 0 ? (
								<ul className="space-y-1.5">
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
								<p className="text-[11px] text-red">{fileError}</p>
							) : null}
							<button
								type="button"
								onClick={() => fileInputRef.current?.click()}
								disabled={!canStartFixAgent || busy}
								className="inline-flex cursor-pointer items-center gap-1.5 text-left text-[11.5px] text-slate-400 transition-colors duration-200 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 disabled:cursor-not-allowed disabled:opacity-50"
								aria-label={`Attach files (max ${MAX_FILES}, 10 MB each)`}
							>
								<Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden />
								{attachments.length > 0
									? `${attachments.length}/${MAX_FILES} attached`
									: getEnterpriseFormatHint("attachment")}
							</button>
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
							<div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
								<p className="text-[11.5px] text-slate-400">
									Starting an agent opens an isolated Cursor environment. The
									agent will read the ticket, reproduce the issue, and push a
									fix branch.
								</p>
								<div className="flex shrink-0 items-center gap-2">
									<Button
										type="button"
										variant="ghost"
										className="h-9 rounded-full px-4 text-[13px] font-semibold text-slate-400 hover:bg-black/[.04] hover:text-slate-600"
										disabled={!hasDraft || busy}
										onClick={clearDraft}
									>
										Dismiss
									</Button>
									<Button
										type="button"
										variant="brand"
										disabled={
											!canStartFixAgent || busy || !ticket.githubIssueNumber
										}
										onClick={() => void onStartFixAgent()}
									>
										<Zap className="h-3 w-3" aria-hidden />
										{agentLabel}
									</Button>
								</div>
							</div>
							{!canStartFixAgent ? (
								<p className="text-xs text-slate-500">
									Claim this Engineering ticket (or escalate from Help) before
									starting the fix agent.
								</p>
							) : null}
						</div>
					)}
				</div>
			) : null}

			<TicketSheet
				ticket={ticket}
				events={events}
				timeZone={timeZone}
				assignee={assignee}
				canAssign={canAssign}
				actorNames={actorNames}
				busy={busy}
				showClaim={showClaim}
				showClose={showClose}
				showEscalate={showEscalate}
				canClose={canClose}
				isOpen={isOpen}
				onAction={(path) => void runAction(path)}
				github={{
					show: showAgentPanel,
					issue,
					title: issueTitle,
					syncedAt,
					fresh: freshlySynced,
					loading,
					onRefresh: () => void loadIssue(),
				}}
				canStartAgent={
					showAgentPanel &&
					!agentActive &&
					canStartFixAgent &&
					Boolean(ticket.githubIssueNumber)
				}
				agentStartLabel={agentLabel}
				onStartFixAgent={() => void onStartFixAgent()}
			/>
		</div>
	);
}
