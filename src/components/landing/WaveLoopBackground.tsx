"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { MEDIA_URLS } from "@/lib/media/urls";
import { cn } from "@/lib/utils";

const VIDEO_SRC = MEDIA_URLS.waveVideo;

/** Soft crossfade window at the loop seam (matches landing demo player). */
const LOOP_FADE_MS = 700;
const LOOP_FADE_S = LOOP_FADE_MS / 1000;

function safePlay(video: HTMLVideoElement | null) {
	if (!video) return;
	const result = video.play();
	if (result !== undefined) {
		result.catch(() => {});
	}
}

interface WaveLoopBackgroundProps {
	className?: string;
}

/**
 * Muted wave.mp4 backdrop with a soft fade between loops.
 * Two layered players crossfade near EOF so the restart seam is not a hard cut.
 */
export default function WaveLoopBackground({
	className,
}: WaveLoopBackgroundProps) {
	const reduceMotion = useReducedMotion();
	const primaryRef = useRef<HTMLVideoElement | null>(null);
	const secondaryRef = useRef<HTMLVideoElement | null>(null);
	const [activeIndex, setActiveIndex] = useState<0 | 1>(0);
	const crossfadingRef = useRef(false);

	useEffect(() => {
		if (reduceMotion) return;

		const primary = primaryRef.current;
		const secondary = secondaryRef.current;
		if (!primary || !secondary) return;

		const active = activeIndex === 0 ? primary : secondary;
		const standby = activeIndex === 0 ? secondary : primary;

		for (const video of [primary, secondary]) {
			video.muted = true;
			video.defaultMuted = true;
			video.playsInline = true;
			// Soft loop owns restart — disable native loop
			video.loop = false;
		}

		safePlay(active);

		const onTimeUpdate = () => {
			if (crossfadingRef.current || !active.duration) return;
			if (active.currentTime < active.duration - LOOP_FADE_S) return;

			crossfadingRef.current = true;
			try {
				standby.currentTime = 0;
			} catch {
				/* seek can fail mid-decode on large files */
			}
			safePlay(standby);
			setActiveIndex(activeIndex === 0 ? 1 : 0);

			window.setTimeout(() => {
				active.pause();
				crossfadingRef.current = false;
			}, LOOP_FADE_MS);
		};

		const onVisibility = () => {
			if (document.visibilityState === "visible") safePlay(active);
		};

		active.addEventListener("timeupdate", onTimeUpdate);
		document.addEventListener("visibilitychange", onVisibility);

		return () => {
			active.removeEventListener("timeupdate", onTimeUpdate);
			document.removeEventListener("visibilitychange", onVisibility);
		};
	}, [activeIndex, reduceMotion]);

	if (reduceMotion) return null;

	return (
		<div
			className={cn("pointer-events-none absolute inset-0 -z-10", className)}
			aria-hidden
		>
			<video
				ref={primaryRef}
				src={VIDEO_SRC}
				autoPlay
				muted
				playsInline
				preload="metadata"
				className={cn(
					"absolute inset-0 h-full w-full object-cover transition-opacity ease-in-out",
					activeIndex === 0 ? "opacity-100" : "opacity-0",
				)}
				style={{ transitionDuration: `${LOOP_FADE_MS}ms` }}
			/>
			<video
				ref={secondaryRef}
				src={VIDEO_SRC}
				muted
				playsInline
				preload="metadata"
				className={cn(
					"absolute inset-0 h-full w-full object-cover transition-opacity ease-in-out",
					activeIndex === 1 ? "opacity-100" : "opacity-0",
				)}
				style={{ transitionDuration: `${LOOP_FADE_MS}ms` }}
			/>
		</div>
	);
}
