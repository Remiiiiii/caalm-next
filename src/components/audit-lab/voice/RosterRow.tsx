"use client";

import { User } from "lucide-react";
import { type PointerEvent, useRef, useState } from "react";
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
	const scrollRef = useRef<HTMLDivElement | null>(null);
	const dragRef = useRef<{ startX: number; startScrollLeft: number } | null>(
		null,
	);
	const [isDragging, setIsDragging] = useState(false);

	function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
		const el = scrollRef.current;
		if (!el) return;
		dragRef.current = { startX: e.clientX, startScrollLeft: el.scrollLeft };
		setIsDragging(true);
		el.setPointerCapture(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
		const el = scrollRef.current;
		if (!dragRef.current || !el) return;
		el.scrollLeft =
			dragRef.current.startScrollLeft - (e.clientX - dragRef.current.startX);
	}

	function endDrag(e: PointerEvent<HTMLDivElement>) {
		dragRef.current = null;
		setIsDragging(false);
		scrollRef.current?.releasePointerCapture(e.pointerId);
	}

	if (visible.length === 0) return null;
	return (
		<div
			ref={scrollRef}
			className={cn(
				"flex gap-2 overflow-x-auto",
				isDragging ? "cursor-grabbing select-none" : "cursor-grab",
			)}
			role="list"
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={endDrag}
			onPointerLeave={endDrag}
		>
			{visible.map((p) => (
				<div
					key={p.$id}
					role="listitem"
					className="flex shrink-0 flex-col items-center gap-1.5"
				>
					<div className="voice-call-roster-card">
						<span className="voice-call-roster-icon" aria-hidden>
							<User className="h-4 w-4" />
						</span>
						<span className="voice-call-roster-name max-w-20 truncate">
							{p.name || p.email || "Participant"}
						</span>
					</div>
					<span className={rolePillClass(p.role)}>{ROLE_LABEL[p.role]}</span>
				</div>
			))}
		</div>
	);
}
