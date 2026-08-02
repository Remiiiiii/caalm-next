"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const STEPS = [
	"Searching CAALM product docs…",
	"Reviewing your question…",
	"Drafting a reply…",
] as const;

const STEP_MS = 2200;

export default function AssistantThinkingIndicator() {
	const [step, setStep] = useState(0);
	const [reducedMotion, setReducedMotion] = useState(false);

	useEffect(() => {
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		setReducedMotion(mq.matches);
		const onChange = () => setReducedMotion(mq.matches);
		mq.addEventListener("change", onChange);
		return () => mq.removeEventListener("change", onChange);
	}, []);

	useEffect(() => {
		if (reducedMotion) return;
		const id = window.setInterval(() => {
			setStep((s) => (s + 1) % STEPS.length);
		}, STEP_MS);
		return () => window.clearInterval(id);
	}, [reducedMotion]);

	const label = reducedMotion ? "Working…" : STEPS[step];

	return (
		<div
			className={cn(
				"flex items-start gap-2 rounded-2xl border border-slate-200/80 bg-white/60 px-3 py-2.5 text-sm text-slate-600",
			)}
			aria-live="polite"
			aria-busy="true"
		>
			<Loader2
				className={cn(
					"mt-0.5 h-4 w-4 shrink-0 text-[#0f5384]",
					!reducedMotion && "animate-spin",
				)}
			/>
			<span key={label} className="leading-snug">
				{label}
			</span>
		</div>
	);
}
