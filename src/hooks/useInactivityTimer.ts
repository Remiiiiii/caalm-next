'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { INACTIVITY_CONFIG, getTimerValues } from '@/lib/inactivity-config';
import { useAuth } from '@/contexts/AuthContext';

export function useInactivityTimer() {
  const { logout, isSessionValid } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check if we're in browser environment
  const isBrowser = typeof window !== 'undefined';

  const clearTimers = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  const resetInactivityTimer = useCallback(() => {
    // Only set timer if session is valid and in browser
    if (!isSessionValid || !isBrowser) {
      return;
    }

    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Get current timer values
    const { inactivityLimit } = getTimerValues();

    // Set new timer
    inactivityTimerRef.current = setTimeout(() => {
      setShowDialog(true);
    }, inactivityLimit);
  }, [isSessionValid, isBrowser]);

  const handleContinue = useCallback(() => {
    setShowDialog(false);
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  const handleLogout = useCallback(async () => {
    clearTimers();
    setShowDialog(false);

    // Use the auth context logout with inactivity reason
    if (isBrowser) {
      await logout('inactivity');
    }
  }, [clearTimers, logout, isBrowser]);

  const handleClose = useCallback(() => {
    setShowDialog(false);
  }, []);

  // Set up event listeners
  useEffect(() => {
    // Check if inactivity timer is enabled, session is valid, and in browser
    if (!INACTIVITY_CONFIG.ENABLED || !isSessionValid || !isBrowser) {
      return;
    }

    const events = INACTIVITY_CONFIG.MONITORED_EVENTS;

    const handleActivity = () => {
      if (!showDialog) {
        resetInactivityTimer();
      }
    };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start initial timer
    resetInactivityTimer();

    // Cleanup
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      clearTimers();
    };
  }, [
    resetInactivityTimer,
    clearTimers,
    showDialog,
    isSessionValid,
    isBrowser,
  ]);

  // Reset timer when session validity changes
  useEffect(() => {
    if (isSessionValid && isBrowser) {
      resetInactivityTimer();
    } else {
      clearTimers();
      setShowDialog(false);
    }
  }, [isSessionValid, resetInactivityTimer, clearTimers, isBrowser]);

  return {
    showDialog,
    handleContinue,
    handleLogout,
    handleClose,
  };
}
