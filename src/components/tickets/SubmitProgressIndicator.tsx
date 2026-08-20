"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SubmitProgressIndicatorProps = {
	progress: number;
	/** Shown while progress is under 100 */
	label?: string;
	/** Shown when progress hits 100 */
	successLabel?: string;
	className?: string;
	compact?: boolean;
};

/** Simulated upload progress: fast to 90%, slow creep to 98% while the API runs. */
export function createSubmitProgressTicker(
	setProgress: Dispatch<SetStateAction<number>>,
): () => void {
	const id = window.setInterval(() => {
		setProgress((prev) => {
			if (prev >= 98) return prev;
			if (prev >= 90) return prev + 1;
			return prev + 10;
		});
	}, 200);

	return () => window.clearInterval(id);
}

function AnimatedSuccessCheck() {
	return (
		<motion.div
			initial={{ scale: 0, opacity: 0 }}
			animate={{ scale: 1, opacity: 1 }}
			transition={{ type: "spring", stiffness: 480, damping: 22 }}
			className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green/15 ring-2 ring-green/25"
			aria-hidden
		>
			<motion.div
				initial={{ scale: 0, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				transition={{ delay: 0.15, duration: 0.2 }}
			>
				<Check className="h-5 w-5 text-green" strokeWidth={2.5} />
			</motion.div>
		</motion.div>
	);
}

/**
 * Submit progress: percent label + animated bar. At 100% shows full green bar + animated check.
 */
export function SubmitProgressIndicator({
	progress,
	label = "Submitting…",
	successLabel = "Submitted successfully",
	className,
	compact = false,
}: SubmitProgressIndicatorProps) {
	const isSuccess = progress >= 100;
	const clampedProgress = Math.min(100, Math.max(0, progress));

	return (
		<Card
			className={cn(
				"border border-light-300 shadow-drop-1 rounded-xl bg-light-400/50",
				className,
			)}
			aria-live="polite"
			aria-busy={!isSuccess}
		>
			<CardContent className={cn(compact ? "pt-4 pb-4" : "pt-6")}>
				<div className="space-y-2">
					{isSuccess ? (
						<div className="flex items-center gap-3 text-sm text-navy">
							<AnimatedSuccessCheck />
							<span className="font-medium">{successLabel}</span>
						</div>
					) : (
						<div className="flex justify-between text-sm">
							<span className="text-navy">{label}</span>
							<span className="font-medium text-brand tabular-nums">
								{clampedProgress}%
							</span>
						</div>
					)}

					<div className="h-2 w-full overflow-hidden rounded-full bg-light-300">
						<div
							className={cn(
								"h-2 rounded-full transition-all duration-500 ease-out",
								isSuccess
									? "w-full bg-green"
									: "bg-linear-to-r from-brand to-brand-100",
							)}
							style={
								isSuccess ? undefined : { width: `${clampedProgress}%` }
							}
						/>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
