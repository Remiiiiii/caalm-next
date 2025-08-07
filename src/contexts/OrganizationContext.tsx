'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';

interface OrganizationContextType {
  orgId: string | null;
  setOrgId: (orgId: string) => void;
  loading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined
);

export const OrganizationProvider = ({ children }: { children: ReactNode }) => {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to get orgId from localStorage first
    const savedOrgId = localStorage.getItem('caalm_org_id');

    if (savedOrgId) {
      setOrgId(savedOrgId);
    } else {
      // For now, use a default organization ID
      // In a real app, this would come from user preferences or be set during onboarding
      const defaultOrgId = 'default_organization';
      setOrgId(defaultOrgId);
      localStorage.setItem('caalm_org_id', defaultOrgId);
    }

    setLoading(false);
  }, []);

  const handleSetOrgId = (newOrgId: string) => {
    setOrgId(newOrgId);
    localStorage.setItem('caalm_org_id', newOrgId);
  };

  return (
    <OrganizationContext.Provider
      value={{
        orgId,
        setOrgId: handleSetOrgId,
        loading,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error(
      'useOrganization must be used within an OrganizationProvider'
    );
  }
  return context;
};
