'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { Models } from 'appwrite';
import { getSessionUser } from '@/lib/actions/auth.actions';
import { getCurrentUserFrom2FA } from '@/lib/actions/user.actions';
// Removed useRouter import to prevent multiple router instances

interface AuthContextType {
  user: Models.User<Models.Preferences> | null;
  setUser: (user: Models.User<Models.Preferences> | null) => void;
  loading: boolean;
  logout: (reason?: 'manual' | 'inactivity') => Promise<void>;
  isSessionValid: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isSessionValid, setIsSessionValid] = useState(false);

  useEffect(() => {
    setMounted(true);

    const checkSession = async () => {
      try {
        setLoading(true);

        // First try to get session-based user
        const sessionUser = await getSessionUser();
        console.log(
          'AuthContext: Session user check result:',
          sessionUser ? 'Found' : 'Not found'
        );

        if (sessionUser) {
          console.log('AuthContext: Using session-based user');
          setUser(sessionUser);
          setIsSessionValid(true);
        } else {
          // If no session user, try to get 2FA-based user
          console.log('AuthContext: Checking 2FA-based user');
          const twoFAUser = await getCurrentUserFrom2FA();
          console.log(
            'AuthContext: 2FA user check result:',
            twoFAUser ? 'Found' : 'Not found'
          );

          if (twoFAUser) {
            console.log('AuthContext: Using 2FA-based user');
            // Convert the custom user object to match the expected format
            const convertedUser = {
              $id: twoFAUser.$id,
              name: twoFAUser.fullName,
              email: twoFAUser.email,
              emailVerification: true,
              phoneVerification: false,
              prefs: {},
              registration: new Date().toISOString(),
              status: true,
            } as Models.User<Models.Preferences>;

            setUser(convertedUser);
            setIsSessionValid(true);
          } else {
            console.log('AuthContext: No valid user found, setting to null');
            setUser(null);
            setIsSessionValid(false);
          }
        }
      } catch (error) {
        console.error('AuthContext: Session check failed:', error);
        setUser(null);
        setIsSessionValid(false);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const logout = async (reason: 'manual' | 'inactivity' = 'manual') => {
    try {
      // Call the server action to logout
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      if (response.ok) {
        setUser(null);
        setIsSessionValid(false);

        // Clear any client-side storage
        localStorage.removeItem('session');
        sessionStorage.clear();

        // Redirect based on reason using window.location to avoid router conflicts
        if (reason === 'inactivity') {
          window.location.href = '/sign-in?reason=inactivity';
        } else {
          window.location.href = '/sign-in';
        }
      } else {
        console.error('Logout failed');
        // Force logout even if API fails
        setUser(null);
        setIsSessionValid(false);
        window.location.href = '/sign-in';
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API fails
      setUser(null);
      setIsSessionValid(false);
      window.location.href = '/sign-in';
    }
  };

  // Always render the same structure, but conditionally show content
  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, logout, isSessionValid }}
    >
      {!mounted ? (
        <div style={{ visibility: 'hidden' }}>{children}</div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  // Always return the same structure, but conditionally show data
  return (
    context || {
      user: null,
      setUser: () => {},
      loading: true,
      logout: async () => {},
      isSessionValid: false,
    }
  );
};
