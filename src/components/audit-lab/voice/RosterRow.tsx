import Avatar from "@/components/ui/avatar";
import type { ReviewSessionParticipantRow } from "@/lib/audit-lab/types";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<ReviewSessionParticipantRow["role"], string> = {
	facilitator: "Facilitator",
	mock_auditor: "Mock auditor",
	interviewee: "Interviewee",
	observer: "Observer",
};

/** One row inside the Participants popover (light surface). */
export function RosterRow({
	participant,
}: {
	participant: ReviewSessionParticipantRow;
}) {
	const joined = participant.connectionState === "joined";
	return (
		<div className="flex items-center gap-2 py-1.5 text-sm">
			<span
				className={cn(
					"h-2 w-2 shrink-0 rounded-full",
					joined ? "bg-green" : "bg-slate-300",
				)}
				aria-hidden
			/>
			<span className="min-w-0 flex-1 truncate font-medium text-slate-800">
				{participant.name || participant.email || "Participant"}
			</span>
			<span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
				{ROLE_LABEL[participant.role]}
			</span>
		</div>
	);
}

/** Horizontally scrollable strip of participant cards below the stage (dark theme, per spec's `RosterRow`). */
export function RosterStrip({
	participants,
}: {
	participants: ReviewSessionParticipantRow[];
}) {
	const visible = participants.filter((p) => p.role !== "mock_auditor");
	if (visible.length === 0) return null;
	return (
		<div className="flex gap-2 overflow-x-auto review-hover-scroll" role="list">
			{visible.map((p) => (
				<div key={p.$id} role="listitem" className="voice-call-roster-card">
					<Avatar userId={p.userId} name={p.name} size="sm" />
					<span className="max-w-20 truncate text-xs font-medium text-white/80">
						{p.name || p.email || "Participant"}
					</span>
					<span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/60">
						{ROLE_LABEL[p.role]}
					</span>
				</div>
			))}
		</div>
	);
}
