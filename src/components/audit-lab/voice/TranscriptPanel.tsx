import { useEffect, useRef, useState } from "react";
import type { AttachmentSource, AttachmentStatus } from "@/lib/audit-lab/types";

export type TranscriptTurn = {
	$id?: string;
	kind?: "turn" | "attachment";
	questionId?: string;
	question?: string;
	answer?: string;
	at?: string;
	// Attachment-only fields (present when kind === "attachment"):
	fileName?: string;
	uploaderName?: string;
	source?: AttachmentSource;
	replyToText?: string;
	attachmentStatus?: AttachmentStatus;
	progressPct?: number;
	failureReason?: string;
};

const ATTACHMENT_STATUS_LABEL: Record<AttachmentStatus, string> = {
	uploading: "Uploading",
	scanning: "Scanning",
	attached: "Attached",
	failed: "Failed",
};

function AttachmentEntry({
	turn,
	onRetry,
}: {
	turn: TranscriptTurn;
	onRetry?: (turn: TranscriptTurn, file: File) => void;
}) {
	const status = turn.attachmentStatus ?? "uploading";
	const retryInputRef = useRef<HTMLInputElement | null>(null);
	return (
		<div className="rounded-md border border-white/10 bg-white/5 px-2.5 py-2 text-[12.5px]">
			{turn.replyToText ? (
				<p className="mb-1 italic text-[#7c8798]">
					&ldquo;{turn.replyToText}&rdquo;
				</p>
			) : null}
			<div className="flex items-center justify-between gap-2">
				<div className="min-w-0">
					<p className="truncate font-medium text-[#e2e8f0]">{turn.fileName}</p>
					<p className="text-[11px] text-[#7c8798]">
						{turn.uploaderName ? `${turn.uploaderName} · ` : ""}
						{status === "uploading" && typeof turn.progressPct === "number"
							? `Uploading ${turn.progressPct}%`
							: ATTACHMENT_STATUS_LABEL[status]}
					</p>
					{status === "failed" && turn.failureReason ? (
						<p className="text-[11px] text-[#ef7a6d]">{turn.failureReason}</p>
					) : null}
				</div>
				{status === "failed" && onRetry ? (
					<>
						<input
							ref={retryInputRef}
							type="file"
							className="hidden"
							onChange={(e) => {
								const file = e.target.files?.[0];
								e.target.value = "";
								if (file) onRetry(turn, file);
							}}
						/>
						<button
							type="button"
							className="shrink-0 rounded-full border border-[#078fab]/30 bg-[#078fab]/10 px-2 py-1 text-[11px] font-medium text-[#6fe0f5] hover:bg-[#078fab]/20"
							onClick={() => retryInputRef.current?.click()}
						>
							Retry
						</button>
					</>
				) : null}
			</div>
		</div>
	);
}

/**
 * Live chat-style transcript (spec's `TranscriptPanel`) — append-only, single
 * timeline interleaving spoken turns and evidence attachments in the order
 * they occurred. Auto-scrolls to new entries only while the viewer is at the
 * bottom; otherwise shows a "New activity" affordance instead of forcing scroll.
 */
export function TranscriptPanel({
	turns,
	liveCaption,
	auditorLabel,
	onRetryAttachment,
}: {
	turns: TranscriptTurn[];
	liveCaption?: string;
	auditorLabel: string;
	onRetryAttachment?: (turn: TranscriptTurn, file: File) => void;
}) {
	const scrollRef = useRef<HTMLDivElement | null>(null);
	const isAtBottomRef = useRef(true);
	const prevCountRef = useRef(turns.length);
	const [hasNewActivity, setHasNewActivity] = useState(false);

	function scrollToBottom() {
		const el = scrollRef.current;
		if (el) el.scrollTop = el.scrollHeight;
		setHasNewActivity(false);
	}

	// Gate on entry count, not liveCaption ticking per character — surfaces once per new entry, not once per progress/caption tick.
	useEffect(() => {
		const countGrew = turns.length > prevCountRef.current;
		prevCountRef.current = turns.length;
		if (!countGrew) return;
		if (isAtBottomRef.current) {
			scrollToBottom();
		} else {
			setHasNewActivity(true);
		}
	}, [turns.length]);

	useEffect(() => {
		if (!isAtBottomRef.current) return;
		const el = scrollRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [liveCaption]);

	function handleScroll() {
		const el = scrollRef.current;
		if (!el) return;
		const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
		const atBottom = distanceFromBottom < 48;
		isAtBottomRef.current = atBottom;
		if (atBottom) setHasNewActivity(false);
	}

	return (
		<div className="relative flex min-h-0 flex-1 flex-col">
			<div
				ref={scrollRef}
				onScroll={handleScroll}
				className="min-h-0 flex-1 space-y-2 overflow-y-auto review-hover-scroll pr-1"
			>
				{turns.length === 0 && !liveCaption ? (
					<p className="voice-call-footnote">Listening…</p>
				) : null}
				{turns.map((turn, idx) =>
					turn.kind === "attachment" ? (
						<AttachmentEntry
							key={turn.$id ?? idx}
							turn={turn}
							onRetry={onRetryAttachment}
						/>
					) : (
						<div key={turn.$id ?? idx} className="space-y-1">
							{turn.question ? (
								<div>
									<p className="voice-call-speaker-name voice-call-speaker-name-ai mb-0.5">
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
					),
				)}
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
			{hasNewActivity ? (
				<button
					type="button"
					onClick={scrollToBottom}
					className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-[#078fab]/30 bg-[#0b1420] px-3 py-1 text-[11px] font-medium text-[#6fe0f5] shadow-lg hover:bg-[#078fab]/20"
				>
					New activity
				</button>
			) : null}
		</div>
	);
}
