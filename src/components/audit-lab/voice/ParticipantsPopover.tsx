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
					className="flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white/80 px-3 text-sm font-medium text-slate-700 hover:bg-white"
					aria-label="Participants"
				>
					<Users className="h-4 w-4" aria-hidden />
					{joinedCount}
				</button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-80">
				<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
					Participants
				</p>
				{participants.length === 0 ? (
					<p className="text-sm text-slate-500">No one else has joined yet.</p>
				) : (
					<div className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
						{participants.map((p) => (
							<RosterRow key={p.$id} participant={p} />
						))}
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}
