'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { Client, Account, Models } from 'appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';

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

    // Validate Appwrite configuration
    if (!appwriteConfig.endpointUrl || !appwriteConfig.projectId) {
      console.error('Appwrite configuration is incomplete:', appwriteConfig);
      setLoading(false);
      return;
    }

    const client = new Client()
      .setEndpoint(appwriteConfig.endpointUrl)
      .setProject(appwriteConfig.projectId);
    const account = new Account(client);

    const checkSession = async () => {
      try {
        setLoading(true);
        // Only call if a session exists (e.g., check localStorage/cookie or try/catch)
        const user = await account.get();
        setUser(user);
      } catch (error) {
        console.log(error);
        // 401 Unauthorized: No session, handle gracefully
        setUser(null);
        // Optionally: redirect to login or show guest UI
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const logout = async () => {
    if (!appwriteConfig.endpointUrl || !appwriteConfig.projectId) {
      console.error('Appwrite configuration is incomplete for logout');
      setUser(null);
      return;
    }

    const client = new Client()
      .setEndpoint(appwriteConfig.endpointUrl)
      .setProject(appwriteConfig.projectId);
    const account = new Account(client);
    await account.deleteSession('current');
    setUser(null);
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
