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

  useEffect(() => {
    const client = new Client()
      .setEndpoint(appwriteConfig.endpointUrl)
      .setProject(appwriteConfig.projectId);
    const account = new Account(client);

    account
      .get()
      .then((user) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    const client = new Client()
      .setEndpoint(appwriteConfig.endpointUrl)
      .setProject(appwriteConfig.projectId);
    const account = new Account(client);
    await account.deleteSession('current');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
