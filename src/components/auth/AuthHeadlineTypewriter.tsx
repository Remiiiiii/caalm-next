"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Rotating lines under the main auth H1 — one per tour screenshot.
 * Typewriter cycle matches landing AskCaalmAnythingPill.
 */
export const AUTH_TYPEWRITER_HEADLINES = [
	"Unify executive visibility with one dashboard for deadlines, approvals, and ownership",
	"Reduce contract risk with centralized ownership of agreements, renewals, and reviews",
	"Prevent license gaps with centralized ownership of expirations and renewals",
	"Strengthen audit readiness with centralized ownership of compliance evidence",
	"Guide decisions with centralized analytics across contracts, audits, and licenses",
] as const;

export default function AuthHeadlineTypewriter() {
	const reduceMotion = useReducedMotion();
	const [lineIndex, setLineIndex] = useState(0);
	const [displayText, setDisplayText] = useState(
		reduceMotion ? AUTH_TYPEWRITER_HEADLINES[0] : "",
	);
	const [phase, setPhase] = useState<"typing" | "hold" | "deleting">("typing");

	useEffect(() => {
		if (reduceMotion) {
			setDisplayText(AUTH_TYPEWRITER_HEADLINES[0]);
			return;
		}

		const full = AUTH_TYPEWRITER_HEADLINES[lineIndex];

		if (phase === "typing") {
			if (displayText.length < full.length) {
				const t = window.setTimeout(() => {
					setDisplayText(full.slice(0, displayText.length + 1));
				}, 28);
				return () => window.clearTimeout(t);
			}
			/* Full line typed — enter rest so the caret can blink */
			setPhase("hold");
			return;
		}

		if (phase === "hold") {
			const t = window.setTimeout(() => setPhase("deleting"), 2200);
			return () => window.clearTimeout(t);
		}

		if (displayText.length > 0) {
			const t = window.setTimeout(() => {
				setDisplayText((prev) => prev.slice(0, -1));
			}, 16);
			return () => window.clearTimeout(t);
		}

		const t = window.setTimeout(() => {
			setLineIndex((i) => (i + 1) % AUTH_TYPEWRITER_HEADLINES.length);
			setPhase("typing");
		}, 280);
		return () => window.clearTimeout(t);
	}, [displayText, phase, lineIndex, reduceMotion]);

	return (
		<p
			className="text-base md:text-lg text-slate-600 min-h-[3.25rem] md:min-h-[3.75rem]"
			aria-live="polite"
			aria-atomic="true"
		>
			{displayText}
			{!reduceMotion && (
				<span
					aria-hidden
					className={`ml-0.5 inline-block h-[1em] w-[2px] translate-y-[0.1em] bg-[#0f5384] align-middle ${
						phase === "hold"
							? "animate-terminal-caret"
							: "opacity-100"
					}`}
				/>
			)}
		</p>
	);
}
