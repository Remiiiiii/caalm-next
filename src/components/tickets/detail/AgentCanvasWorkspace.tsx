"use client";

import {
	CheckCircle2,
	ExternalLink,
	MoveUp,
	Paperclip,
	Send,
	Square,
} from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import type { ActivityKind } from "@/lib/tickets/agent-events";
import type { Ticket } from "@/lib/tickets/ticket.types";
import { cn } from "@/lib/utils";
import { useAgentStream } from "./useAgentStream";

/** Dark IDE palette (ticket-detail spec §6.2). Scoped to this workspace only. */
const IDE_VARS = {
	"--ide-bg": "#0d1117",
	"--ide-surface": "#111827",
	"--ide-border": "#1e293b",
	"--ide-text": "#94a3b8",
	"--ide-muted": "#475569",
	"--ide-cmd": "#56B8FF",
	"--ide-ok": "#3DD9B3",
	"--ide-warn": "#F9AB72",
	"--ide-err": "#FF7474",
} as CSSProperties;

/** What the agent is doing right now, in words a person can act on. */
type AgentView = "starting" | "working" | "finished" | "error" | "stopped";

const VIEW_STYLE: Record<
	AgentView,
	{ label: string; hint: string; dot: string; pulse: boolean }
> = {
	starting: {
		label: "STARTING",
		hint: "Getting the agent ready.",
		dot: "bg-[#56B8FF]",
		pulse: true,
	},
	working: {
		label: "WORKING",
		hint: "The agent is making changes. Wait for Finished, or stop it.",
		dot: "bg-[#3DD9B3]",
		pulse: true,
	},
	finished: {
		label: "FINISHED",
		hint: "The agent is done. Review the result, then mark the ticket resolved.",
		dot: "bg-[#3DD9B3]",
		pulse: false,
	},
	error: {
		label: "ERROR",
		hint: "The agent hit a problem. Stop it, then finish the ticket yourself.",
		dot: "bg-[#FF7474]",
		pulse: false,
	},
	stopped: {
		label: "STOPPED",
		hint: "The agent was stopped. A person needs to finish this ticket.",
		dot: "bg-[#475569]",
		pulse: false,
	},
};

const LINE_CLASS: Record<ActivityKind, string> = {
	assistant: "text-[var(--ide-text)]",
	thinking: "italic text-[var(--ide-muted)]",
	tool: "text-[var(--ide-cmd)]",
	output: "text-[var(--ide-text)]",
	error: "text-[var(--ide-err)]",
};

/**
 * Dark workspace for the ticket's Cursor fix agent: a live activity feed, the
 * agent's result and pull request, and a box to steer it.
 */
