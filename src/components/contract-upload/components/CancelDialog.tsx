/**
 * Cancel confirmation dialog
 */

'use client';

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Ban, StepForward } from 'lucide-react';

interface CancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function CancelDialog({
  open,
  onOpenChange,
  onConfirm,
}: CancelDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[500px] p-0 max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 shadow-xl">
        {/* Professional Cap */}
        <div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />

        {/* Header with gradient background */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-orange-50 to-amber-50 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3 px-6">
            <div>
              <AlertDialogTitle className="flex items-center gap-2 text-xl font-semibold sidebar-gradient-text py-2">
                <Ban className="w-5 h-5 text-[#0f5384]" />
                Cancel Form?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm ml-7 text-slate-600">
                Your progress will not be saved
              </AlertDialogDescription>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-2 px-6 bg-white">
          <p className="text-sm text-slate-700 leading-relaxed">
            Are you sure you want to cancel? If you cancel, the form will not be
            saved and all progress will be lost. You can save your progress using
            the "Save Progress" button before canceling.
          </p>
        </div>

        {/* Professional Footer */}
        <div className="py-4 bg-slate-50 border-t border-slate-200 flex justify-center items-center gap-3">
          <AlertDialogCancel
            onClick={() => onOpenChange(false)}
            className="primary-btn px-4 sm:px-4 shimmer-hover"
          >
            <StepForward className="h-4 w-4" />
            Continue Editing
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="primary-btn px-4 sm:px-4 shimmer-hover"
          >
            <Ban className="h-4 w-4" />
            Cancel & Discard
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

