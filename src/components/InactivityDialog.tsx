'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Clock, LogOut, RefreshCw, AlertTriangle } from 'lucide-react';
import { getTimerValues, formatTime } from '@/lib/inactivity-config';

interface InactivityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  onLogout: () => void;
}

export default function InactivityDialog({
  isOpen,
  onClose,
  onContinue,
  onLogout,
}: InactivityDialogProps) {
  const { countdownTime } = getTimerValues();
  const initialSeconds = Math.floor(countdownTime / 1000);
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await onLogout();
    } catch (error) {
      console.error('Logout error:', error);
      // Force close dialog even if logout fails
      onClose();
    }
  };

  const handleContinue = () => {
    onContinue();
    onClose();
  };

  // Reset countdown when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSecondsLeft(initialSeconds);
      setIsLoggingOut(false);
    }
  }, [isOpen, initialSeconds]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen) return;

    const countdownTimer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, [isOpen]);

  // Handle logout when countdown reaches 0
  useEffect(() => {
    if (isOpen && secondsLeft <= 0 && !isLoggingOut) {
      handleLogout();
    }
  }, [isOpen, secondsLeft, isLoggingOut]);

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Session Expiring
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                Due to inactivity, you'll be signed out in{' '}
                <span className="font-mono font-bold text-red-600">
                  {formatTime(secondsLeft)}
                </span>{' '}
                seconds.
              </p>
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                  For security reasons, your session will be completely
                  terminated and you'll need to sign in again.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex gap-2">
          <AlertDialogCancel
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? 'Signing Out...' : 'Sign Out Now'}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleContinue}
            disabled={isLoggingOut}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            Continue Session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
