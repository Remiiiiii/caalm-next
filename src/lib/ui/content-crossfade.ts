/**
 * Shared opacity-only swap for keyed panels (expiry alert, quizzes, tabs).
 * No X/Y nudge — that reads as a jump on next/prev.
 */

export const CONTENT_CROSSFADE_EASE: [number, number, number, number] = [
	0.22, 1, 0.36, 1,
];

/** Incoming fade — slower than exit so the new panel eases in instead of popping. */
export const CONTENT_CROSSFADE_DURATION = 0.8;
export const CONTENT_CROSSFADE_ENTER_DELAY = 0.12;
export const CONTENT_CROSSFADE_EXIT_DURATION = 0.6;

export const contentCrossfadeTransition = {
	duration: CONTENT_CROSSFADE_DURATION,
	delay: CONTENT_CROSSFADE_ENTER_DELAY,
	ease: CONTENT_CROSSFADE_EASE,
} as const;

/** Overlap old + new while fading. Use with AnimatePresence mode="sync". */
export const CONTENT_CROSSFADE_PRESENCE_MODE = "sync" as const;

export const contentCrossfadeInitial = { opacity: 0 };

export const contentCrossfadeAnimate = { opacity: 1 };

/**
 * Pin the exiting panel so the incoming one can fade in on top.
 * Only opacity tweens — `inset` from auto→0 is not animatable and looks jumpy.
 */
export const contentCrossfadeExit = {
	opacity: 0,
	position: "absolute" as const,
	pointerEvents: "none" as const,
	transition: {
		duration: CONTENT_CROSSFADE_EXIT_DURATION,
		ease: CONTENT_CROSSFADE_EASE,
		position: { duration: 0 },
		pointerEvents: { duration: 0 },
	},
};

/** Inline chips / compact swaps — fade only, no absolute overlay. */
export const contentCrossfadeExitInline = {
	opacity: 0,
	transition: {
		duration: CONTENT_CROSSFADE_EXIT_DURATION,
		ease: CONTENT_CROSSFADE_EASE,
	},
};
