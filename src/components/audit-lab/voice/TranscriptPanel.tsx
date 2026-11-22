import { useEffect, useRef } from "react";

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
				<p className="text-sm text-white/50">Listening…</p>
			) : null}
			{turns.map((turn, idx) => (
				<div key={turn.$id ?? idx} className="space-y-1">
					{turn.question ? (
						<div>
							<p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#7fe3ff]/80">
								{auditorLabel}
							</p>
							<p className="voice-call-bubble-auditor">{turn.question}</p>
						</div>
					) : null}
					{turn.answer ? (
						<div className="flex flex-col items-end text-right">
							<p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">
								You
							</p>
							<p className="voice-call-bubble-interviewee">{turn.answer}</p>
						</div>
					) : null}
				</div>
			))}
			{liveCaption ? (
				<div>
					<p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#7fe3ff]/80">
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
