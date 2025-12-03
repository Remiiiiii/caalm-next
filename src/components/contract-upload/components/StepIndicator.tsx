/**
 * Step progress indicator with clickable navigation
 */

'use client';

import React from 'react';
import { FileCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STEP_TITLES, TOTAL_STEPS } from '../constants';

interface StepIndicatorProps {
  currentStep: number;
  onGoToStep: (step: number) => void;
}

export default function StepIndicator({
  currentStep,
  onGoToStep,
}: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 px-4 overflow-x-auto">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((stepNum) => {
        const isCompleted = stepNum < currentStep;
        const isActive = stepNum === currentStep;
        const isAccessible = stepNum <= currentStep;

        return (
          <button
            key={stepNum}
            type="button"
            onClick={() => isAccessible && onGoToStep(stepNum)}
            disabled={!isAccessible}
            className={cn(
              'flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold transition-all duration-200',
              isActive &&
                'bg-gradient-to-r from-[#0f5384] to-[#03B1C1] text-white scale-110 shadow-lg',
              isCompleted &&
                !isActive &&
                'bg-green/10 text-green border-2 border-green hover:scale-105',
              !isActive &&
                !isCompleted &&
                isAccessible &&
                'bg-slate-100 text-slate-400 border border-slate-300',
              !isAccessible && 'bg-slate-50 text-slate-300 cursor-not-allowed'
            )}
            title={STEP_TITLES[stepNum - 1]}
          >
            {isCompleted ? (
              <FileCheck className="w-5 h-5" />
            ) : (
              <span>{stepNum}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

