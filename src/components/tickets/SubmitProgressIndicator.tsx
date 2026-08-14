"use client";

import { CheckCircle2 } from "lucide-react";
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

/**
 * Same submit progress pattern as contract/license upload:
 * percent label + animated bar. At 100% switches to a success line.
 */
export function SubmitProgressIndicator({
	progress,
	label = "Submitting…",
	successLabel = "Submitted successfully",
	className,
	compact = false,
}: SubmitProgressIndicatorProps) {
	const isSuccess = progress >= 100;

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
				{isSuccess ? (
					<div className="flex items-center gap-2 text-sm text-navy">
						<CheckCircle2
							className="h-5 w-5 shrink-0 text-green"
							strokeWidth={2.25}
							aria-hidden
						/>
						<span className="font-medium">{successLabel}</span>
					</div>
				) : (
					<div className="space-y-2">
						<div className="flex justify-between text-sm">
							<span className="text-navy">{label}</span>
							<span className="font-medium text-brand tabular-nums">
								{progress}%
							</span>
						</div>
						<div className="h-2 w-full rounded-full bg-light-300">
							<div
								className="h-2 rounded-full bg-linear-to-r from-brand to-brand-100 transition-all duration-300"
								style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
							/>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
