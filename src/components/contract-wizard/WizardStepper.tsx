"use client";

import { Check } from "lucide-react";
import { WIZARD_STEPS } from "@/lib/templates/constants";
import { cn } from "@/lib/utils";

type WizardStepperProps = {
	currentStep: number;
	onSelect?: (step: number) => void;
};

export function WizardStepper({ currentStep, onSelect }: WizardStepperProps) {
	return (
		<ol className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
			{WIZARD_STEPS.map((step) => {
				const done = currentStep > step.id;
				const active = currentStep === step.id;
				return (
					<li key={step.id}>
						<button
							type="button"
							aria-current={active ? "step" : undefined}
							onClick={() => onSelect?.(step.id)}
							className={cn(
								"flex w-full cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white/70 p-3 text-left transition-all duration-200",
								"hover:border-blue-300 hover:bg-blue-50",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
								active && "border-blue-300 bg-blue-50",
							)}
						>
							<span
								className={cn(
									"mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
									done || active
										? "bg-[#0f5384] text-white"
										: "bg-slate-100 text-slate-600",
								)}
							>
								{done ? <Check className="h-4 w-4" aria-hidden /> : step.id + 1}
							</span>
							<span>
								<span className="block text-sm font-medium sidebar-gradient-text">
									{step.title}
								</span>
								<span className="mt-0.5 block text-xs text-slate-600">
									{step.hint}
								</span>
							</span>
						</button>
					</li>
				);
			})}
		</ol>
	);
}
