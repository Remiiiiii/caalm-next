"use client";

import {
	CheckCircle2,
	ChevronUp,
	ExternalLink,
	Info,
	RefreshCw,
	UserPlus,
	Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetTitle,
} from "@/components/ui/sheet";
import type { UserProfile } from "@/lib/tickets/submitter-avatars";
import type {
	GitHubIssueSnapshot,
	Ticket,
	TicketEvent,
} from "@/lib/tickets/ticket.types";
import { resolveTicketLane } from "@/lib/tickets/ticket.types";
import { displayTicketNumber } from "@/lib/tickets/ticket-number.utils";
import { severityLevelNumber } from "@/lib/tickets/ticket-queue";
import { cn } from "@/lib/utils";
import { TicketAssigneePicker } from "../TicketAssigneePicker";
import { TicketStatusPill } from "../TicketStatusPill";
import { formatTicketDateTime } from "./format";
import { SheetSection } from "./SheetSection";
import { TicketAuditTrail } from "./TicketAuditTrail";
import { useTicketSheet } from "./TicketSheetContext";
import { TicketSlaCard } from "./TicketSlaCard";

const SECONDARY_BTN =
	"h-7 rounded-md border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-50";

/** Slide-in panel with the ticket's staff actions, SLA, GitHub issue and audit trail. */
export function TicketSheet({
	ticket,
	events,
	timeZone,
	assignee,
	canAssign,
	actorNames,
	busy,
	showClaim,
	showClose,
	showEscalate,
	canClose,
	isOpen,
	onAction,
	github,
	canStartAgent,
	agentStartLabel,
	onStartFixAgent,
}: {
	ticket: Ticket;
	events: TicketEvent[];
	timeZone: string;
	assignee?: UserProfile;
	/** The viewer may add or change the assignee. */
	canAssign: boolean;
	actorNames: Record<string, string>;
	busy: boolean;
	showClaim: boolean;
	showClose: boolean;
	showEscalate: boolean;
	canClose: boolean;
	isOpen: boolean;
	onAction: (path: "claim" | "close" | "escalate") => void;
	github: {
		show: boolean;
		issue: GitHubIssueSnapshot | null;
		title: string;
		syncedAt: number | null;
		fresh: boolean;
		loading: boolean;
		onRefresh: () => void;
	};
	/** Shown only while no fix agent is running. */
	canStartAgent: boolean;
	agentStartLabel: string;
	onStartFixAgent: () => void;
}) {
	const { open, setOpen } = useTicketSheet();
	const lane = resolveTicketLane(ticket);
	const laneLabel = lane === "engineering" ? "Engineering" : "Help";
	const severity = `${ticket.severity.charAt(0).toUpperCase()}${ticket.severity.slice(1)}`;
	const description =
		lane === "engineering"
			? `${laneLabel} · ${severity} · SEV-${severityLevelNumber(ticket.severity)}`
			: `${laneLabel} · ${severity}`;

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetContent
				side="right"
				className="inset-y-auto! top-4! right-4! bottom-auto! flex h-auto! max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-0 shadow-xl backdrop-blur-none sm:max-w-md"
			>
				<div className="glass-card-cap" />
				<div className="shrink-0 px-6 pb-4 pt-8">
					<div className="flex items-center justify-between gap-3 pr-8">
						<SheetTitle className="text-base font-bold text-slate-800">
							{displayTicketNumber(ticket)}
						</SheetTitle>
						<TicketStatusPill status={ticket.status} />
					</div>
					<SheetDescription className="mt-0.5 text-sm text-slate-500">
						{description}
					</SheetDescription>
				</div>

				<div className="min-h-0 flex-1 overflow-y-auto">
					<SheetSection title="Staff actions">
						<div className="flex items-center justify-between gap-2 text-[11.5px] text-slate-500">
							<span>Assigned to</span>
							<TicketAssigneePicker
								ticketId={ticket.$id}
								assigneeId={ticket.assigneeCaalmUserId}
								assignee={assignee}
								canAssign={canAssign}
								variant="pill"
							/>
						</div>
						<div className="flex flex-col gap-2">
							{showClaim ? (
								<Button
									type="button"
									variant="brand"
									className="w-full"
									disabled={busy}
									onClick={() => onAction("claim")}
								>
									<UserPlus className="h-4 w-4" aria-hidden />
									{busy ? "Working…" : "Claim ticket"}
								</Button>
							) : null}
							{showClose ? (
								<Button
									type="button"
									variant="outline"
									className="h-9 w-full rounded-[10px] border-[1.5px] border-[#a7e9d5] bg-[#3DD9B3]/10 text-[#0e8a63] hover:bg-[#3DD9B3]/20"
									disabled={busy}
									onClick={() => onAction("close")}
								>
									<CheckCircle2 className="h-4 w-4" aria-hidden />
									{busy ? "Working…" : "Mark resolved"}
								</Button>
							) : null}
							{showEscalate ? (
								<Button
									type="button"
									variant="outline"
									className="h-9 w-full rounded-[10px] border-[1.5px] border-[#fcd9bd] bg-[#F9AB72]/10 text-[#b45309] hover:bg-[#F9AB72]/20"
									disabled={busy}
									onClick={() => onAction("escalate")}
								>
									<ChevronUp className="h-4 w-4" aria-hidden />
									{busy ? "Working…" : "Escalate"}
								</Button>
							) : null}
						</div>
						{ticket.assigneeCaalmUserId && !canClose && isOpen ? (
							<p className="flex items-start gap-1.5 text-[11px] text-slate-400">
								<Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
								Ticket is assigned. Only the assignee or an admin can mark it
								resolved.
							</p>
						) : null}
						{showClose && !ticket.assigneeCaalmUserId ? (
							<p className="flex items-start gap-1.5 text-[11px] text-slate-400">
								<Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
								Claim the ticket before marking it resolved.
							</p>
						) : null}
					</SheetSection>

					<TicketSlaCard ticket={ticket} timeZone={timeZone} />

					{github.show ? (
						<SheetSection title="GitHub issue">
							<div className="flex items-start justify-between gap-3">
								<div className="min-w-0 space-y-0.5">
									<p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
										<span
											className={cn(
												"h-2 w-2 shrink-0 rounded-full",
												github.syncedAt === null ? "bg-slate-300" : "bg-green",
												github.fresh && "animate-pulse",
											)}
											aria-hidden
										/>
										<span className="truncate">
											{ticket.githubIssueNumber
												? `#${ticket.githubIssueNumber} · ${github.title}`
												: "No GitHub issue linked yet"}
										</span>
									</p>
									{github.syncedAt !== null ? (
										<p className="text-[11px] text-slate-400">
											Synced{" "}
											{formatTicketDateTime(
												new Date(github.syncedAt).toISOString(),
												timeZone,
											)}
										</p>
									) : null}
								</div>
								<Button
									type="button"
									variant="ghost"
									className={cn(SECONDARY_BTN, "shrink-0")}
									onClick={github.onRefresh}
									disabled={github.loading || !ticket.githubIssueNumber}
								>
									<RefreshCw
										className={cn("h-3 w-3", github.loading && "animate-spin")}
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
									className="inline-flex items-center gap-1 text-xs font-semibold text-[#078FAB] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
								>
									<ExternalLink className="h-3 w-3" aria-hidden />
									View on GitHub
								</a>
							) : null}
							{github.issue && github.issue.comments.length > 0 ? (
								<ul className="space-y-2">
									{github.issue.comments.map((comment) => (
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
						</SheetSection>
					) : null}

					<TicketAuditTrail
						events={events}
						timeZone={timeZone}
						actorNames={actorNames}
					/>
				</div>

				{canStartAgent ? (
					<div className="flex shrink-0 justify-end px-6 pb-4 pt-2">
						<Button
							type="button"
							variant="brand"
							disabled={busy}
							onClick={() => {
								setOpen(false);
								onStartFixAgent();
							}}
						>
							<Zap className="h-3 w-3" aria-hidden />
							{agentStartLabel}
						</Button>
					</div>
				) : null}
			</SheetContent>
		</Sheet>
	);
}