export function AgentCanvasWorkspace({
	ticket,
	canControl,
	stopping,
	onStop,
	canClose,
	closing,
	onMarkResolved,
}: {
	ticket: Ticket;
	canControl: boolean;
	stopping: boolean;
	onStop: () => void;
	/** The viewer may mark the ticket resolved. */
	canClose: boolean;
	closing: boolean;
	onMarkResolved: () => void;
}) {
	const [restartKey, setRestartKey] = useState(0);
	const { state, connection, sendMessage } = useAgentStream(
		ticket.$id,
		true,
		restartKey,
	);
	const [prompt, setPrompt] = useState("");
	const [sendError, setSendError] = useState<string | null>(null);
	const feedRef = useRef<HTMLDivElement>(null);
	const lineCount = state.activity.length;

	useEffect(() => {
		const el = feedRef.current;
		if (el && lineCount >= 0) el.scrollTop = el.scrollHeight;
	}, [lineCount]);

	const stopped = ticket.status === "NEEDS_HUMAN" || ticket.status === "FAILED";
	const view: AgentView = stopped
		? "stopped"
		: state.phase === "idle"
			? "finished"
			: state.phase;
	const style = VIEW_STYLE[view];
	const running = view === "starting" || view === "working";
	const live = running && connection !== "ended";

	const statusHint =
		connection === "reconnecting" && running
			? "Reconnecting…"
			: connection === "connecting" && running
				? "Connecting…"
				: style.hint;

	const send = async () => {
		const text = prompt.trim();
		if (!text) return;
		setSendError(null);
		const error = await sendMessage(text);
		if (error) {
			setSendError(error);
			return;
		}
		setPrompt("");
		setRestartKey((key) => key + 1);
	};

	return (
		<div
			style={IDE_VARS}
			className="bg-[var(--ide-bg)] font-mono text-[var(--ide-text)]"
		>
			<div
				role="status"
				aria-live="polite"
				className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
				style={{ background: "linear-gradient(135deg, #0f1e35, #0d2a3d)" }}
			>
				<div className="flex items-center gap-2 text-xs">
					{view === "finished" ? (
						<CheckCircle2
							className="h-4 w-4 shrink-0 text-[var(--ide-ok)]"
							aria-hidden
						/>
					) : (
						<span
							className={cn(
								"h-2 w-2 shrink-0 rounded-full",
								style.dot,
								style.pulse && "animate-pulse",
							)}
							aria-hidden
						/>
					)}
					<span
						className={cn(
							"font-bold tracking-wide text-white",
							view === "finished" && "text-[var(--ide-ok)]",
						)}
					>
						{style.label}
					</span>
					<span>— {statusHint}</span>
				</div>
				<div className="flex items-center gap-2">
					{canControl && (running || view === "error") ? (
						<button
							type="button"
							onClick={onStop}
							disabled={stopping}
							className="inline-flex h-7 cursor-pointer items-center gap-1 rounded border border-[#FF7474] px-2 text-[11px] text-[#FF7474] transition-colors duration-200 hover:bg-[#FF7474]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#078FAB] disabled:cursor-not-allowed disabled:opacity-50"
						>
							<Square className="h-3 w-3" aria-hidden />
							{stopping ? "Stopping…" : "Stop agent"}
						</button>
					) : null}
				</div>
			</div>

			{canClose && (view === "finished" || view === "stopped") ? (
				<div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--ide-border)] bg-[var(--ide-surface)] px-4 py-2.5 text-xs">
					<span>Done with this ticket?</span>
					<button
						type="button"
						onClick={onMarkResolved}
						disabled={closing}
						className="inline-flex h-7 cursor-pointer items-center gap-1 rounded border border-[var(--ide-ok)] px-2.5 text-[11px] text-[var(--ide-ok)] transition-colors duration-200 hover:bg-[var(--ide-ok)]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#078FAB] disabled:cursor-not-allowed disabled:opacity-50"
					>
						<CheckCircle2 className="h-3 w-3" aria-hidden />
						{closing ? "Working…" : "Mark resolved"}
					</button>
				</div>
			) : null}

			<div className="grid h-[340px] grid-cols-1 border-t border-[var(--ide-border)] md:grid-cols-[3fr_2fr]">
				<section
					aria-label="Agent activity"
					className="flex min-h-0 flex-col border-b border-[var(--ide-border)] md:border-b-0 md:border-r"
				>
					<div className="flex items-center gap-1.5 border-b border-[var(--ide-border)] px-3 py-2">
						<span
							className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]"
							aria-hidden
						/>
						<span
							className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]"
							aria-hidden
						/>
						<span
							className="h-2.5 w-2.5 rounded-full bg-[#28C840]"
							aria-hidden
						/>
						<span className="ml-2 text-[11px] text-[var(--ide-muted)]">
							agent activity
						</span>
					</div>
					<div
						ref={feedRef}
						role="log"
						aria-label="Agent activity"
						aria-live="polite"
						className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3 text-[11.5px] leading-[1.7]"
					>
						{state.activity.map((line) => (
							<p
								key={line.id}
								className={cn(
									"whitespace-pre-wrap",
									LINE_CLASS[line.kind],
									line.failed && "text-[var(--ide-err)]",
								)}
							>
								{line.kind === "tool" ? (
									<span className="text-[var(--ide-muted)]">$ </span>
								) : null}
								{line.text}
							</p>
						))}
						{lineCount === 0 ? (
							<p className="text-[var(--ide-muted)]">
								{connection === "ended"
									? "No activity to show for this run."
									: "Waiting for the agent…"}
							</p>
						) : null}
						{live ? (
							<span
								className="inline-block h-3.5 w-2 animate-pulse bg-[var(--ide-ok)] align-middle"
								aria-hidden
							/>
						) : null}
					</div>
				</section>

				<section
					aria-label="Result"
					className="min-h-0 overflow-y-auto p-3 text-[11.5px] leading-[1.7]"
				>
					<p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-[var(--ide-muted)]">
						Result
					</p>
					{state.result ? (
						<p className="whitespace-pre-wrap">{state.result}</p>
					) : (
						<p className="text-[var(--ide-muted)]">
							Code changes appear in the pull request when the agent finishes.
						</p>
					)}
					{ticket.prUrl ? (
						<a
							href={ticket.prUrl}
							target="_blank"
							rel="noreferrer"
							className="mt-3 inline-flex items-center gap-1 text-[var(--ide-cmd)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#078FAB]"
						>
							Open pull request #{ticket.prNumber}
							<ExternalLink className="h-3 w-3" aria-hidden />
						</a>
					) : null}
				</section>
			</div>

			<div className="space-y-2 border-t border-[var(--ide-border)] bg-[var(--ide-surface)] px-4 py-3.5">
				<label
					htmlFor="agent-prompt"
					className="block text-[10.5px] font-bold uppercase tracking-wide text-[var(--ide-muted)]"
				>
					Direct the agent
				</label>
				<div className="flex items-end gap-2">
					<textarea
						id="agent-prompt"
						value={prompt}
						onChange={(event) => setPrompt(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
								event.preventDefault();
								void send();
							}
						}}
						disabled={!canControl || stopped}
						placeholder="Tell the agent how to fix this…"
						className="h-[60px] flex-1 resize-y rounded-lg border border-[var(--ide-border)] bg-[var(--ide-bg)] px-3 py-2 text-[12px] text-[var(--ide-text)] placeholder:text-[var(--ide-muted)] focus:border-[#56B8FF] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					/>
					<button
						type="button"
						onClick={() => void send()}
						disabled={!canControl || stopped || !prompt.trim()}
						className="inline-flex border border-[var(--ide-border)] bg-[var(--ide-bg)] h-10 cursor-pointer items-center gap-1.5 rounded-lg px-4 text-[13px] font-medium text-white transition-opacity duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2  focus-visible:outline-[#078FAB] disabled:cursor-not-allowed disabled:opacity-50"
					>
						<MoveUp className="h-4 w-4" aria-hidden />
					</button>
				</div>
				{sendError ? (
					<p role="alert" className="text-[11px] text-[var(--ide-err)]">
						{sendError}
					</p>
				) : null}
				<p className="flex items-center gap-1.5 text-[11px] text-[var(--ide-muted)]">
					<Paperclip className="h-3 w-3" aria-hidden />
					Messages go to the running agent as extra guidance.
				</p>
			</div>
		</div>
	);
}
