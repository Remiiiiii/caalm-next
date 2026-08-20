"use client";

import {
	ExternalLink,
	FileText,
	Paperclip,
	RefreshCw,
	Send,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type {
	GitHubIssueSnapshot,
	Ticket,
	TicketEvent,
} from "@/lib/tickets/ticket.types";
import { useOrgTimezone } from "@/hooks/useOrgTimezone";
import {
	getImpactLabel,
	getUrgencyLabel,
} from "@/lib/tickets/ticket-intake.constants";
import { displayTicketNumber } from "@/lib/tickets/ticket-number.utils";
import { cn } from "@/lib/utils";
import { TicketSeverityPill, TicketStatusPill } from "./TicketStatusPill";

const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

type AttachmentEntry = { id: string; file: File };

function formatTicketDateTime(value: string, timeZone: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return new Intl.DateTimeFormat(undefined, {
		weekday: "short",
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
		second: "2-digit",
		timeZoneName: "short",
		timeZone,
	}).format(date);
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
		// Stored as plain string in older rows
	}
	return null;
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatIssueDetails(
	ticket: Ticket,
	issue: GitHubIssueSnapshot | null,
	timeZone: string,
) {
	const impact = ticket.impact ? getImpactLabel(ticket.impact) : "—";
	const urgency = ticket.urgency ? getUrgencyLabel(ticket.urgency) : "—";
	const severity = ticket.severity
		? ticket.severity.charAt(0).toUpperCase() + ticket.severity.slice(1)
		: "—";
	const description =
		ticket.description?.trim() ||
		issue?.body?.trim() ||
		"No description provided.";

	return [
		`Submitted by: ${ticket.submittedByName} (${ticket.submittedByUserId})`,
		`Department/Division: ${ticket.department}`,
		`Submitted at: ${formatTicketDateTime(ticket.submittedAt, timeZone)}`,
		`Category: ${ticket.category || "—"}`,
		ticket.affectedModule ? `Affected service: ${ticket.affectedModule}` : null,
		`Impact: ${impact} · Urgency: ${urgency} · Severity: ${severity}`,
		"",
		description,
		"",
		`CAALM ticket number: ${displayTicketNumber(ticket)}`,
		`CAALM ticket id: ${ticket.$id}`,
	]
		.filter((line) => line !== null)
		.join("\n");
}

export function TicketDetail({
	ticket,
	events,
	canResolve,
}: {
	ticket: Ticket;
	events: TicketEvent[];
	canResolve: boolean;
}) {
	const timeZone = useOrgTimezone();
	const [issue, setIssue] = useState<GitHubIssueSnapshot | null>(null);
	const [loading, setLoading] = useState(false);
	const [resolving, setResolving] = useState(false);
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
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load issue");
		} finally {
			setLoading(false);
		}
	}, [ticket.$id, ticket.githubIssueNumber]);

	useEffect(() => {
		void loadIssue();
	}, [loadIssue]);

	const issueTitle = issue?.title || ticket.title;
	const issueDetails = useMemo(
		() => formatIssueDetails(ticket, issue, timeZone),
		[ticket, issue, timeZone],
	);

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

	const onResolve = async () => {
		setResolving(true);
		setError(null);
		try {
			const form = new FormData();
			const trimmed = instructions.trim();
			if (trimmed) form.set("instructions", trimmed);
			for (const entry of attachments.slice(0, MAX_FILES)) {
				form.append("attachments", entry.file);
			}

			const res = await fetch(`/api/tickets/${ticket.$id}/resolve`, {
				method: "POST",
				body: form,
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Resolve failed");
			window.location.reload();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Resolve failed");
		} finally {
			setResolving(false);
		}
	};

	const hasDraft = Boolean(instructions.trim() || attachments.length > 0);
	const resolveLabel =
		instructions.trim() || attachments.length > 0
			? resolving
				? "Starting agent…"
				: "Resolve with instructions"
			: resolving
				? "Starting agent…"
				: "Resolve";

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

	return (
		<div className="space-y-6">
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="space-y-3 p-4 sm:p-6">
					<div className="flex flex-wrap items-center gap-2">
						<span className="font-mono text-xs font-semibold tracking-wide text-[#0f5384]">
							{displayTicketNumber(ticket)}
						</span>
						<TicketSeverityPill severity={ticket.severity} />
						<TicketStatusPill status={ticket.status} />
					</div>
					<h2 className="text-xl font-semibold sidebar-gradient-text">
						{ticket.title}
					</h2>
					<p className="text-sm text-slate-600">
						{ticket.submittedByName} · {ticket.department} ·{" "}
						{formatTicketDateTime(ticket.submittedAt, timeZone)}
					</p>
					{ticket.status === "FAILED" && (error || lastFailureReason) ? (
						<p className="rounded-md border border-red/20 bg-red/5 px-3 py-2 text-sm text-red">
							{error || lastFailureReason}
						</p>
					) : null}
					<p className="whitespace-pre-wrap text-sm text-slate-700">
						{ticket.description}
					</p>
					{ticket.githubIssueUrl ? (
						<a
							href={ticket.githubIssueUrl}
							target="_blank"
							rel="noreferrer"
							className="inline-flex items-center gap-1 text-sm text-[#0f5384] underline-offset-2 hover:underline"
						>
							GitHub issue <ExternalLink className="h-3 w-3" />
						</a>
					) : null}
				</CardContent>
			</Card>

			{/* Live GitHub issue — layout from caalm-github-issue-agent-input.html */}
			<Card className="glass-card overflow-hidden p-0">
				<div className="glass-card-cap" />

				{/* Header — mt accounts for glass-card-cap clearance */}
				<div className="mt-4 flex items-start justify-between gap-3 border-b border-slate-200/80 px-4 py-4 sm:px-6">
					<div className="min-w-0 space-y-1">
						<p className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-[#0f5384]">
							<span
								className="h-2 w-2 shrink-0 rounded-full bg-green"
								aria-hidden
							/>
							Live GitHub issue
						</p>
						<p className="truncate text-[15px] font-bold text-slate-700">
							{issueTitle}
						</p>
					</div>
					<Button
						type="button"
						variant="outline"
						className="primary-btn shrink-0 px-3 sm:px-4"
						onClick={() => void loadIssue()}
						disabled={loading || !ticket.githubIssueNumber}
					>
						<RefreshCw
							className={cn("h-4 w-4", loading && "animate-spin")}
							aria-hidden
						/>
						<span className="hidden sm:inline">Refresh from GitHub</span>
						<span className="sm:hidden">Refresh</span>
					</Button>
				</div>

				{/* Issue details */}
				<div className="space-y-2 border-b border-slate-200/80 px-4 py-4 sm:px-6">
					<p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-500">
						Issue details
					</p>
					{error ? <p className="text-sm text-red">{error}</p> : null}
					{loading && !issue && ticket.githubIssueNumber ? (
						<p className="text-sm text-slate-600">Loading issue…</p>
					) : ticket.githubIssueNumber ? (
						<pre className="whitespace-pre-wrap rounded-md border border-slate-200 bg-white/80 px-4 py-3 text-[11.5px] leading-relaxed text-slate-700">
							{issueDetails}
						</pre>
					) : (
						<p className="text-sm text-slate-600">
							No GitHub issue linked yet.
						</p>
					)}
					{issue && issue.comments.length > 0 ? (
						<ul className="space-y-2 pt-1">
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
				</div>

				{/* Direct the agent */}
				<div className="space-y-2 px-4 py-4 sm:px-6">
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
								'Tell the agent how to resolve this — e.g. "Focus on the accordion collapse behavior, don\'t touch the search bar". Leave blank to resolve automatically.'
							}
							className="min-h-18 resize-none rounded-none border-0! bg-transparent px-3.5 pb-1.5 pt-3 text-[13px] text-slate-700 shadow-none! ring-0! focus-visible:border-0! focus-visible:shadow-none! focus-visible:ring-0!"
							disabled={!canResolve || resolving}
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
											disabled={resolving}
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
							<p className="px-3.5 pb-1.5 text-[11px] text-red">{fileError}</p>
						) : null}
						<div className="flex items-center gap-2 px-2.5 pb-2.5 pl-3">
							<button
								type="button"
								onClick={() => fileInputRef.current?.click()}
								disabled={!canResolve || resolving}
								className={cn(
									"inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
									(!canResolve || resolving) && "cursor-not-allowed opacity-50",
								)}
								title={`Attach files (max ${MAX_FILES}, 10 MB each)`}
								aria-label="Attach files"
							>
								<Paperclip className="h-5 w-5" aria-hidden />
							</button>
							<span className="text-xs text-slate-500">
								{attachments.length > 0
									? `${attachments.length}/${MAX_FILES} attached`
									: "Attach context files"}
							</span>
							<input
								ref={fileInputRef}
								type="file"
								multiple
								className="hidden"
								disabled={!canResolve || resolving}
								onChange={(event) => {
									if (event.target.files?.length) {
										addFiles(event.target.files);
									}
									event.target.value = "";
								}}
							/>
						</div>
					</div>
				</div>

				{/* Footer actions */}
				<div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/80 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
					<p className="text-[11px] text-slate-500">
						Resolving will run the Cursor agent against this repository.
					</p>
					<div className="flex flex-wrap items-center gap-2">
						<Button
							type="button"
							variant="outline"
							className="primary-btn px-3 sm:px-4"
							disabled={!hasDraft || resolving}
							onClick={clearDraft}
						>
							Dismiss
						</Button>
						<Button
							type="button"
							className="primary-btn px-3 sm:px-4"
							disabled={!canResolve || resolving || !ticket.githubIssueNumber}
							onClick={() => void onResolve()}
						>
							<Send className="h-4 w-4" aria-hidden />
							{resolveLabel}
						</Button>
					</div>
				</div>
				{!canResolve ? (
					<p className="border-t border-slate-200/80 px-4 py-2 text-xs text-slate-500 sm:px-6">
						Only the assigned assignee or a Super Admin can resolve this ticket.
					</p>
				) : null}
			</Card>

			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6">
					<p className="mb-3 text-sm font-medium sidebar-gradient-text">
						Audit trail
					</p>
					<ol className="space-y-2">
						{events.map((event) => (
							<li key={event.$id} className="text-xs text-slate-600">
								<span className="font-medium text-slate-700">
									{event.eventType.replaceAll("_", " ")}
								</span>{" "}
								· {formatTicketDateTime(event.timestamp, timeZone)} · {event.actor}
							</li>
						))}
					</ol>
				</CardContent>
			</Card>
		</div>
	);
}
