import type { Transition, Variants } from "framer-motion";

/** Shared CAALM easing — soft decelerate, no bounce */
export const easeOut: Transition = {
	duration: 0.85,
	ease: [0.22, 1, 0.36, 1],
};

export const easeOutSlow: Transition = {
	duration: 1.05,
	ease: [0.22, 1, 0.36, 1],
};

export const easeOutQuick: Transition = {
	duration: 0.65,
	ease: [0.22, 1, 0.36, 1],
};

/** Rise from below — default section entrance */
export const fadeUp: Variants = {
	hidden: { opacity: 0, y: 56 },
	visible: { opacity: 1, y: 0, transition: easeOut },
};

/**
 * Opacity only — safe for `.sidebar-gradient-text` / background-clip text.
 * Transform on clipped text paints ghosted/overlapping glyphs on refresh.
 */
export const fadeInText: Variants = {
	hidden: { opacity: 0 },
	visible: { opacity: 1, transition: easeOut },
};

/** Softer rise for metrics / trust moments */
export const softRise: Variants = {
	hidden: { opacity: 0, y: 40 },
	visible: { opacity: 1, y: 0, transition: easeOutSlow },
};

/** Opacity + slight rise — still readable on scroll */
export const fadeIn: Variants = {
	hidden: { opacity: 0, y: 24 },
	visible: { opacity: 1, y: 0, transition: easeOutSlow },
};

/** Drop from above — feature grids */
export const fadeDown: Variants = {
	hidden: { opacity: 0, y: -48 },
	visible: { opacity: 1, y: 0, transition: easeOut },
};

/** Slide in from the left — process / narrative copy */
export const fadeLeft: Variants = {
	hidden: { opacity: 0, x: -64 },
	visible: { opacity: 1, x: 0, transition: easeOut },
};

/** Slide in from the right — supporting cards / integrations */
export const fadeRight: Variants = {
	hidden: { opacity: 0, x: 64 },
	visible: { opacity: 1, x: 0, transition: easeOut },
};

/** Scale — pricing / CTA emphasis */
export const scaleIn: Variants = {
	hidden: { opacity: 0, scale: 0.88 },
	visible: { opacity: 1, scale: 1, transition: easeOut },
};

/** Blur clear — about / testimonials calm reveal */
export const blurIn: Variants = {
	hidden: { opacity: 0, filter: "blur(12px)", y: 28 },
	visible: {
		opacity: 1,
		filter: "blur(0px)",
		y: 0,
		transition: easeOutSlow,
	},
};

export const staggerContainer: Variants = {
	hidden: {},
	visible: {
		transition: { staggerChildren: 0.14, delayChildren: 0.1 },
	},
};

/** Slower cascade — how-it-works steps */
export const staggerSlow: Variants = {
	hidden: {},
	visible: {
		transition: { staggerChildren: 0.2, delayChildren: 0.12 },
	},
};

/** Cascade — FAQ / dense lists */
export const staggerFast: Variants = {
	hidden: {},
	visible: {
		transition: { staggerChildren: 0.1, delayChildren: 0.08 },
	},
};

export const viewportOnce = {
	once: true,
	// Fire when ~20% of the block is visible so the motion is still on-screen.
	amount: 0.2,
	// Negative bottom margin delays the trigger until the section is further in view.
	margin: "0px 0px -8% 0px",
};
