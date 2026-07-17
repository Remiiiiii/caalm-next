"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const VIDEO_SRC = "/assets/video/wave.mp4";

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

/** Muted looping wave.mp4 with Chromium-friendly restart (same as hero). */
export default function WaveLoopBackground({ className }: WaveLoopBackgroundProps) {
	const reduceMotion = useReducedMotion();
	const videoRef = useRef<HTMLVideoElement | null>(null);

	useEffect(() => {
		if (reduceMotion) return;
		const video = videoRef.current;
		if (!video) return;

		video.muted = true;
		video.defaultMuted = true;
		video.playsInline = true;
		video.loop = true;

		safePlay(video);

		const restartLoop = () => {
			try {
				video.currentTime = 0;
			} catch {
				/* seek can fail mid-decode on large files */
			}
			safePlay(video);
		};

		const onEnded = () => restartLoop();

		const onVisibility = () => {
			if (document.visibilityState === "visible") safePlay(video);
		};

		const onPause = () => {
			if (
				document.visibilityState !== "visible" ||
				video.seeking ||
				reduceMotion
			) {
				return;
			}
			if (video.duration && video.currentTime >= video.duration - 0.35) {
				restartLoop();
			} else if (video.paused) {
				safePlay(video);
			}
		};

		video.addEventListener("ended", onEnded);
		video.addEventListener("pause", onPause);
		document.addEventListener("visibilitychange", onVisibility);

		return () => {
			video.removeEventListener("ended", onEnded);
			video.removeEventListener("pause", onPause);
			document.removeEventListener("visibilitychange", onVisibility);
		};
	}, [reduceMotion]);

	if (reduceMotion) return null;

	return (
		<video
			ref={videoRef}
			src={VIDEO_SRC}
			autoPlay
			muted
			loop
			playsInline
			preload="auto"
			onEnded={(e) => {
				const video = e.currentTarget;
				video.currentTime = 0;
				safePlay(video);
			}}
			className={cn(
				"pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover",
				className,
			)}
			aria-hidden
		/>
	);
}
