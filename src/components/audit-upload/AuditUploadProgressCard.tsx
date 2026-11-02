"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
	buildAuditProgress,
	type AuditProgressStepState,
} from "@/lib/audit-upload/progress-steps";
import type { ProcessingLogEntry } from "@/lib/audit-upload/types";
import { cn } from "@/lib/utils";

type AuditUploadProgressCardProps = {
	log: ProcessingLogEntry[];
	fileName?: string | null;
	failed?: boolean;
	uploadComplete?: boolean;
};

function useAnimatedEllipsis(enabled: boolean): string {
	const [frame, setFrame] = useState(0);
	const [reduceMotion, setReduceMotion] = useState(false);

	useEffect(() => {
		const media = window.matchMedia("(prefers-reduced-motion: reduce)");
		const sync = () => setReduceMotion(media.matches);
		sync();
		media.addEventListener("change", sync);
		return () => media.removeEventListener("change", sync);
	}, []);

	useEffect(() => {
		if (!enabled || reduceMotion) return;
		const timer = window.setInterval(() => {
			setFrame((value) => (value + 1) % 4);
		}, 350);
		return () => window.clearInterval(timer);
	}, [enabled, reduceMotion]);

	if (!enabled) return "";
	if (reduceMotion) return "…";
	return ".".repeat(frame);
}

function StepIcon({ state }: { state: AuditProgressStepState }) {
	switch (state) {
		case "done":
			return (
				<CheckCircle2
					className="h-5 w-5 text-[#078fab]"
					strokeWidth={2}
					aria-hidden
				/>
			);
		case "failed":
			return (
				<XCircle className="h-5 w-5 text-red" strokeWidth={2} aria-hidden />
			);
		case "active":
			return (
				<span
					className="flex h-5 w-5 items-center justify-center"
					aria-hidden
				>
					<span className="h-2.5 w-2.5 rounded-full bg-[#078fab] animate-pulse motion-reduce:animate-none" />
				</span>
			);
		case "pending":
			return (
				<span className="flex h-5 w-5 items-center justify-center" aria-hidden>
					<span className="h-2 w-2 rounded-full bg-slate-300" />
				</span>
			);
		default: {
			const _never: never = state;
			return _never;
		}
	}
}

function StatusText({
	state,
	ellipsis,
}: {
	state: AuditProgressStepState;
	ellipsis: string;
}) {
	switch (state) {
		case "done":
			return "complete";
		case "failed":
			return "failed";
		case "pending":
			return "—";
		case "active":
			return (
				<>
					working
					<span aria-hidden="true">{ellipsis}</span>
					<span className="sr-only"> in progress</span>
				</>
			);
		default: {
			const _never: never = state;
			return _never;
		}
	}
}

export function AuditUploadProgressCard({
	log,
	fileName,
	failed = false,
	uploadComplete = false,
}: AuditUploadProgressCardProps) {
	const { steps, percent } = buildAuditProgress(log, {
		uploadComplete,
		failed,
	});
	const hasActive = steps.some((step) => step.state === "active");
	const ellipsis = useAnimatedEllipsis(hasActive && !failed);

	return (
		<Card
			className="glass-card overflow-hidden"
			role="region"
			aria-label="Upload audit progress"
		>
			<div className="glass-card-cap" />
			<CardContent className="p-0">
				<div className="px-5 py-4 sm:px-6">
					<h3 className="h5 sidebar-gradient-text">Analyzing document</h3>
					<p className="caption mt-1 text-slate-500">
						{failed
							? "Something went wrong while reading this file."
							: fileName
								? `CAALM is reviewing ${fileName} for compliance findings`
								: "CAALM is reviewing your upload for compliance findings"}
					</p>
				</div>

				<ul role="list" className="border-t border-slate-200/80">
					{steps.map((step) => {
						const isActive = step.state === "active";
						return (
							<li
								key={step.key}
								role="listitem"
								aria-current={isActive ? "true" : undefined}
								className={cn(
									"flex items-center gap-3 border-b border-slate-100 px-5 py-2.5 last:border-b-0 sm:px-6",
									isActive && "bg-[#078fab]/[.05]",
									step.state === "pending" && "opacity-60",
								)}
							>
								<StepIcon state={step.state} />
								<span
									className={cn(
										"min-w-0 flex-1 text-sm",
										isActive
											? "font-semibold text-[#0f5384]"
											: step.state === "done"
												? "font-medium text-slate-600"
												: "text-slate-500",
									)}
								>
									{step.label}
								</span>
								<span
									className={cn(
										"shrink-0 text-xs",
										step.state === "active" && "font-medium text-[#078fab]",
										step.state === "done" && "text-slate-400",
										step.state === "failed" && "font-medium text-red",
										step.state === "pending" && "text-slate-300",
									)}
								>
									<StatusText state={step.state} ellipsis={ellipsis} />
								</span>
							</li>
						);
					})}
				</ul>

				<div className="flex items-center gap-3 border-t border-slate-200/80 px-5 py-3 sm:px-6">
					<div
						role="progressbar"
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={percent}
						aria-label={`${percent}% complete`}
						className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200"
					>
						<div
							className="h-full rounded-full bg-[linear-gradient(90deg,#00c1cb,#078fab,#0e638f)]"
							style={{ width: `${percent}%` }}
						/>
					</div>
					<span className="shrink-0 tabular-nums text-xs text-slate-400">
						{percent}%
					</span>
				</div>
			</CardContent>
		</Card>
	);
}
