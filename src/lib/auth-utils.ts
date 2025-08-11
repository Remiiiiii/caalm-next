/**
 * Authentication and Session Management Utilities
 */

export interface SessionStatus {
  valid: boolean;
  reason?: 'no_session' | 'invalid_session' | 'validation_error';
  user?: {
    $id: string;
    email: string;
    name: string;
  };
}

/**
 * Validate session by calling the session validation API
 */
export async function validateSession(): Promise<SessionStatus> {
  try {
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include', // Include cookies
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      const data = await response.json();
      return {
        valid: false,
        reason: data.reason || 'validation_error',
      };
    }
  } catch (error) {
    console.error('Session validation error:', error);
    return {
      valid: false,
      reason: 'validation_error',
    };
  }
}

/**
 * Logout user with specified reason
 */
export async function logoutUser(
  reason: 'manual' | 'inactivity' = 'manual'
): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
      credentials: 'include',
    });

    if (response.ok) {
      // Clear client-side storage
      localStorage.removeItem('session');
      sessionStorage.clear();
      return true;
    } else {
      console.error('Logout failed:', response.statusText);
      return false;
    }
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const sessionStatus = await validateSession();
  return sessionStatus.valid;
}

/**
 * Get logout reason message for display
 */
export function getLogoutMessage(reason: string): string {
  switch (reason) {
    case 'inactivity':
      return 'Your session expired due to inactivity. Please sign in again.';
    case 'session_expired':
      return 'Your session has expired. Please sign in again.';
    case 'validation_error':
      return 'Session validation failed. Please sign in again.';
    default:
      return 'You have been signed out. Please sign in again.';
  }
}

/**
 * Clear all authentication data from client-side storage
 */
export function clearAuthData(): void {
  localStorage.removeItem('session');
  localStorage.removeItem('user');
  sessionStorage.clear();

  // Clear any other auth-related items
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (
      key &&
      (key.includes('auth') || key.includes('session') || key.includes('token'))
    ) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
}
