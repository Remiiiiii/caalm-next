"use client";

import { Download, Eye, Lock, Mail, Printer, ShieldCheck } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NegotiationCommentThread } from "@/components/contracts/negotiation/NegotiationCommentThread";
import {
	NegotiationDocumentPane,
	negotiationParagraphDomId,
} from "@/components/contracts/negotiation/NegotiationDocumentPane";
import {
	buildNegotiationParticipants,
	NegotiationInviteeAvatars,
} from "@/components/contracts/negotiation/NegotiationInviteeAvatars";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useNegotiationPoll } from "@/hooks/useNegotiationPoll";
import type { NegotiationInvitee } from "@/lib/contracts/negotiation/access.logic";
import type { NegotiationComment } from "@/lib/contracts/negotiation/comments.service";
import { parseNegotiationDocument } from "@/lib/contracts/negotiation/document-model";

type GateStep = "email" | "otp";

function counterpartyStatusCopy(lifecycleStatus: string): {
	label: string;
	detail: string;
} {
	const status = lifecycleStatus.toLowerCase();
	if (status === "under_review" || status === "pending-review") {
		return {
			label: "Under review",
			detail: "Your comments are with the document owner.",
		};
	}
	if (
		status === "approved" ||
		status === "active" ||
		status === "countersigned"
	) {
		return {
			label: "Countersigned",
			detail: "This agreement is no longer in open negotiation.",
		};
	}
	if (status === "draft") {
		return {
			label: "Draft",
			detail: "This draft is shared for early feedback.",
		};
	}
	return {
		label: "Awaiting your review",
		detail: "no signature required yet",
	};
}

