import Avatar from "@/components/ui/avatar";
import type { ReviewSessionParticipantRow } from "@/lib/audit-lab/types";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<ReviewSessionParticipantRow["role"], string> = {
	facilitator: "Facilitator",
	mock_auditor: "Mock auditor",
	interviewee: "Interviewee",
	observer: "Observer",
};

/** Role pill color: teal/bright-cyan pair stays reserved for the AI auditor and interviewee emphasis; facilitator gets the paused-amber token; observer stays neutral. */
function rolePillClass(role: ReviewSessionParticipantRow["role"]) {
	return cn(
		"voice-call-role-pill",
		role === "facilitator" && "voice-call-role-pill-facilitator",
		role === "interviewee" && "voice-call-role-pill-interviewee",
		role === "mock_auditor" && "voice-call-role-pill-mock_auditor",
	);
}

/** One row inside the Participants popover (dark surface, matches the live window). */
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
					joined ? "bg-[#22c55e]" : "bg-white/20",
				)}
				aria-hidden
			/>
			<span className="min-w-0 flex-1 truncate font-medium text-[#e2e8f0]">
				{participant.name || participant.email || "Participant"}
			</span>
			<span className={rolePillClass(participant.role)}>
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
					<span className="voice-call-roster-name max-w-20 truncate">
						{p.name || p.email || "Participant"}
					</span>
					<span className={rolePillClass(p.role)}>{ROLE_LABEL[p.role]}</span>
				</div>
			))}
		</div>
	);
}
