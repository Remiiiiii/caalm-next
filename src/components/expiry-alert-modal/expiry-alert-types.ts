/**
 * Shared prop shapes for the expiry alert card and its zones. The carousel owns
 * narration + queue state and passes these down through the bridge into the
 * modal, so the types live here to avoid a circular import between the modal and
 * its zone components.
 */

/** Zone 2 — narration bar state, driven by the carousel's TTS. */
export type ExpiryNarration = {
	/** Narration muted for the session. */
	muted: boolean;
	/** Speech is actively playing right now (controls the waveform). */
	isPlaying: boolean;
	onToggleMute: () => void;
	/** Pause auto-advance for this item without stopping speech. */
	onStayHere: () => void;
	/** Seconds left before auto-advance; null when no countdown is running. */
	countdownSeconds: number | null;
	/** Title of the item the countdown is advancing to. */
	nextLabel: string | null;
	/** Auto-advance has been paused for this item. */
	paused: boolean;
};

/** One row in the Zone 4 queue strip. */
export type ExpiryQueueRow = {
	id: string;
	kind: "contract" | "license";
	title: string;
	days: number;
	/** Pre-formatted short date (e.g. "Dec 13, 2026"). */
	dateLabel: string;
	amount: number | null;
	/** Already handled/dismissed — row is dimmed with a success dot. */
	done: boolean;
};

/** Zone 4 — queue strip state, driven by the carousel. */
export type ExpiryQueue = {
	rows: ExpiryQueueRow[];
	currentIndex: number;
	/** Index the auto-advance countdown points at (the progress ring row). */
	nextIndex: number | null;
	overdue: number;
	within30: number;
	amountSum: number;
	/** Seconds left before auto-advance; null when no countdown is running. */
	countdownSeconds: number | null;
	/** Total seconds the countdown started from (for the progress ring). */
	countdownTotal: number;
	paused: boolean;
	onJump: (index: number) => void;
	onPause: () => void;
	onDismissAll: () => void;
	/** Expanded by default on desktop, collapsed on narrow viewports. */
	defaultExpanded: boolean;
};