export default function CounterpartyNegotiatePage() {
	const params = useParams<{ token: string }>();
	const token = params?.token || "";
	const [title, setTitle] = useState("Contract draft");
	const [lifecycleStatus, setLifecycleStatus] = useState("negotiation");
	const [text, setText] = useState("");
	const [comments, setComments] = useState<NegotiationComment[]>([]);
	const [invitees, setInvitees] = useState<NegotiationInvitee[]>([]);
	const [owner, setOwner] = useState<
		(NegotiationInvitee & { imageUrl?: string | null }) | null
	>(null);
	const [authenticated, setAuthenticated] = useState(false);
	const [sessionEmail, setSessionEmail] = useState("");
	const [verifyEmail, setVerifyEmail] = useState("");
	const [otp, setOtp] = useState("");
	const [gateStep, setGateStep] = useState<GateStep>("email");
	const [gateBusy, setGateBusy] = useState(false);
	const [gateError, setGateError] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [anchorStart, setAnchorStart] = useState(-1);
	const [anchorEnd, setAnchorEnd] = useState(-1);
	const [snippet, setSnippet] = useState("");
	const [redlineAllowed, setRedlineAllowed] = useState(true);
	const [activeCommentId, setActiveCommentId] = useState("");
	const [saveError, setSaveError] = useState<string | null>(null);

	const model = useMemo(() => parseNegotiationDocument(text), [text]);
	const participants = useMemo(
		() => buildNegotiationParticipants(owner, invitees),
		[invitees, owner],
	);
	const statusCopy = useMemo(
		() => counterpartyStatusCopy(lifecycleStatus),
		[lifecycleStatus],
	);

	const load = useCallback(async () => {
		if (!token) return;
		const res = await fetch(`/api/negotiate/${token}`, {
			credentials: "include",
		});
		const payload = await res.json().catch(() => ({}));
		if (!res.ok) {
			setError(payload.error || "This link is no longer valid.");
			setAuthenticated(false);
			return;
		}

		setTitle(String(payload.contractName || "Contract draft"));
		setLifecycleStatus(String(payload.lifecycleStatus || "negotiation"));
		const nextInvitees = (payload.invitees || []) as NegotiationInvitee[];
		setInvitees(nextInvitees);
		const nextOwner = payload.owner as
			| (NegotiationInvitee & { imageUrl?: string | null })
			| null;
		setOwner(
			nextOwner?.email
				? {
						email: String(nextOwner.email).toLowerCase(),
						name: String(nextOwner.name || nextOwner.email),
						imageUrl: nextOwner.imageUrl || null,
					}
				: null,
		);
		if (nextInvitees.length === 1) {
			setVerifyEmail((current) => current || nextInvitees[0].email);
		}

		const isAuthed = Boolean(payload.authenticated);
		setAuthenticated(isAuthed);
		if (payload.sessionEmail) {
			setSessionEmail(String(payload.sessionEmail));
		}

		if (!isAuthed) {
			setText("");
			setComments([]);
			setError(null);
			return;
		}

		const nextText = String(payload.version?.extractedText || "");
		const nextComments = (payload.comments || []) as NegotiationComment[];
		setText((current) => (current === nextText ? current : nextText));
		setComments((current) => {
			const key = (items: NegotiationComment[]) =>
				items
					.map(
						(row) =>
							`${row.$id}:${row.status}:${row.body}:${row.redlineProposal}`,
					)
					.join("|");
			return key(current) === key(nextComments) ? current : nextComments;
		});
		setError(null);
	}, [token]);

	useEffect(() => {
		void load();
	}, [load]);

	useNegotiationPoll(load, {
		enabled: Boolean(token) && authenticated,
		paused: busy || gateBusy,
	});

	const downloadDraft = useCallback(() => {
		if (!text.trim()) return;
		const safeName =
			title
				.replace(/[^a-zA-Z0-9._-]+/g, "-")
				.replace(/-+/g, "-")
				.slice(0, 60) || "contract-draft";
		const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
		const href = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = href;
		anchor.download = `${safeName}.txt`;
		anchor.click();
		URL.revokeObjectURL(href);
	}, [text, title]);

	const printDraft = useCallback(() => {
		if (!text.trim()) return;
		const escaped = text
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");
		const safeTitle = title.replace(/</g, "&lt;").replace(/"/g, "");
		const iframe = document.createElement("iframe");
		iframe.setAttribute("aria-hidden", "true");
		iframe.style.cssText =
			"position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
		document.body.appendChild(iframe);
		const doc = iframe.contentDocument;
		const win = iframe.contentWindow;
		if (!doc || !win) {
			iframe.remove();
			return;
		}
		doc.open();
		doc.write(
			`<!doctype html><html><head><title>${safeTitle}</title>
			<style>
				body { font-family: "Times New Roman", Times, serif; color: #0f172a; margin: 2rem; white-space: pre-wrap; line-height: 1.5; }
				h1 { font-size: 1.25rem; margin-bottom: 1.5rem; }
			</style></head><body>
			<h1>${safeTitle}</h1>
			<pre>${escaped}</pre>
			</body></html>`,
		);
		doc.close();
		const cleanup = () => iframe.remove();
		win.addEventListener("afterprint", cleanup);
		window.setTimeout(cleanup, 60_000);
		win.focus();
		win.print();
	}, [text, title]);

	const requestOtp = async () => {
		if (!token || !verifyEmail.trim()) {
			setGateError("Select or enter your invited email.");
			return;
		}
		setGateBusy(true);
		setGateError(null);
		try {
			const res = await fetch(`/api/negotiate/${token}/verify/request`, {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: verifyEmail.trim().toLowerCase() }),
			});
			const payload = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(payload.error || "Could not send code");
			}
			setGateStep("otp");
			setOtp("");
		} catch (err) {
			setGateError(err instanceof Error ? err.message : "Could not send code");
		} finally {
			setGateBusy(false);
		}
	};

	const confirmOtp = async () => {
		if (!token || !verifyEmail.trim() || !otp.trim()) {
			setGateError("Enter the code from your email.");
			return;
		}
		setGateBusy(true);
		setGateError(null);
		try {
			const res = await fetch(`/api/negotiate/${token}/verify/confirm`, {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: verifyEmail.trim().toLowerCase(),
					otp: otp.trim(),
				}),
			});
			const payload = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(payload.error || "Invalid code");
			}
			setSessionEmail(String(payload.invitee?.email || verifyEmail));
			setAuthenticated(true);
			await load();
		} catch (err) {
			setGateError(err instanceof Error ? err.message : "Invalid code");
		} finally {
			setGateBusy(false);
		}
	};

	if (error) {
		return (
			<div className="flex h-screen flex-col overflow-hidden bg-slate-100 px-4 py-6 sm:px-6">
				<div className="mx-auto w-full max-w-6xl">
					<p className="rounded-lg border border-red/20 bg-red/10 p-4 text-sm text-red">
						{error}
					</p>
				</div>
			</div>
		);
	}

	if (!authenticated) {
		return (
			<div className="flex h-screen flex-col overflow-hidden bg-slate-100 px-4 py-6 sm:px-6">
				<div className="mx-auto flex w-full max-w-md flex-col">
					<div className="mb-4 flex flex-wrap items-center gap-3">
						<h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
						<span className="inline-flex items-center gap-1.5 rounded-full border border-blue/20 bg-blue/10 px-2.5 py-0.5 text-xs font-medium text-blue">
							<Eye className="h-3.5 w-3.5" />
							Counterparty
						</span>
					</div>
					{participants.length > 0 ? (
						<div className="mb-4 flex justify-end">
							<NegotiationInviteeAvatars
								participants={participants}
								align="end"
							/>
						</div>
					) : null}
					<Card className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="p-4 sm:p-6">
							<div className="mb-4">
								<div className="flex items-center gap-3">
									<Lock className="h-5 w-5 shrink-0 text-[#0f5384]" />
									<p className="text-sm font-semibold sidebar-gradient-text">
										Verify your email to view this draft
									</p>
								</div>
								<p className="mt-1 ml-8 text-xs text-slate-600">
									Only emails invited by the document owner can open this link.
								</p>
							</div>
							{gateStep === "email" ? (
								<div className="space-y-3">
									{invitees.length > 1 ? (
										<label className="block text-sm text-slate-700">
											Your email
											<Select
												value={verifyEmail}
												onValueChange={setVerifyEmail}
											>
												<SelectTrigger className="mt-1 h-10 border-[0.25px] border-slate-300 bg-white">
													<SelectValue placeholder="Select your invited email" />
												</SelectTrigger>
												<SelectContent>
													{invitees.map((invitee) => (
														<SelectItem
															key={invitee.email}
															value={invitee.email}
														>
															{invitee.name} · {invitee.email}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</label>
									) : (
										<label className="block text-sm text-slate-700">
											Your email
											<Input
												className="mt-1 border-[0.25px] border-slate-300"
												type="email"
												value={verifyEmail}
												onChange={(e) => setVerifyEmail(e.target.value)}
												placeholder={invitees[0]?.email || "you@company.com"}
												autoComplete="email"
											/>
										</label>
									)}
									{gateError ? (
										<p className="text-xs text-red">{gateError}</p>
									) : null}
									<div className="flex justify-end">
										<Button
											type="button"
											className="primary-btn px-3 sm:px-4"
											disabled={gateBusy}
											onClick={() => void requestOtp()}
										>
											<Mail className="h-4 w-4" />
											Send verification code
										</Button>
									</div>
								</div>
							) : (
								<div className="space-y-3">
									<p className="text-xs text-slate-600">
										Code sent to{" "}
										<span className="font-medium">{verifyEmail}</span>
									</p>
									<label className="block text-sm text-slate-700">
										Verification code
										<Input
											className="mt-1 border-[0.25px] border-slate-300"
											inputMode="numeric"
											autoComplete="one-time-code"
											value={otp}
											onChange={(e) => setOtp(e.target.value)}
											placeholder="6-digit code"
										/>
									</label>
									{gateError ? (
										<p className="text-xs text-red">{gateError}</p>
									) : null}
									<div className="flex flex-col items-end gap-2">
										<Button
											type="button"
											className="primary-btn px-3 sm:px-4"
											disabled={gateBusy}
											onClick={() => void confirmOtp()}
										>
											<ShieldCheck className="h-4 w-4" />
											Verify and open draft
										</Button>
										<button
											type="button"
											className="cursor-pointer text-xs text-slate-600 underline-offset-2 hover:text-[#0f5384] hover:underline"
											disabled={gateBusy}
											onClick={() => {
												setGateStep("email");
												setOtp("");
												setGateError(null);
											}}
										>
											Use a different email
										</button>
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-screen flex-col overflow-hidden bg-slate-100">
			<div className="mx-auto flex h-full w-full max-w-6xl min-h-0 flex-1 flex-col overflow-hidden px-4 pt-6 sm:px-6">
				<div className="mb-3 flex shrink-0 flex-wrap items-start justify-between gap-3">
					<div className="min-w-0 flex-1">
						<div className="flex flex-wrap items-center gap-3">
							<h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
							<span className="inline-flex items-center gap-1.5 rounded-full border border-blue/20 bg-blue/10 px-2.5 py-0.5 text-xs font-medium text-blue">
								<Eye className="h-3.5 w-3.5" />
								Viewing as counterparty
							</span>
						</div>
						<p className="mt-1 text-sm text-slate-600">
							{sessionEmail ? (
								<>
									<span className="font-medium text-slate-700">
										{sessionEmail}
									</span>
									<span className="mx-1.5 text-slate-400">·</span>
								</>
							) : null}
							Click a paragraph, then leave a comment or suggested replacement
						</p>
					</div>
					<div className="flex shrink-0 items-center gap-2">
						{participants.length > 0 ? (
							<NegotiationInviteeAvatars
								participants={participants}
								align="end"
							/>
						) : null}
						<Button
							type="button"
							variant="outline"
							size="icon"
							className="h-9 w-9 cursor-pointer border-slate-200 text-slate-700"
							onClick={downloadDraft}
							disabled={!text.trim()}
							aria-label="Download draft"
						>
							<Download className="h-4 w-4" />
						</Button>
						<Button
							type="button"
							variant="outline"
							size="icon"
							className="h-9 w-9 cursor-pointer border-slate-200 text-slate-700"
							onClick={printDraft}
							disabled={!text.trim()}
							aria-label="Print draft"
						>
							<Printer className="h-4 w-4" />
						</Button>
					</div>
				</div>

				<div className="mb-3 flex shrink-0 items-center gap-2 rounded-md border border-blue/20 bg-blue/10 px-3 py-2 text-sm text-slate-700">
					<span
						className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue"
						aria-hidden
					/>
					<p>
						<span className="font-semibold text-[#0f5384]">
							{statusCopy.label}
						</span>
						<span className="text-slate-600"> — {statusCopy.detail}</span>
					</p>
				</div>

				<div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-lg border border-b-0 border-slate-200 bg-white shadow-sm lg:flex-row">
					<NegotiationDocumentPane
						model={model}
						comments={comments}
						selectedStart={anchorStart}
						showLineageLinks={false}
						onSelectParagraph={(start, end, paragraphText, canRedline) => {
							setAnchorStart(start);
							setAnchorEnd(end);
							setSnippet(paragraphText);
							setRedlineAllowed(canRedline);
						}}
						onFocusComment={setActiveCommentId}
					/>
					<div className="flex min-h-0 w-full flex-1 flex-col border-t border-slate-200 xl:w-[26rem] xl:flex-none xl:border-t-0">
						<NegotiationCommentThread
							comments={comments}
							versionText={text}
							selectedSnippet={snippet}
							selectedStart={anchorStart}
							selectedEnd={anchorEnd}
							redlineAllowed={redlineAllowed}
							canEdit
							busy={busy}
							activeCommentId={activeCommentId}
							onFocusParagraph={(comment) => {
								setActiveCommentId(comment.$id);
								const paragraph = model.negotiableParagraphs.find(
									(row) =>
										comment.anchorStart < row.end &&
										comment.anchorEnd > row.start,
								);
								if (!paragraph) return;
								const editableStart =
									paragraph.protectedEnd &&
									paragraph.protectedEnd < paragraph.end
										? paragraph.protectedEnd
										: paragraph.start;
								setAnchorStart(editableStart);
								setAnchorEnd(paragraph.end);
								setSnippet(
									paragraph.text.slice(editableStart - paragraph.start),
								);
								setRedlineAllowed(paragraph.redlineAllowed !== false);
								document
									.getElementById(negotiationParagraphDomId(paragraph.start))
									?.scrollIntoView({ behavior: "smooth", block: "center" });
							}}
							onCreate={async (body, redlineProposal) => {
								if (anchorEnd <= anchorStart) return;
								setBusy(true);
								setSaveError(null);
								try {
									const res = await fetch(`/api/negotiate/${token}/comments`, {
										method: "POST",
										credentials: "include",
										headers: { "Content-Type": "application/json" },
										body: JSON.stringify({
											body,
											redlineProposal,
											anchorStart,
											anchorEnd,
											anchorType: "paragraph",
										}),
									});
									if (!res.ok) {
										const payload = await res.json().catch(() => ({}));
										throw new Error(payload.error || "Could not comment");
									}
									await load();
								} catch (submitError) {
									setSaveError(
										submitError instanceof Error
											? submitError.message
											: "Could not comment",
									);
								} finally {
									setBusy(false);
								}
							}}
						/>
					</div>
				</div>
				{saveError ? (
					<p className="shrink-0 rounded-b-lg border border-t-0 border-red/20 bg-red/10 p-3 text-sm text-red">
						{saveError}
					</p>
				) : null}
			</div>
		</div>
	);
}
