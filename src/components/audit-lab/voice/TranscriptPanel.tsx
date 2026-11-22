import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type TranscriptTurn = {
	$id?: string;
	questionId?: string;
	question?: string;
	answer?: string;
	at?: string;
};

/** Live chat-style transcript (spec's `TranscriptPanel`) — auto-scrolls to newest message. */
export function TranscriptPanel({
	turns,
	liveCaption,
	auditorLabel,
}: {
	turns: TranscriptTurn[];
	liveCaption?: string;
	auditorLabel: string;
}) {
	const scrollRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const el = scrollRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [turns.length, liveCaption]);

	return (
		<div
			ref={scrollRef}
			className="max-h-56 space-y-2 overflow-y-auto review-hover-scroll pr-1"
		>
			{turns.length === 0 && !liveCaption ? (
				<p className="voice-call-footnote">Listening…</p>
			) : null}
			{turns.map((turn, idx) => (
				<div key={turn.$id ?? idx} className="space-y-1">
					{turn.question ? (
						<div>
							<p
								className={cn(
									"voice-call-speaker-name voice-call-speaker-name-ai mb-0.5",
								)}
							>
								{auditorLabel}
							</p>
							<p className="voice-call-bubble-auditor">{turn.question}</p>
						</div>
					) : null}
					{turn.answer ? (
						<div className="flex flex-col items-end text-right">
							<p className="voice-call-speaker-name mb-0.5">You</p>
							<p className="voice-call-bubble-interviewee">{turn.answer}</p>
						</div>
					) : null}
				</div>
			))}
			{liveCaption ? (
				<div>
					<p className="voice-call-speaker-name voice-call-speaker-name-ai mb-0.5">
						{auditorLabel}
					</p>
					<p className="voice-call-bubble-auditor italic opacity-80">
						{liveCaption}
					</p>
				</div>
			) : null}
		</div>
	);
}
