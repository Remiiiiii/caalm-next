"use client";

import {
	Mic,
	MicOff,
	PhoneOff,
	SquareArrowOutUpLeft,
	User,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { type DragEvent, type MouseEvent, useState } from "react";
import { formatPracticeElapsed } from "@/components/audit-lab/PracticeChrome";
import { useAuditLabCall } from "@/contexts/AuditLabCallContext";
import { cn } from "@/lib/utils";

/** The practice route owns the full stage already — the widget stays hidden there (unless the user minimized it from the stage itself) and appears everywhere else while the call is live. */
const FULL_STAGE_PATH = "/audit-lab/practice";

/**
 * Minimized call surface shown on every route except the live-interview
 * stage itself, so the call (and the ability to attach evidence) survives
 * navigating away mid-interview — and, if the user hit "Minimize" on the
 * stage's own header, shown there too, so they can get back to other app
 * content without leaving the page. Reads the same `AuditLabCallContext`
 * the full stage does — there is one call, one transcript, regardless of
 * which UI is currently showing it.
 */
export function FloatingCallWidget() {
	const pathname = usePathname();
	const router = useRouter();
	const call = useAuditLabCall();
	const [isDragOver, setIsDragOver] = useState(false);

	const isOnFullStage = pathname === FULL_STAGE_PATH;
	const isCallActive = call.phase === "live" || call.phase === "connecting";
	if ((isOnFullStage && !call.isMinimized) || !isCallActive) return null;

	const activeRubricItem = call.coverage?.items.find(
		(item) => item.questionId === call.coverage?.currentQuestionId,
	);

	function handleDragOver(e: DragEvent<HTMLDivElement>) {
		if (!e.dataTransfer.types.includes("Files")) return;
		e.preventDefault();
		setIsDragOver(true);
	}

	function handleDragLeave(e: DragEvent<HTMLDivElement>) {
		if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
		setIsDragOver(false);
	}

	function handleDrop(e: DragEvent<HTMLDivElement>) {
		e.preventDefault();
		setIsDragOver(false);
		const file = e.dataTransfer.files?.[0];
		if (!file) return;
		void call.attachFile(
			file,
			"floating_widget",
			activeRubricItem?.questionId,
			activeRubricItem?.prompt,
		);
	}

	function returnToInterview() {
		call.restoreCall();
		if (!isOnFullStage) router.push(FULL_STAGE_PATH);
	}

	/** Mic/end-call sit inside the same clickable surface — stop the click from also navigating. */
	function stopPropagationThen(action: () => void) {
		return (e: MouseEvent<HTMLButtonElement>) => {
			e.stopPropagation();
			action();
		};
	}

	return (
		<div
			role="button"
			tabIndex={0}
			title="Return to interview"
			aria-label="Return to interview"
			className={cn(
				"fixed bottom-4 right-4 z-50 w-56 cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-[#0b1420] shadow-2xl transition-shadow",
				isDragOver && "ring-2 ring-inset ring-[#078fab]",
			)}
			onClick={returnToInterview}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					returnToInterview();
				}
			}}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			<div className="group relative aspect-video bg-black/40">
				{/* eslint-disable-next-line jsx-a11y/media-has-caption */}
				<video
					ref={call.registerRemoteVideoEl}
					className={cn(
						"h-full w-full object-cover",
						!call.hasRemoteVideo && "hidden",
					)}
					autoPlay
					playsInline
					muted
				/>
				{!call.hasRemoteVideo ? (
					<div className="flex h-full items-center justify-center text-[#7c8798] opacity-100 transition-opacity group-hover:opacity-0">
						<User className="h-6 w-6" aria-hidden />
					</div>
				) : null}
				<span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-[#e2e8f0]">
					<span
						className={cn(
							"h-1.5 w-1.5 rounded-full",
							call.phase === "live" ? "bg-[#22c55e]" : "bg-[#f9ab72]",
						)}
						aria-hidden
					/>
					{call.phase === "live"
						? formatPracticeElapsed(call.elapsed)
						: "Connecting…"}
				</span>
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/30 group-hover:opacity-100">
					<SquareArrowOutUpLeft className="h-5 w-5 text-white" aria-hidden />
				</div>
			</div>
			<div className="flex items-center justify-between gap-1.5 px-2 py-1.5">
				<p className="min-w-0 flex-1 truncate text-[11px] text-[#aab2c0]">
					{call.sessionMeta?.title ?? "Practice interview"}
				</p>
				<button
					type="button"
					title={call.micOn ? "Mute" : "Unmute"}
					className="shrink-0 rounded-full p-1 text-[#aab2c0] hover:bg-white/10"
					onClick={stopPropagationThen(call.toggleMic)}
				>
					{call.micOn ? (
						<Mic className="h-3.5 w-3.5" aria-hidden />
					) : (
						<MicOff className="h-3.5 w-3.5" aria-hidden />
					)}
				</button>
				<button
					type="button"
					title={call.isFacilitator ? "End interview" : "Leave"}
					className="shrink-0 rounded-full p-1 text-[#ef7a6d] hover:bg-[#ef7a6d]/15"
					onClick={stopPropagationThen(() => void call.endOrLeaveCall())}
				>
					<PhoneOff className="h-3.5 w-3.5" aria-hidden />
				</button>
			</div>
		</div>
	);
}
