"use client";

import { Loader2, Save, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GmailComposeFormProps {
	fromEmail?: string;
	onSent?: () => void;
	onDraftSaved?: () => void;
}

export default function GmailComposeForm({
	fromEmail,
	onSent,
	onDraftSaved,
}: GmailComposeFormProps) {
	const [to, setTo] = useState("");
	const [subject, setSubject] = useState("");
	const [body, setBody] = useState("");
	const [sending, setSending] = useState(false);
	const [savingDraft, setSavingDraft] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const canSubmit = to.trim().length > 0 && subject.trim().length > 0;

	const handleSend = async () => {
		setError(null);
		setSending(true);
		try {
			const res = await fetch("/api/gmail/send", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ to, subject, body }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Send failed");
			setTo("");
			setSubject("");
			setBody("");
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
			const res = await fetch("/api/gmail/drafts", {
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
			{/* Inline labeled fields — Notion Mail / Apple Mail compose pattern */}
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
