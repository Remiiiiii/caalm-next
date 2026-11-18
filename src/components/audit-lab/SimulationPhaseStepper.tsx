"use client";

import { Check } from "lucide-react";
import type { ScriptSection } from "@/lib/audit-lab/script-sections";
import {
	phaseIndex,
	SIMULATION_PHASE_LABELS,
	SIMULATION_PHASES,
} from "@/lib/audit-lab/simulation-phase";
import { cn } from "@/lib/utils";

/**
 * Vertical phase stepper for Simulation Detail (and Interview Builder sync).
 * Done = filled check, active = filled index, pending = outline index.
 */
export function SimulationPhaseStepper({
	currentPhase,
	className,
}: {
	currentPhase: ScriptSection;
	className?: string;
}) {
	const activeIndex = phaseIndex(currentPhase);

	return (
		<ol className={cn("space-y-0", className)} aria-label="Simulation phases">
			{SIMULATION_PHASES.map((phase, index) => {
				const done = index < activeIndex;
				const active = index === activeIndex;
				const isLast = index === SIMULATION_PHASES.length - 1;
				return (
					<li key={phase} className="relative flex gap-3">
						<div className="flex w-7 shrink-0 flex-col items-center">
							<span
								className={cn(
									"relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
									done || active
										? "bg-[#0f5384] text-white"
										: "border-2 border-slate-300 bg-white text-slate-500",
								)}
								aria-current={active ? "step" : undefined}
							>
								{done ? (
									<Check className="h-3.5 w-3.5" aria-hidden />
								) : (
									index + 1
								)}
							</span>
							{!isLast ? (
								<span
									className={cn(
										"mt-1 w-px flex-1 min-h-4",
										done ? "bg-[#0f5384]" : "bg-slate-200",
									)}
									aria-hidden
								/>
							) : null}
						</div>
						<p
							className={cn(
								"pb-4 pt-1 text-sm",
								active
									? "font-semibold text-slate-800"
									: done
										? "font-medium text-slate-700"
										: "text-slate-500",
							)}
						>
							{SIMULATION_PHASE_LABELS[phase]}
						</p>
					</li>
				);
			})}
		</ol>
	);
}
