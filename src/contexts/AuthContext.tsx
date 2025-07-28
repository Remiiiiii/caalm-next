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

interface AuthContextType {
  user: Models.User<Models.Preferences> | null;
  setUser: (user: Models.User<Models.Preferences> | null) => void;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const checkSession = async () => {
      try {
        setLoading(true);

        const sessionUser = await getSessionUser();

        if (sessionUser) {
          setUser(sessionUser);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('AuthContext: Session check failed:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const logout = async () => {
    try {
      // Call the server action to logout
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        setUser(null);
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
    }
  };

  // Don't render children until mounted to prevent hydration mismatches
  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout }}>
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
    };
  }
  return context;
};
