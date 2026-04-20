/**
 * Step progress indicator with clickable navigation
 * Matches the design from ContractUploadForm.tsx
 */

"use client";

import { FileCheck } from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";
import { STEP_TITLES, TOTAL_STEPS } from "../constants";

interface StepIndicatorProps {
	currentStep: number;
	onGoToStep: (step: number) => void;
	processedFileData?: any; // Optional, for accessibility check
}

export default function StepIndicator({
	currentStep,
	onGoToStep,
	processedFileData,
}: StepIndicatorProps) {
	return (
		<>
			{/* Progress Bar */}
			<div className="h-2 w-full rounded-full bg-white/40 backdrop-blur-sm">
				<div
					className="h-2 rounded-full bg-linear-to-r from-blue-500 to-cyan-500 transition-all duration-300"
					style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
				/>
			</div>

			{/* Step Indicators */}
			<div className="flex items-center justify-between mt-3 gap-1">
				{STEP_TITLES.map((title, index) => {
					const stepNum = index + 1;
					const isActive = stepNum === currentStep;
					const isCompleted = stepNum < currentStep;
					const isAccessible =
						stepNum === 1 || processedFileData || stepNum <= currentStep;
					const nextStepNum = index + 2;
					const isNextStepCompleted = nextStepNum < currentStep;
					const hasNextStep = index < STEP_TITLES.length - 1;
					const showLine = isCompleted && hasNextStep && isNextStepCompleted;

					return (
						<React.Fragment key={stepNum}>
							<button
								type="button"
								onClick={() => isAccessible && onGoToStep(stepNum)}
								disabled={!isAccessible}
								className={cn(
									"flex-1 text-xs px-2 py-1 rounded-md transition-all flex items-center justify-center",
									isActive
										? "bg-[#e1f3ff] hover:bg-green/10 border border-[#a0c4db] text-[#6c8ba1] font-semibold"
										: isCompleted
											? "bg-green/10 text-green border-green/20"
											: isAccessible
												? "bg-slate-100 text-slate-600 hover:bg-slate-200"
												: "bg-slate-50 text-slate-400 cursor-not-allowed",
								)}
								title={title}
							>
								{isCompleted ? (
									<FileCheck className="h-6 w-6 text-green" />
								) : (
									<div className="truncate">{stepNum}</div>
								)}
							</button>
							{showLine && (
								<div
									className="flex-shrink-0 rounded-full"
									style={{
										backgroundColor: "#3DD9B3",
										height: "0.5px",
										width: "60px",
										marginLeft: "-4px",
										marginRight: "-4px",
									}}
									aria-hidden="true"
								/>
							)}
						</React.Fragment>
					);
				})}
			</div>
		</>
	);
}
