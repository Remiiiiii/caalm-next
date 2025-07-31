// Inactivity Timer Configuration
export const INACTIVITY_CONFIG = {
  // Inactivity limit before showing dialog (in milliseconds)
  INACTIVITY_LIMIT: 600000, // 10 minutes

  // Countdown time in dialog (in milliseconds)
  COUNTDOWN_TIME: 30000, // 30 seconds

  // Events to monitor for user activity
  MONITORED_EVENTS: [
    'mousemove',
    'keydown',
    'click',
    'scroll',
    'touchstart',
  ] as const,

  // Whether to enable the inactivity timer
  ENABLED: true,

  // Development mode - shorter timers for testing
  DEV_MODE: process.env.NODE_ENV === 'development',

  // Development timers (when DEV_MODE is true)
  DEV_INACTIVITY_LIMIT: 5000, // 10 min for testing
  DEV_COUNTDOWN_TIME: 10000, // 10 seconds for testing
};

// Helper function to get current timer values
export function getTimerValues() {
  if (INACTIVITY_CONFIG.DEV_MODE) {
    return {
      inactivityLimit: INACTIVITY_CONFIG.DEV_INACTIVITY_LIMIT,
      countdownTime: INACTIVITY_CONFIG.DEV_COUNTDOWN_TIME,
    };
  }

  return {
    inactivityLimit: INACTIVITY_CONFIG.INACTIVITY_LIMIT,
    countdownTime: INACTIVITY_CONFIG.COUNTDOWN_TIME,
  };
}

// Helper function to format time for display
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Helper function to convert milliseconds to seconds
export function msToSeconds(ms: number): number {
  return Math.floor(ms / 1000);
}
