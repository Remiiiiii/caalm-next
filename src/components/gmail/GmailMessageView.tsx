"use client";

import {
	Archive,
	ArrowLeft,
	Loader2,
	MailOpen,
	Mail,
	Reply,
	Trash2,
} from "lucide-react";
import { DocsMarkdown } from "@/components/docs/DocsMarkdown";
import { GmailActionTooltip } from "@/components/gmail/GmailActionTooltip";
import GmailHtmlFrame from "@/components/gmail/GmailHtmlFrame";
import { Button } from "@/components/ui/button";
import { cleanEmailBody } from "@/lib/gmail/humanize-body";
import { cn } from "@/lib/utils";

export interface GmailMessageDetailView {
	id: string;
	threadId?: string;
	subject: string;
	from: string;
	to: string;
	date: string;
	bodyText: string;
	bodyHtml: string;
	unread?: boolean;
	messageIdHeader?: string;
	references?: string;
}

interface GmailMessageViewProps {
	loading?: boolean;
	message: GmailMessageDetailView | null;
	onBack: () => void;
	busyAction?: string | null;
	onArchive?: () => void;
	onTrash?: () => void;
	onToggleRead?: () => void;
	onReply?: () => void;
}

function parseSender(from: string): { name: string; email: string } {
	const match = from.match(/^(.*?)\s*<([^>]+)>$/);
	if (match) {
		return {
			name: match[1].replace(/^"|"$/g, "").trim() || match[2],
			email: match[2],
		};
	}
	return { name: from || "Unknown", email: from };
}

function initials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatDetailDate(raw: string): string {
	if (!raw) return "";
	const asNum = Number(raw);
	const date =
		Number.isFinite(asNum) && asNum > 1e11 ? new Date(asNum) : new Date(raw);
	if (Number.isNaN(date.getTime())) return raw;
	return date.toLocaleString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

export default function GmailMessageView({
	loading,
	message,
	onBack,
	busyAction,
	onArchive,
	onTrash,
	onToggleRead,
	onReply,
}: GmailMessageViewProps) {
	if (loading) {
		return (
			<div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-600">
				<Loader2 className="h-5 w-5 animate-spin" />
				<p className="text-sm">Loading message…</p>
			</div>
		);
	}

	if (!message) return null;

	const sender = parseSender(message.from);
	const html = (message.bodyHtml || "").trim();
	const showHtml = html.length > 0;
	const cleaned = showHtml
		? null
		: cleanEmailBody(message.bodyText || "", message.bodyHtml || "");
	const actionBusy = Boolean(busyAction);

	return (
		<div className="flex min-w-0 flex-col gap-4">
			<div className="sticky top-0 z-10 -mx-4 mb-0 border-b border-slate-200/70 bg-white/90 px-4 py-2 backdrop-blur-md">
				<div className="flex items-center justify-between gap-2">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-8 cursor-pointer -ml-2 gap-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
						onClick={onBack}
						disabled={actionBusy}
					>
						<ArrowLeft className="h-4 w-4" />
						Inbox
					</Button>
					<div className="flex items-center gap-0.5">
						{onReply ? (
							<GmailActionTooltip label="Reply">
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="h-8 w-8 cursor-pointer text-slate-500 hover:bg-slate-100 hover:text-slate-800"
									aria-label="Reply"
									disabled={actionBusy}
									onClick={onReply}
								>
									<Reply className="h-4 w-4" />
								</Button>
							</GmailActionTooltip>
						) : null}
						{onArchive ? (
							<GmailActionTooltip label="Archive">
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="h-8 w-8 cursor-pointer text-slate-500 hover:bg-slate-100 hover:text-slate-800"
									aria-label="Archive"
									disabled={actionBusy}
									onClick={onArchive}
								>
									{busyAction === "archive" ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<Archive className="h-4 w-4" />
									)}
								</Button>
							</GmailActionTooltip>
						) : null}
						{onToggleRead ? (
							<GmailActionTooltip
								label={message.unread ? "Mark as read" : "Mark as unread"}
							>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="h-8 w-8 cursor-pointer text-slate-500 hover:bg-slate-100 hover:text-slate-800"
									aria-label={
										message.unread ? "Mark as read" : "Mark as unread"
									}
									disabled={actionBusy}
									onClick={onToggleRead}
								>
									{busyAction === "markRead" || busyAction === "markUnread" ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : message.unread ? (
										<MailOpen className="h-4 w-4" />
									) : (
										<Mail className="h-4 w-4" />
									)}
								</Button>
							</GmailActionTooltip>
						) : null}
						{onTrash ? (
							<GmailActionTooltip label="Delete">
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="h-8 w-8 cursor-pointer text-slate-500 hover:bg-red/10 hover:text-red"
									aria-label="Delete"
									disabled={actionBusy}
									onClick={onTrash}
								>
									{busyAction === "trash" ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<Trash2 className="h-4 w-4" />
									)}
								</Button>
							</GmailActionTooltip>
						) : null}
					</div>
				</div>
			</div>

			<div className="min-w-0">
				<h3 className="break-words text-lg font-semibold leading-snug text-slate-800">
					{message.subject || "(No subject)"}
				</h3>
			</div>

			<div className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-3">
				<div
					className={cn(
						"flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
						"bg-[#0f5384]/15 text-[#0f5384]",
					)}
				>
					{initials(sender.name)}
				</div>
				<div className="min-w-0 flex-1 overflow-hidden">
					<div className="flex items-start justify-between gap-2">
						<div className="min-w-0">
							<p className="truncate text-sm font-semibold text-slate-800">
								{sender.name}
							</p>
							{sender.email && sender.email !== sender.name ? (
								<p className="truncate text-xs text-slate-500">{sender.email}</p>
							) : null}
						</div>
						{message.date ? (
							<span className="shrink-0 text-[11px] tabular-nums text-slate-500">
								{formatDetailDate(message.date)}
							</span>
						) : null}
					</div>
					{message.to ? (
						<p className="mt-1.5 truncate text-xs text-slate-500">
							To <span className="text-slate-600">{message.to}</span>
						</p>
					) : null}
				</div>
			</div>

			<div
				className={cn(
					"min-w-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white",
					showHtml ? "p-0" : "px-4 py-4",
				)}
			>
				{showHtml ? (
					<GmailHtmlFrame html={html} />
				) : cleaned?.isLinkedInPymk ? (
					<div className="prose-sm max-w-none break-words text-sm leading-relaxed text-slate-700 [&_a]:text-[#0f5384] [&_a]:underline [&_a]:underline-offset-2 [&_hr]:my-4 [&_hr]:border-slate-200 [&_p]:my-1 [&_strong]:text-slate-800">
						<DocsMarkdown markdown={cleaned.markdown} />
					</div>
				) : (
					<p className="break-words whitespace-pre-wrap text-sm leading-relaxed text-slate-700 [overflow-wrap:anywhere]">
						{cleaned?.markdown || message.bodyText || "(Empty message)"}
					</p>
				)}
				{cleaned && cleaned.notes.length > 0 ? (
					<div className="mt-4 border-t border-slate-100 px-4 py-3">
						<p className="text-xs font-medium text-slate-600">Notes</p>
						<ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-slate-500">
							{cleaned.notes.map((note) => (
								<li key={note}>{note}</li>
							))}
						</ul>
					</div>
				) : null}
			</div>
		</div>
	);
}
