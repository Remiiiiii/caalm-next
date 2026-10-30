"use client";

import { Mic, MicOff, Square } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { useTicketRecording } from "@/contexts/TicketRecordingContext";
import {
	formatRecordingDuration,
	MAX_RECORDING_MS,
} from "@/lib/tickets/ticket-recording";
import { cn } from "@/lib/utils";

/** Floating Stop bar shown on every in-app page while a clip is recording. */
export default function TicketRecordingOverlay() {
	const { isRecording, elapsedMs, micOn, stopRecording } = useTicketRecording();
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);

	if (!mounted || !isRecording) return null;

	const pct = Math.min(100, (elapsedMs / MAX_RECORDING_MS) * 100);

	return createPortal(
		<div
			className="pointer-events-auto fixed bottom-[14px] left-1/2 z-[80] flex w-[min(600px,calc(100%-32px))] -translate-x-1/2 items-center gap-3 rounded-full border border-white/30 bg-white/80 py-2 pr-2 pl-4 text-slate-700 shadow-md backdrop-blur"
			role="group"
			aria-label="Screen recording controls"
		>
			<span
				className="h-2.5 w-2.5 shrink-0 rounded-full bg-red motion-safe:animate-pulse"
				aria-hidden
			/>
			<span
				className="shrink-0 text-sm font-semibold tabular-nums text-slate-700"
				role="timer"
				aria-live="off"
			>
				{formatRecordingDuration(elapsedMs)}
				<span className="font-normal text-slate-500"> / 1:00</span>
			</span>
			<div
				className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200 max-[560px]:hidden"
				aria-hidden
			>
				<div
					className="h-full bg-[#078FAB] transition-[width] duration-100 motion-reduce:transition-none"
					style={{ width: `${pct}%` }}
				/>
			</div>
			<span className="hidden flex-1 max-[560px]:block" aria-hidden />
			<span
				className={cn(
					"flex shrink-0 items-center gap-1 text-[11px]",
					micOn ? "text-green" : "text-red",
				)}
			>
				{micOn ? (
					<Mic className="h-3.5 w-3.5" aria-hidden />
				) : (
					<MicOff className="h-3.5 w-3.5" aria-hidden />
				)}
				<span className="max-[560px]:sr-only">
					{micOn ? "Mic on" : "Mic off"}
				</span>
			</span>
			<Button
				type="button"
				className="delete-btn px-3 sm:px-4"
				onClick={stopRecording}
			>
				<Square className="h-4 w-4 fill-current" aria-hidden />
				Stop
			</Button>
		</div>,
		document.body,
	);
}
