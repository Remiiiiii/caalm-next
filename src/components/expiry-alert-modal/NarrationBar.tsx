"use client";

import { Pause, Volume2, VolumeX } from "lucide-react";
import type { ExpiryNarration } from "@/components/expiry-alert-modal/expiry-alert-types";
import SoundWavesEqualizer from "@/components/expiry-alert-modal/SoundWavesEqualizer";

/** Bump these to resize the narration sound-wave equalizer. */
const SOUND_WAVES_WIDTH = 88;
const SOUND_WAVES_HEIGHT = 64;

type NarrationBarProps = {
	narration: ExpiryNarration;
};

/**
 * Zone 2 — the "reading this aloud" strip. The live robot lives outside the
 * card (SplineCanvas on the overlay); this bar only carries state text,
 * SVG sound-waves (sidebar gradient), Stay here, and mute.
 */
export default function NarrationBar({ narration }: NarrationBarProps) {
	const {
		muted,
		isPlaying,
		onToggleMute,
		onStayHere,
		countdownSeconds,
		nextLabel,
		paused,
	} = narration;

	const stateLine = muted ? "Narration muted" : "Reading this alert aloud";
	const showWaveform = isPlaying && !muted;
	const showCountdown =
		!muted && !paused && countdownSeconds !== null && countdownSeconds >= 0;
	const canStayHere = !muted && !paused && (!!nextLabel || showCountdown);

	return (
		<div
			className="flex items-center gap-3 border-b border-blue/15 bg-blue/10 px-5 py-2.5"
			aria-live="polite"
		>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium text-slate-700">
					{stateLine}
					{showCountdown ? (
						<span className="font-normal text-slate-500">
							{" "}
							· Next item in {countdownSeconds}s
						</span>
					) : null}
				</p>
				{paused && !muted ? (
					<p className="truncate text-xs text-slate-500">Auto-advance paused</p>
				) : showCountdown && nextLabel ? (
					<p className="truncate text-xs text-slate-500">Next: {nextLabel}</p>
				) : null}
			</div>

			{showWaveform && (
				<div className="shrink-0" aria-hidden="true">
					<SoundWavesEqualizer
						width={SOUND_WAVES_WIDTH}
						height={SOUND_WAVES_HEIGHT}
					/>
				</div>
			)}

			{canStayHere && (
				<button
					type="button"
					onClick={onStayHere}
					className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-blue-300 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
				>
					<Pause className="h-3.5 w-3.5" />
					Stay here
				</button>
			)}

			<button
				type="button"
				onClick={onToggleMute}
				aria-pressed={muted}
				aria-label={muted ? "Unmute narration" : "Mute narration"}
				className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-white hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
			>
				{muted ? (
					<VolumeX className="h-5 w-5" />
				) : (
					<Volume2 className="h-5 w-5" />
				)}
			</button>
		</div>
	);
}
