"use client";

import { Check, Copy, Info, Link2, Send, UserPlus, X } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { NegotiationInvitee } from "@/lib/contracts/negotiation/access.logic";
import { cn } from "@/lib/utils";

interface CounterpartyInviteDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	busy: boolean;
	onCreate: (
		invitees: NegotiationInvitee[],
		expiresInDays: number,
	) => Promise<string | null>;
	onSend: (
		emails: string[],
		message: string,
		urlPath: string,
	) => Promise<boolean>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COPIED_MS = 2000;

export function CounterpartyInviteDialog({
	open,
	onOpenChange,
	busy,
	onCreate,
	onSend,
}: CounterpartyInviteDialogProps) {
	const [email, setEmail] = useState("");
	const [fullName, setFullName] = useState("");
	const [invitees, setInvitees] = useState<NegotiationInvitee[]>([]);
	const [message, setMessage] = useState("");
	const [link, setLink] = useState("");
	const [copied, setCopied] = useState(false);
	const [sent, setSent] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(
		() => () => {
			if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
		},
		[],
	);

	useEffect(() => {
		if (open) return;
		setEmail("");
		setFullName("");
		setInvitees([]);
		setMessage("");
		setLink("");
		setCopied(false);
		setSent(false);
		setFormError(null);
	}, [open]);

	const addInvitee = () => {
		const nextEmail = email.trim().toLowerCase();
		const nextName = fullName.trim();
		if (!EMAIL_RE.test(nextEmail)) {
			setFormError("Enter a valid email address.");
			return false;
		}
		if (!nextName) {
			setFormError("Enter a full name for this email before adding.");
			return false;
		}
		setInvitees((current) => {
			const without = current.filter((row) => row.email !== nextEmail);
			return [...without, { email: nextEmail, name: nextName }];
		});
		setEmail("");
		setFullName("");
		setFormError(null);
		setSent(false);
		return true;
	};

	const handleEmailKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key !== "Enter" && event.key !== "," && event.key !== ";") {
			return;
		}
		event.preventDefault();
		addInvitee();
	};

	const handleNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key !== "Enter") return;
		event.preventDefault();
		addInvitee();
	};

	const handleCopyLink = async () => {
		if (!link) return;
		try {
			await navigator.clipboard.writeText(link);
			setCopied(true);
			if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
			copiedTimerRef.current = setTimeout(() => setCopied(false), COPIED_MS);
		} catch {
			setCopied(false);
		}
	};

	const draftInvitee =
		EMAIL_RE.test(email.trim().toLowerCase()) && fullName.trim()
			? [{ email: email.trim().toLowerCase(), name: fullName.trim() }]
			: [];
	const chosenInvitees = invitees.length > 0 ? invitees : draftInvitee;
	const canCreateLink = !busy && chosenInvitees.length > 0 && !link;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[90vh] max-w-[600px] flex-col overflow-hidden border border-slate-200 p-0 shadow-xl">
				<div className="absolute top-0 right-0 left-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />
				<div className="sticky top-0 z-10 mt-4 border-b border-slate-200 bg-linear-to-r from-blue-50 to-indigo-50 py-4">
					<div className="flex items-center gap-3 px-6">
						<div className="flex items-center gap-3">
							<UserPlus className="h-5 w-5 text-[#0f5384]" />
							<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
								Invite counterparty
							</DialogTitle>
						</div>
					</div>
					<p className="mt-1 ml-14 text-sm text-slate-600">
						Share one secure link. Only invited emails can open it after
						verification. Add a full name for every email.
					</p>
				</div>
				<div className="flex-1 overflow-y-auto bg-slate-50 p-6">
					<div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
						<div className="grid gap-3 sm:grid-cols-2">
							<label className="block text-sm text-slate-700">
								Full name
								<Input
									className="mt-1 border-[0.25px] border-slate-300"
									value={fullName}
									onChange={(event) => {
										setFullName(event.target.value);
										setFormError(null);
									}}
									onKeyDown={handleNameKeyDown}
									placeholder="Jamie Marsh"
									autoComplete="name"
								/>
							</label>
							<label className="block text-sm text-slate-700">
								Email
								<Input
									className="mt-1 border-[0.25px] border-slate-300"
									type="email"
									value={email}
									onChange={(event) => {
										setEmail(event.target.value);
										setFormError(null);
									}}
									onKeyDown={handleEmailKeyDown}
									placeholder="jamie@company.com"
								/>
							</label>
						</div>
						<p className="text-xs text-slate-500">
							Press Enter after both fields to add another person.
						</p>
						{formError ? <p className="text-xs text-red">{formError}</p> : null}
						{invitees.length > 0 ? (
							<div className="space-y-2">
								{invitees.map((item) => (
									<div
										key={item.email}
										className="flex items-center justify-between gap-2 rounded-lg border border-blue/20 bg-blue/10 px-3 py-2"
									>
										<div className="min-w-0">
											<p className="truncate text-sm font-medium text-slate-800">
												{item.name}
											</p>
											<p className="truncate text-xs text-slate-600">
												{item.email}
											</p>
										</div>
										<button
											type="button"
											className="cursor-pointer rounded-full p-1 text-slate-500 transition-colors hover:bg-blue/10 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
											aria-label={`Remove ${item.name}`}
											onClick={() => {
												setInvitees((current) =>
													current.filter((row) => row.email !== item.email),
												);
												setSent(false);
											}}
										>
											<X className="h-4 w-4" />
										</button>
									</div>
								))}
							</div>
						) : null}
						<label className="block text-sm text-slate-700">
							Message <span className="text-slate-400">(optional)</span>
							<Textarea
								className="mt-1 min-h-28 border-[0.25px] border-slate-300"
								value={message}
								onChange={(event) => setMessage(event.target.value)}
								placeholder="Add a message"
							/>
						</label>
						{link ? (
							<div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
								<p className="mb-2 text-xs text-slate-500">Share this link</p>
								<div className="flex items-center gap-2">
									<Input
										readOnly
										value={link}
										className="border-[0.25px] border-slate-300"
									/>
									<TooltipProvider>
										<Tooltip open={copied}>
											<TooltipTrigger asChild>
												<button
													type="button"
													onClick={() => void handleCopyLink()}
													className={cn(
														"shrink-0 rounded p-1.5 text-slate-500 cursor-pointer transition-colors duration-200",
														"hover:text-[#0f5384] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
														copied && "text-green",
													)}
													aria-label={copied ? "Link copied" : "Copy link"}
												>
													{copied ? (
														<Check className="h-4 w-4" aria-hidden />
													) : (
														<Copy className="h-4 w-4" aria-hidden />
													)}
												</button>
											</TooltipTrigger>
											<TooltipContent side="top" className="text-xs">
												Copied!
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								</div>
								<p className="mt-2 text-center text-xs font-medium text-slate-700">
									Links expire in 14 days.
								</p>
							</div>
						) : null}
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
					<p className="flex min-w-0 flex-1 items-start gap-2 text-xs text-slate-600">
						<Info
							className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0f5384]"
							aria-hidden
						/>
						<span>
							Everyone on this list shares one link. Invited emails must verify
							with a code before they can view the draft.
						</span>
					</p>
					{!link ? (
						<Button
							type="button"
							className="primary-btn shrink-0 px-3 sm:px-4"
							disabled={!canCreateLink}
							onClick={async () => {
								let next = [...invitees];
								const draftEmail = email.trim().toLowerCase();
								const draftName = fullName.trim();
								if (draftEmail || draftName) {
									if (!EMAIL_RE.test(draftEmail)) {
										setFormError("Enter a valid email address.");
										return;
									}
									if (!draftName) {
										setFormError(
											"Enter a full name for this email before creating the link.",
										);
										return;
									}
									next = [
										...next.filter((row) => row.email !== draftEmail),
										{ email: draftEmail, name: draftName },
									];
								}
								if (next.length === 0) {
									setFormError("Add at least one person with name and email.");
									return;
								}
								setInvitees(next);
								setEmail("");
								setFullName("");
								setFormError(null);
								const url = await onCreate(next, 14);
								if (url) setLink(url);
							}}
						>
							<Link2 className="h-4 w-4" />
							Create link
						</Button>
					) : (
						<Button
							type="button"
							className="primary-btn shrink-0 px-3 sm:px-4"
							disabled={busy || invitees.length === 0 || sent}
							onClick={async () => {
								const didSend = await onSend(
									invitees.map((row) => row.email),
									message.trim(),
									link,
								);
								if (didSend) setSent(true);
							}}
						>
							{sent ? (
								<Check className="h-4 w-4" />
							) : (
								<Send className="h-4 w-4" />
							)}
							{sent ? "Sent" : "Send"}
						</Button>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
