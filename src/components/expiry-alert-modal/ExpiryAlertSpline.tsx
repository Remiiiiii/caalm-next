"use client";

import { animate, motion, useMotionValue } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import SplineCanvas from "@/components/SplineCanvas";
import type { UrgencyTier } from "@/lib/expiry/urgency";
import { DESKTOP_MIN_WIDTH } from "@/lib/ui/desktop-first";
import "./expiry-alert-robot.css";

/** One-shot wrapper reactions (CSS). Enter is Framer Motion, not a reaction. */
export type ExpiryRobotReaction =
	| "point"
	| "celebrate"
	| "sleepy"
	| "recoil"
	| null;

export type ExpiryRobotNarration = "idle" | "speaking" | "muted";

type ExpiryAlertSplineProps = {
	narration?: ExpiryRobotNarration;
	urgencyTier?: UrgencyTier;
	/** Auto-advance seconds left; lean when ≤ 2 and not paused. */
	countdownSeconds?: number | null;
	paused?: boolean;
	/** Immediate queue open state — robot holds 1s then trails to the new spot. */
	queueExpanded?: boolean;
	reaction?: ExpiryRobotReaction;
};

function urgencyVar(tier: UrgencyTier | undefined): "0" | "1" | "2" {
	if (tier === "critical" || tier === "overdue") return "2";
	if (tier === "soon") return "1";
	return "0";
}

const EASE_SOFT: [number, number, number, number] = [0.22, 1, 0.36, 1];
/** Stay put after expand/collapse, then catch up. */
const TRAIL_HOLD_MS = 1000;
const TRAIL_CATCH_S = 0.95;

type HoldRect = {
	top: number;
	left: number;
	width: number;
	height: number;
};

/**
 * Expiry-modal robot — laptop/desktop only.
 * Enter: Framer Motion slide-in. Queue trail: pin in place 1s, then catch up.
 * Gestures: local CSS on the stage.
 */
export default function ExpiryAlertSpline({
	narration = "idle",
	urgencyTier = "scheduled",
	countdownSeconds = null,
	paused = false,
	queueExpanded = false,
	reaction = null,
}: ExpiryAlertSplineProps) {
	const [show, setShow] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const prevExpandedRef = useRef(queueExpanded);
	const holdTimerRef = useRef<number | null>(null);
	const catchAnimsRef = useRef<{ stop: () => void }[]>([]);
	/** Screen rect to catch up from after the pin is released. */
	const pendingCatchFromRef = useRef<HoldRect | null>(null);
	/** Screen-pin while the card grows/shrinks underneath. */
	const [holdRect, setHoldRect] = useState<HoldRect | null>(null);
	/** Step-aside pose only after the trail catch-up begins. */
	const [poseExpanded, setPoseExpanded] = useState(false);

	const catchX = useMotionValue(0);
	const catchY = useMotionValue(0);

	useEffect(() => {
		const mq = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`);
		const sync = () => setShow(mq.matches);
		sync();
		mq.addEventListener("change", sync);
		return () => mq.removeEventListener("change", sync);
	}, []);

	// Trail: pin → wait 1s → re-anchor with catch-up slide (expand and collapse).
	useEffect(() => {
		if (!show) return;
		if (prevExpandedRef.current === queueExpanded) return;

		const el = rootRef.current;
		const fromRect = el?.getBoundingClientRect();
		prevExpandedRef.current = queueExpanded;

		if (holdTimerRef.current !== null) {
			window.clearTimeout(holdTimerRef.current);
			holdTimerRef.current = null;
		}
		for (const a of catchAnimsRef.current) a.stop();
		catchAnimsRef.current = [];
		catchX.set(0);
		catchY.set(0);

		if (!el || !fromRect) {
			setPoseExpanded(queueExpanded);
			setHoldRect(null);
			return;
		}

		setHoldRect({
			top: fromRect.top,
			left: fromRect.left,
			width: fromRect.width,
			height: fromRect.height,
		});

		holdTimerRef.current = window.setTimeout(() => {
			holdTimerRef.current = null;
			// Drop the pin after layout; useLayoutEffect starts the catch-up slide.
			pendingCatchFromRef.current = {
				top: fromRect.top,
				left: fromRect.left,
				width: fromRect.width,
				height: fromRect.height,
			};
			setHoldRect(null);
			setPoseExpanded(queueExpanded);
		}, TRAIL_HOLD_MS);

		return () => {
			if (holdTimerRef.current !== null) {
				window.clearTimeout(holdTimerRef.current);
				holdTimerRef.current = null;
			}
		};
	}, [queueExpanded, show, catchX, catchY]);

	// After pin release, measure the new bottom-0 spot and ease from the held place.
	useLayoutEffect(() => {
		const from = pendingCatchFromRef.current;
		if (!from || holdRect !== null) return;
		pendingCatchFromRef.current = null;

		const dest = rootRef.current?.getBoundingClientRect();
		if (!dest) return;

		catchX.set(from.left - dest.left);
		catchY.set(from.top - dest.top);
		const ax = animate(catchX, 0, {
			duration: TRAIL_CATCH_S,
			ease: EASE_SOFT,
		});
		const ay = animate(catchY, 0, {
			duration: TRAIL_CATCH_S,
			ease: EASE_SOFT,
		});
		catchAnimsRef.current = [ax, ay];
	}, [holdRect, poseExpanded, catchX, catchY]);

	useEffect(() => {
		return () => {
			if (holdTimerRef.current !== null) {
				window.clearTimeout(holdTimerRef.current);
			}
			for (const a of catchAnimsRef.current) a.stop();
		};
	}, []);

	if (!show) return null;

	const lean =
		!reaction &&
		!holdRect &&
		countdownSeconds !== null &&
		countdownSeconds <= 2 &&
		countdownSeconds > 0 &&
		!paused;

	const isHolding = holdRect !== null;

	return (
		<motion.div
			ref={rootRef}
			aria-hidden="true"
			className={
				isHolding
					? "pointer-events-none z-40 overflow-hidden"
					: "pointer-events-none absolute bottom-0 left-full z-40 -ml-4 size-40 overflow-hidden xl:size-48"
			}
			style={
				isHolding
					? {
							position: "fixed",
							top: holdRect.top,
							left: holdRect.left,
							width: holdRect.width,
							height: holdRect.height,
						}
					: { x: catchX, y: catchY }
			}
		>
			{/* Enter slide — mount only; trail uses catchX/catchY on the outer shell. */}
			<motion.div
				className="h-full w-full"
				initial={{ x: 110, opacity: 0 }}
				animate={{ x: 0, opacity: 1 }}
				transition={{
					duration: 1.25,
					delay: 0.38,
					ease: EASE_SOFT,
				}}
			>
				<motion.div
					className="expiry-alert-robot relative h-full w-full"
					animate={{
						x: poseExpanded ? 14 : 0,
						y: poseExpanded ? 22 : 0,
						scale: poseExpanded ? 0.92 : 1,
					}}
					transition={{
						duration: TRAIL_CATCH_S,
						ease: EASE_SOFT,
					}}
					data-narration={reaction ? undefined : narration}
					data-urgency={urgencyVar(urgencyTier)}
					data-lean={lean ? "true" : undefined}
					data-reaction={reaction ?? undefined}
				>
					<div className="expiry-alert-robot__stage relative aspect-square h-full w-full overflow-hidden">
						<SplineCanvas
							scene="/scene.splinecode"
							className="pointer-events-none absolute inset-0 h-full w-full"
							delayMs={0}
							durationMs={400}
							zoom={1.15}
						/>
					</div>
				</motion.div>
			</motion.div>
		</motion.div>
	);
}
