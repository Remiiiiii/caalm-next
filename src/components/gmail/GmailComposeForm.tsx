"use client";

import { Loader2, Mail, Save, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import {
	combineBodyWithSignature,
	sanitizeSignatureHtml,
} from "@/lib/email/signature";
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

type ComposeAction = "draft" | "send" | "device";

interface GmailComposeFormProps {
	fromEmail?: string;
	initialDraft?: GmailComposeDraft | null;
	onSent?: () => void;
	onDraftSaved?: () => void;
	/** Defaults to Gmail APIs; pass Outlook paths for Microsoft mail. */
	sendUrl?: string;
	draftsUrl?: string;
	/** GET endpoint that returns `{ signatureHtml }` from the connected provider. */
	signatureUrl?: string;
	/** When set, adds “Open in device mail” to the action switch. */
	onDeviceMail?: () => void;
}

export default function GmailComposeForm({
	fromEmail,
	initialDraft,
	onSent,
	onDraftSaved,
	sendUrl = "/api/gmail/send",
	draftsUrl = "/api/gmail/drafts",
	signatureUrl,
	onDeviceMail,
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
	const [composeAction, setComposeAction] = useState<ComposeAction>("send");
	const [signatureHtml, setSignatureHtml] = useState<string | null>(null);
	const [signatureLoading, setSignatureLoading] = useState(false);
	const [signatureNote, setSignatureNote] = useState<string | null>(null);

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

	useEffect(() => {
		if (!signatureUrl) {
			setSignatureHtml(null);
			setSignatureNote(null);
			return;
		}
		let cancelled = false;
		setSignatureLoading(true);
		setSignatureNote(null);
		void fetch(signatureUrl)
			.then(async (res) => {
				const data = await res.json().catch(() => ({}));
				if (!res.ok) {
					throw new Error(data.error || "Could not load signature");
				}
				if (cancelled) return;
				const html =
					typeof data.signatureHtml === "string" && data.signatureHtml.trim()
						? sanitizeSignatureHtml(data.signatureHtml)
						: null;
				setSignatureHtml(html);
				if (!html) {
					setSignatureNote(
						data.source === "outlook_sent_items"
							? "No Outlook signature found in recent Sent items yet. Send one email from Outlook with your signature, then reopen compose."
							: "No signature is set on this mailbox alias.",
					);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setSignatureHtml(null);
					setSignatureNote("Could not load your mailbox signature.");
				}
			})
			.finally(() => {
				if (!cancelled) setSignatureLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [signatureUrl]);

	const canSubmit = to.trim().length > 0 && subject.trim().length > 0;
	const busy = sending || savingDraft;

	const payloadBody = useMemo(
		() => combineBodyWithSignature(body, signatureHtml),
		[body, signatureHtml],
	);

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
					body: payloadBody.body,
					contentType: payloadBody.contentType,
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
				body: JSON.stringify({
					to,
					subject,
					body: payloadBody.body,
					contentType: payloadBody.contentType,
				}),
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

	const runComposeAction = (next: ComposeAction) => {
		setComposeAction(next);
		if (busy) return;
		if (next === "device") {
			onDeviceMail?.();
			return;
		}
		if (next === "draft") {
			if (!canSubmit) {
				setError("Add a recipient and subject before saving a draft.");
				return;
			}
			void handleSaveDraft();
			return;
		}
		if (!canSubmit) {
			setError("Add a recipient and subject before sending.");
			return;
		}
		void handleSend();
	};

	const actionTabs = [
		{
			value: "draft" as const,
			label: savingDraft ? "Saving…" : "Save draft",
			icon: savingDraft ? Loader2 : Save,
			iconClassName: savingDraft ? "animate-spin" : undefined,
			ariaLabel: "Save draft",
		},
		{
			value: "send" as const,
			label: sending ? "Sending…" : "Send",
			icon: sending ? Loader2 : Send,
			iconClassName: sending ? "animate-spin" : undefined,
			ariaLabel: "Send email",
		},
		...(onDeviceMail
			? [
					{
						value: "device" as const,
						label: "Open mail on device",
						icon: Mail,
						ariaLabel: "Open mail on device",
					},
				]
			: []),
	];

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
					rows={10}
					className={cn(
						"min-h-[180px] w-full resize-none bg-transparent px-3 py-3 text-sm leading-relaxed text-slate-800 outline-none",
						"placeholder:text-slate-400",
					)}
				/>

				{signatureUrl ? (
					<div className="border-t border-slate-100 bg-slate-50/80 px-3 py-3">
						<p className="text-xs font-medium text-slate-500">
							Mailbox signature
						</p>
						{signatureLoading ? (
							<p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
								<Loader2 className="h-4 w-4 animate-spin" />
								Loading signature from your email account…
							</p>
						) : signatureHtml ? (
							<div
								className="signature-preview mt-2 max-h-40 overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 [&_img]:max-h-24 [&_img]:max-w-full"
								// Provider HTML (Gmail sendAs / Outlook Sent signature), sanitized
								dangerouslySetInnerHTML={{ __html: signatureHtml }}
							/>
						) : (
							<p className="mt-2 text-sm text-slate-500">
								{signatureNote || "No signature available."}
							</p>
						)}
						{signatureHtml ? (
							<p className="mt-1.5 text-xs text-slate-500">
								Appended automatically when you send or save a draft.
							</p>
						) : null}
					</div>
				) : null}
			</div>

			{error ? (
				<p className="mt-3 text-sm text-red" role="alert">
					{error}
				</p>
			) : null}

			<div className="mt-auto flex items-center justify-center border-t border-slate-200/80 pt-4">
				<SegmentedToggle
					value={composeAction}
					onChange={runComposeAction}
					ariaLabel="Compose actions"
					tabs={actionTabs}
					className={cn("-mx-4")}
				/>
			</div>
		</div>
	);
}
