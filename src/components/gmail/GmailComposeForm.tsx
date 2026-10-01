"use client";

import { Loader2, Save, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type GmailComposeDraft = {
	to?: string;
	subject?: string;
	body?: string;
	threadId?: string;
	inReplyTo?: string;
	references?: string;
	/** Outlook Graph: reply against this message id */
	replyToMessageId?: string;
};

interface GmailComposeFormProps {
	fromEmail?: string;
	initialDraft?: GmailComposeDraft | null;
	onSent?: () => void;
	onDraftSaved?: () => void;
	/** Defaults to Gmail APIs; pass Outlook paths for Microsoft mail. */
	sendUrl?: string;
	draftsUrl?: string;
}

export default function GmailComposeForm({
	fromEmail,
	initialDraft,
	onSent,
	onDraftSaved,
	sendUrl = "/api/gmail/send",
	draftsUrl = "/api/gmail/drafts",
}: GmailComposeFormProps) {
	const [to, setTo] = useState(initialDraft?.to || "");
	const [subject, setSubject] = useState(initialDraft?.subject || "");
	const [body, setBody] = useState(initialDraft?.body || "");
	const [threadId, setThreadId] = useState(initialDraft?.threadId);
	const [inReplyTo, setInReplyTo] = useState(initialDraft?.inReplyTo);
	const [references, setReferences] = useState(initialDraft?.references);
	const [replyToMessageId, setReplyToMessageId] = useState(
		initialDraft?.replyToMessageId,
	);
	const [sending, setSending] = useState(false);
	const [savingDraft, setSavingDraft] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!initialDraft) return;
		setTo(initialDraft.to || "");
		setSubject(initialDraft.subject || "");
		setBody(initialDraft.body || "");
		setThreadId(initialDraft.threadId);
		setInReplyTo(initialDraft.inReplyTo);
		setReferences(initialDraft.references);
		setReplyToMessageId(initialDraft.replyToMessageId);
	}, [initialDraft]);

	const canSubmit = to.trim().length > 0 && subject.trim().length > 0;

	const handleSend = async () => {
		setError(null);
		setSending(true);
		try {
			const res = await fetch(sendUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					to,
					subject,
					body,
					threadId,
					inReplyTo,
					references,
					replyToMessageId,
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Send failed");
			setTo("");
			setSubject("");
			setBody("");
			setThreadId(undefined);
			setInReplyTo(undefined);
			setReferences(undefined);
			setReplyToMessageId(undefined);
			onSent?.();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Send failed");
		} finally {
			setSending(false);
		}
	};

	const handleSaveDraft = async () => {
		setError(null);
		setSavingDraft(true);
		try {
			const res = await fetch(draftsUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ to, subject, body }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Draft save failed");
			onDraftSaved?.();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Draft save failed");
		} finally {
			setSavingDraft(false);
		}
	};

	return (
		<div className="flex h-full min-h-[420px] flex-col">
			<div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
				{fromEmail ? (
					<div className="flex items-center gap-3 border-b border-slate-100 px-3 py-2.5">
						<span className="w-14 shrink-0 text-xs font-medium text-slate-500">
							From
						</span>
						<span className="truncate text-sm text-slate-700">{fromEmail}</span>
					</div>
				) : null}

				<div className="flex items-center gap-3 border-b border-slate-100 px-3 py-2">
					<label
						htmlFor="gmail-compose-to"
						className="w-14 shrink-0 text-xs font-medium text-slate-500"
					>
						To
					</label>
					<input
						id="gmail-compose-to"
						value={to}
						onChange={(e) => setTo(e.target.value)}
						placeholder="name@example.com"
						className={cn(
							"h-9 w-full bg-transparent text-sm text-slate-800 outline-none",
							"placeholder:text-slate-400",
						)}
					/>
				</div>

				<div className="flex items-center gap-3 border-b border-slate-100 px-3 py-2">
					<label
						htmlFor="gmail-compose-subject"
						className="w-14 shrink-0 text-xs font-medium text-slate-500"
					>
						Subject
					</label>
					<input
						id="gmail-compose-subject"
						value={subject}
						onChange={(e) => setSubject(e.target.value)}
						placeholder="What’s this about?"
						className={cn(
							"h-9 w-full bg-transparent text-sm text-slate-800 outline-none",
							"placeholder:text-slate-400",
						)}
					/>
				</div>

				<textarea
					id="gmail-compose-body"
					value={body}
					onChange={(e) => setBody(e.target.value)}
					placeholder="Write your message…"
					rows={12}
					className={cn(
						"min-h-[220px] w-full resize-none bg-transparent px-3 py-3 text-sm leading-relaxed text-slate-800 outline-none",
						"placeholder:text-slate-400",
					)}
				/>
			</div>

			{error ? (
				<p className="mt-3 text-sm text-red" role="alert">
					{error}
				</p>
			) : null}

			<div className="mt-auto flex items-center justify-end gap-2 border-t border-slate-200/80 pt-4">
				<Button
					type="button"
					className="btn-primary px-3 sm:px-4 cursor-pointer"
					disabled={savingDraft || sending}
					onClick={() => void handleSaveDraft()}
				>
					{savingDraft ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Save className="h-4 w-4" />
					)}
					Save draft
				</Button>
				<Button
					type="button"
					className="btn-primary px-3 sm:px-4 cursor-pointer"
					disabled={sending || savingDraft || !canSubmit}
					onClick={() => void handleSend()}
				>
					{sending ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Send className="h-4 w-4" />
					)}
					Send
				</Button>
			</div>
		</div>
	);
}
