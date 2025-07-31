'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { INACTIVITY_CONFIG, getTimerValues } from '@/lib/inactivity-config';
import { useAuth } from '@/contexts/AuthContext';

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

  const { logout, isSessionValid } = useAuth();
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
    // Only set timer if session is valid
    if (!isSessionValid) {
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
  }, [isSessionValid]);

  const handleContinue = useCallback(() => {
    setShowDialog(false);
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  const handleLogout = useCallback(async () => {
    clearTimers();
    setShowDialog(false);

    // Use the auth context logout with inactivity reason
    await logout('inactivity');
  }, [clearTimers, logout]);

  const handleClose = useCallback(() => {
    setShowDialog(false);
  }, []);

  // Set up event listeners
  useEffect(() => {
    // Check if inactivity timer is enabled and session is valid
    if (!INACTIVITY_CONFIG.ENABLED || !isSessionValid) {
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
  }, [resetInactivityTimer, clearTimers, showDialog, isSessionValid]);

  // Reset timer when session validity changes
  useEffect(() => {
    if (isSessionValid) {
      resetInactivityTimer();
    } else {
      clearTimers();
      setShowDialog(false);
    }
  }, [isSessionValid, resetInactivityTimer, clearTimers]);

  return {
    showDialog,
    handleContinue,
    handleLogout,
    handleClose,
  };
}
