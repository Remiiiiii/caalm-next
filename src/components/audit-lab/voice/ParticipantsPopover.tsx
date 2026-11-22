import { Users } from "lucide-react";
import { RosterRow } from "@/components/audit-lab/voice/RosterRow";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { ReviewSessionParticipantRow } from "@/lib/audit-lab/types";

export function ParticipantsPopover({
	participants,
}: {
	participants: ReviewSessionParticipantRow[];
}) {
	const joinedCount = participants.filter(
		(p) => p.connectionState === "joined",
	).length;
	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="voice-call-control-chip-btn"
					aria-label="Participants"
				>
					<Users className="h-4 w-4" aria-hidden />
					{joinedCount}
				</button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className="voice-call-popover w-80 border-none p-4 backdrop-blur-none"
			>
				<p className="voice-call-panel-title mb-2">Participants</p>
				{participants.length === 0 ? (
					<p className="voice-call-footnote">No one else has joined yet.</p>
				) : (
					<div className="max-h-64 divide-y divide-white/10 overflow-y-auto">
						{participants.map((p) => (
							<RosterRow key={p.$id} participant={p} />
						))}
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}
