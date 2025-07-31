'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { INACTIVITY_CONFIG, getTimerValues } from '@/lib/inactivity-config';

export function useInactivityTimer() {
  // Early return if not in browser environment
  if (typeof window === 'undefined') {
    return {
      showDialog: false,
      handleContinue: () => {},
      handleLogout: () => {},
      handleClose: () => {},
    };
  }
  const [showDialog, setShowDialog] = useState(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

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
  }, []);

  const handleContinue = useCallback(() => {
    setShowDialog(false);
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  const handleLogout = useCallback(() => {
    clearTimers();
    setShowDialog(false);
    // Additional logout logic can be added here
    // For example, clearing cookies, localStorage, etc.
    localStorage.removeItem('session');
    sessionStorage.clear();
  }, [clearTimers]);

  const handleClose = useCallback(() => {
    setShowDialog(false);
  }, []);

  // Set up event listeners
  useEffect(() => {
    // Check if inactivity timer is enabled
    if (!INACTIVITY_CONFIG.ENABLED) {
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
  }, [resetInactivityTimer, clearTimers, showDialog]);

  return {
    showDialog,
    handleContinue,
    handleLogout,
    handleClose,
  };
}
