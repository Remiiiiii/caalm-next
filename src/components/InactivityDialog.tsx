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
import { Clock, LogOut, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();

  // Reset countdown when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSecondsLeft(initialSeconds);
    }
  }, [isOpen, initialSeconds]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen) return;

    const countdownTimer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          handleLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, [isOpen]);

  const handleLogout = () => {
    onLogout();
    router.push('/sign-in');
  };

  const handleContinue = () => {
    onContinue();
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Session Expiring
          </AlertDialogTitle>
          <AlertDialogDescription>
            Due to inactivity, you'll be signed out in{' '}
            <span className="font-mono font-bold text-red-600">
              {formatTime(secondsLeft)}
            </span>{' '}
            seconds.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex gap-2">
          <AlertDialogCancel
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleContinue}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600"
          >
            <RefreshCw className="h-4 w-4" />
            Continue Session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
