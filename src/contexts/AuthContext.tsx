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
import { useRouter } from 'next/navigation';

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
  const router = useRouter();

  useEffect(() => {
    setMounted(true);

    const checkSession = async () => {
      try {
        setLoading(true);

        // First try to get session-based user
        const sessionUser = await getSessionUser();

        if (sessionUser) {
          setUser(sessionUser);
          setIsSessionValid(true);
        } else {
<<<<<<< Updated upstream
          // If no session user, try to get 2FA-based user
          const twoFAUser = await getCurrentUserFrom2FA();
=======
          // Check for 2FA-based authentication only if we're on a dashboard route
          // This prevents automatic authentication on sign-in page
          const isDashboardRoute =
            pathname && pathname.startsWith('/dashboard');
          const isAuthRoute =
            pathname &&
            (pathname.startsWith('/sign-in') ||
              pathname.startsWith('/sign-up'));
>>>>>>> Stashed changes

          if (twoFAUser) {
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

<<<<<<< Updated upstream
            setUser(convertedUser);
            setIsSessionValid(true);
          } else {
=======
          if (isAuthRoute) {
            // Explicitly set to null on auth routes to prevent any 2FA interference
            console.log(
              'AuthContext: On auth route, explicitly setting user to null'
            );
            setUser(null);
            setIsSessionValid(false);
          } else if (isDashboardRoute) {
            console.log(
              'AuthContext: On dashboard route, checking 2FA-based user'
            );
            const twoFAUser = await getCurrentUserFrom2FA();
            console.log(
              'AuthContext: 2FA user check result:',
              twoFAUser ? 'Found' : 'Not found'
            );

            if (twoFAUser) {
              console.log('AuthContext: Using 2FA-based user for dashboard');
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
              console.log('AuthContext: No 2FA user found, setting to null');
              setUser(null);
              setIsSessionValid(false);
            }
          } else {
            console.log(
              'AuthContext: Not on dashboard or auth route, setting to null'
            );
>>>>>>> Stashed changes
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

        // Redirect based on reason
        if (reason === 'inactivity') {
          router.push('/sign-in?reason=inactivity');
        } else {
          router.push('/sign-in');
        }
      } else {
        console.error('Logout failed');
        // Force logout even if API fails
        setUser(null);
        setIsSessionValid(false);
        router.push('/sign-in');
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API fails
      setUser(null);
      setIsSessionValid(false);
      router.push('/sign-in');
    }
  };

  // Don't render children until mounted to prevent hydration mismatches
  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, logout, isSessionValid }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    console.warn(
      'useAuth called outside of AuthProvider - this might be a hydration issue'
    );
    // Return a default context to prevent crashes during hydration
    return {
      user: null,
      setUser: () => {},
      loading: true,
      logout: async () => {},
      isSessionValid: false,
    };
  }
  return context;
};
