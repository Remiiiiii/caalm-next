"use client";
import { Check, EyeOff, Lock, MessageSquare, RotateCw, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatRelativeTime } from "@/lib/assistant/formatMarkdown";
import { displayNameFromEmail } from "@/lib/contracts/negotiation/comments.logic";
import type { NegotiationComment } from "@/lib/contracts/negotiation/comments.service";
import { cn } from "@/lib/utils";
export type CommentScope = "all" | "section" | "selected";
interface NegotiationCommentThreadProps {
	comments: NegotiationComment[];
	/** Raw version text — used to quote the anchored span on each card. */
	versionText: string;
	selectedSnippet: string;
	selectedStart?: number;
	selectedEnd?: number;
	/** Character range of the clause currently in view — for "This section" filter. */
	activeClauseRange?: { start: number; end: number } | null;
	redlineAllowed?: boolean;
	canEdit: boolean;
	busy: boolean;
	/** Which slow action is in flight, e.g. `accept:commentId` or `resolve:commentId`. */
	busyAction?: string | null;
	activeCommentId?: string;
	/** Internal workspace shows the internal-only toggle; public page hides it. */
	allowInternalToggle?: boolean;
	onFocusParagraph?: (comment: NegotiationComment) => void;
	onCreate: (body: string, redlineProposal: string, internal: boolean) => void;
	onResolve?: (commentId: string) => void;
	onAccept?: (commentId: string) => void;
}
function commentOverlapsRange(
	comment: NegotiationComment,
	start: number,
	end: number,
): boolean {
	return comment.anchorStart < end && comment.anchorEnd > start;
}
function authorDisplayName(comment: NegotiationComment): string {
	const named = String(comment.authorName || "").trim();
	if (named) return named;
	const fromEmail = displayNameFromEmail(comment.authorEmail);
	if (fromEmail) return fromEmail;
	if (comment.authorEmail.trim()) return comment.authorEmail.trim();
	return comment.authorType === "counterparty" ? "Counterparty" : "Internal";
}
function authorInitials(comment: NegotiationComment): string {
	const name = authorDisplayName(comment);
	const parts = name.split(/\s+/).filter(Boolean);
	if (parts.length >= 2) {
		return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
	}
	if (parts.length === 1 && parts[0].length >= 2) {
		return parts[0].slice(0, 2).toUpperCase();
	}
	const email = comment.authorEmail.trim();
	if (email) return email.slice(0, 2).toUpperCase();
	return comment.authorType === "counterparty" ? "CP" : "IN";
}
export function NegotiationCommentThread({
	comments,
	versionText,
	selectedSnippet,
	selectedStart = -1,
	selectedEnd = -1,
	activeClauseRange = null,
	redlineAllowed = true,
	canEdit,
	busy,
	busyAction = null,
	activeCommentId,
	allowInternalToggle = false,
	onFocusParagraph,
	onCreate,
	onResolve,
	onAccept,
}: NegotiationCommentThreadProps) {
	const [body, setBody] = useState("");
	const [redline, setRedline] = useState("");
	const [internal, setInternal] = useState(false);
	const [tab, setTab] = useState<"open" | "resolved">("open");
	const [scope, setScope] = useState<CommentScope>("all");
	const listRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (!redlineAllowed) setRedline("");
	}, [redlineAllowed]);
	const scoped = comments.filter((comment) => {
		if (scope === "selected") {
			if (selectedEnd <= selectedStart) return false;
			return commentOverlapsRange(comment, selectedStart, selectedEnd);
		}
		if (scope === "section") {
			if (!activeClauseRange) return false;
			return commentOverlapsRange(
				comment,
				activeClauseRange.start,
				activeClauseRange.end,
			);
		}
		return true;
	});
	const openComments = scoped.filter((row) => row.status === "open");
	const resolvedComments = scoped.filter((row) => row.status !== "open");
	const visible = tab === "open" ? openComments : resolvedComments;
	const hasParagraph = Boolean(selectedSnippet.trim());
	const canSubmit = !busy && hasParagraph && Boolean(body.trim());
	const openAllCount = comments.filter((row) => row.status === "open").length;
	// Marker click in the doc pane → scroll the matching card into view.
	useEffect(() => {
		if (!activeCommentId) return;
		const target = comments.find((row) => row.$id === activeCommentId);
		if (target && target.status !== "open") setTab("resolved");
		// Expand scope so a marker click always finds its card.
		setScope("all");
		const node = listRef.current?.querySelector(
			`[data-comment-id="${activeCommentId}"]`,
		);
		node?.scrollIntoView({ behavior: "smooth", block: "center" });
	}, [activeCommentId, comments]);
	const emptyCopy = (() => {
		if (tab === "resolved") {
			return {
				title: "Nothing resolved yet",
				detail: "Resolved threads will show up here.",
			};
		}
		if (scope === "section") {
			return {
				title: "No open comments in this section",
				detail: "Scroll the draft or switch to All to see other threads.",
			};
		}
		if (scope === "selected") {
			return {
				title: "No comments on this paragraph",
				detail: "Add one below, or pick a different paragraph.",
			};
		}
		return {
			title: "No open comments yet",
			detail: "Click a paragraph in the draft to leave feedback or a suggested replacement.",
		};
	})();

	return (
		<aside className="flex h-full max-h-[40vh] min-h-0 w-full shrink-0 flex-col border-l border-slate-200 bg-white xl:max-h-none xl:w-[26rem]">
			<div className="shrink-0 border-b border-slate-200 px-4 pt-3">
				<div className="flex items-center gap-2">
					<MessageSquare className="h-4 w-4 text-[#0f5384]" />
					<p className="text-sm font-medium sidebar-gradient-text">Comments</p>
				</div>
				<div className="mt-2 flex gap-4">
					<button
						type="button"
						className="tabs-underline cursor-pointer pb-2 text-xs font-medium text-slate-600"
						data-state={tab === "open" ? "active" : "inactive"}
						onClick={() => setTab("open")}
					>
						Open · {openComments.length}
						{scope !== "all" ? ` / ${openAllCount}` : ""}
					</button>
					<button
						type="button"
						className="tabs-underline cursor-pointer pb-2 text-xs font-medium text-slate-600"
						data-state={tab === "resolved" ? "active" : "inactive"}
						onClick={() => setTab("resolved")}
					>
						Resolved · {resolvedComments.length}
					</button>
				</div>
				<div className="mt-3 mb-2 flex flex-wrap gap-1">
					{(
						[
							["all", "All"],
							["section", "This section"],
							["selected", "Selected"],
						] as const
					).map(([value, label]) => (
						<button
							key={value}
							type="button"
							onClick={() => setScope(value)}
							className={cn(
								"cursor-pointer rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors duration-200",
								scope === value
									? "border-blue/20 bg-blue/10 text-blue"
									: "border-slate-200 bg-white text-slate-600 hover:border-blue-300",
							)}
						>
							{label}
						</button>
					))}
				</div>
			</div>
			<div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
				{visible.length === 0 ? (
					<div className="flex h-full min-h-40 flex-col items-center justify-center px-4 text-center">
						<MessageSquare
							className="mb-2 h-8 w-8 text-slate-300"
							aria-hidden
						/>
						<p className="text-sm font-medium text-slate-700">
							{emptyCopy.title}
						</p>
						<p className="mt-1 max-w-xs text-xs text-slate-500">
							{emptyCopy.detail}
						</p>
					</div>
				) : null}
				{visible.map((comment) => {
					const isCounterparty = comment.authorType === "counterparty";
					const quote = versionText
						.slice(comment.anchorStart, comment.anchorEnd)
						.trim();
					const active = comment.$id === activeCommentId;
					const displayName = authorDisplayName(comment);
					const teamLabel = isCounterparty ? "Counterparty" : "Internal team";
					const timeLabel = comment.$createdAt
						? `${formatRelativeTime(comment.$createdAt)} ago`
						: "";
					return (
						<div
							key={comment.$id}
							data-comment-id={comment.$id}
							role={onFocusParagraph ? "button" : undefined}
							tabIndex={onFocusParagraph ? 0 : undefined}
							onClick={() => onFocusParagraph?.(comment)}
							onKeyDown={(event) => {
								if (event.key === "Enter" || event.key === " ") {
									event.preventDefault();
									onFocusParagraph?.(comment);
								}
							}}
							className={cn(
								"rounded-lg border bg-white p-3 transition-all duration-200",
								onFocusParagraph && "cursor-pointer hover:border-blue-300",
								active
									? "border-blue-300 shadow-sm ring-1 ring-blue-300/40"
									: "border-slate-200",
							)}
						>
							<div className="-mx-3 -mt-3 mb-3 flex items-start gap-2 rounded-t-lg border-b border-slate-200 bg-slate-50 px-3 py-2.5">
								<span
									className={cn(
										"flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
										isCounterparty
											? "bg-pink/15 text-pink"
											: "bg-green/15 text-green",
									)}
								>
									{authorInitials(comment)}
								</span>
								<div className="min-w-0 flex-1">
									<div className="flex items-start gap-2">
										<p className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-800">
											{displayName}
										</p>
										{comment.visibility === "internal" ? (
											<span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600">
												<EyeOff className="h-3 w-3" />
												Internal
											</span>
										) : null}
										<span
											className={cn(
												"inline-block shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
												comment.status === "open"
													? "border-orange/20 bg-orange/10 text-orange"
													: "border-green/20 bg-green/10 text-green",
											)}
										>
											{comment.status === "open" ? "Open" : "Resolved"}
										</span>
										{timeLabel ? (
											<span className="shrink-0 text-[10px] text-slate-400">
												{timeLabel}
											</span>
										) : null}
									</div>
									<p className="mt-0.5 text-[10px] font-medium tracking-wide text-slate-400 uppercase">
										{teamLabel}
									</p>
								</div>
							</div>
							{quote ? (
								<p className="mb-1.5 line-clamp-2 border-l-2 border-slate-200 pl-2 text-[11px] text-slate-500 italic">
									“{quote.slice(0, 140)}
									{quote.length > 140 ? "…" : ""}”
								</p>
							) : null}
							<p className="text-sm text-slate-700">{comment.body}</p>
							{comment.redlineProposal ? (
								<div className="mt-2 rounded bg-slate-50 px-2 py-1.5 text-xs leading-relaxed">
									{quote ? (
										<del className="negotiate-redline-del no-underline">
											{quote.slice(0, 90)}
											{quote.length > 90 ? "…" : ""}
										</del>
									) : null}{" "}
									<ins className="negotiate-redline-ins">
										{comment.redlineProposal}
									</ins>
								</div>
							) : null}
							{canEdit && comment.status === "open" ? (
								<TooltipProvider>
									<div className="mt-2 flex gap-2">
										{onResolve ? (
											<Tooltip>
												<TooltipTrigger asChild>
													<Button
														type="button"
														className="primary-btn h-8 flex-1 px-2 text-xs"
														disabled={busy}
														onClick={(event) => {
															event.stopPropagation();
															onResolve(comment.$id);
														}}
													>
														{busyAction === `resolve:${comment.$id}` ? (
															<RotateCw className="h-3 w-3 animate-spin" />
														) : (
															<Check className="h-3 w-3" />
														)}
														Resolve
													</Button>
												</TooltipTrigger>
												<TooltipContent side="top" className="max-w-[220px] text-xs">
													Marks this thread done. Contract text stays unchanged.
												</TooltipContent>
											</Tooltip>
										) : null}
										{onAccept && comment.redlineProposal ? (
											<Tooltip>
												<TooltipTrigger asChild>
													<Button
														type="button"
														className="primary-btn h-8 flex-1 px-2 text-xs"
														disabled={busy}
														onClick={(event) => {
															event.stopPropagation();
															onAccept(comment.$id);
														}}
													>
														{busyAction === `accept:${comment.$id}` ? (
															<RotateCw className="h-3 w-3 animate-spin" />
														) : (
															<Check className="h-3 w-3" />
														)}
														Accept redline
													</Button>
												</TooltipTrigger>
												<TooltipContent side="top" className="max-w-[240px] text-xs">
													Creates a new text version. The PDF file stays
													unchanged until you re-export.
												</TooltipContent>
											</Tooltip>
										) : null}
									</div>
								</TooltipProvider>
							) : null}
						</div>
					);
				})}
			</div>
			{canEdit ? (
				<div className="shrink-0 space-y-2 border-t border-slate-200 bg-slate-50 p-3">
					<div className="flex items-start gap-2 text-xs text-slate-600">
						<span
							className={cn(
								"mt-1.5 h-2 w-2 shrink-0 rounded-full",
								hasParagraph ? "bg-blue" : "bg-slate-300",
							)}
							aria-hidden
						/>
						{hasParagraph ? (
							<p className="min-w-0">
								<span className="font-medium text-slate-700">
									Replying to the highlighted paragraph
								</span>
								{selectedSnippet.trim() ? (
									<span className="mt-0.5 block truncate text-slate-500 italic">
										“{selectedSnippet.trim()}”
									</span>
								) : null}
							</p>
						) : (
							<p>Select a paragraph in the draft to reply.</p>
						)}
					</div>
					<Textarea
						className="border-[0.25px] border-slate-300"
						placeholder="Add a comment..."
						value={body}
						disabled={!hasParagraph}
						onChange={(event) => setBody(event.target.value)}
					/>
					<Textarea
						className="border-[0.25px] border-slate-300"
						placeholder={
							redlineAllowed
								? "Optional: suggest replacement text (redline)"
								: "This authored label cannot be redlined"
						}
						value={redline}
						disabled={!hasParagraph || !redlineAllowed}
						onChange={(event) => setRedline(event.target.value)}
					/>
					{allowInternalToggle ? (
						<label
							className={cn(
								"inline-flex w-full cursor-pointer items-center gap-2 rounded-md border border-blue/20 bg-blue/10 px-2.5 py-1.5 text-xs font-medium text-[#0f5384] transition-colors duration-200",
								!hasParagraph && "pointer-events-none opacity-50",
								internal && "border-blue/30 bg-blue/15",
							)}
						>
							<input
								type="checkbox"
								className="h-3.5 w-3.5 shrink-0 accent-[#0f5384]"
								checked={internal}
								disabled={!hasParagraph}
								onChange={(event) => setInternal(event.target.checked)}
							/>
							<Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
							<span className="truncate">
								Internal only — hidden from counterparty
							</span>
						</label>
					) : null}
					<div className="flex justify-end">
						<Button
							type="button"
							className="primary-btn shrink-0 px-3 sm:px-4"
							disabled={!canSubmit}
							onClick={() => {
								onCreate(
									body.trim(),
									redlineAllowed ? redline.trim() : "",
									internal,
								);
								setBody("");
								setRedline("");
								setInternal(false);
							}}
						>
							<Send className="h-4 w-4" />
							Add comment
						</Button>
					</div>
				</div>
			) : null}
		</aside>
	);
}
