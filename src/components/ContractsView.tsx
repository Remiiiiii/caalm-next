'use client';

import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from 'react';
import Card from '@/components/Card';
import ContractsTableView from './ContractsTableView';
import type { UIFileDoc } from '@/types/files';

export type ViewType = 'table' | 'card';

const STORAGE_KEY = 'contracts-view-preference';

interface ContractsViewContextType {
  view: ViewType;
  handleViewChange: (view: ViewType) => void;
}

const ContractsViewContext = createContext<
  ContractsViewContextType | undefined
>(undefined);

export function ContractsViewProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [view, setView] = useState<ViewType>('card');

  // Load view preference from localStorage on mount
  useEffect(() => {
    const savedView = localStorage.getItem(STORAGE_KEY) as ViewType | null;
    if (savedView === 'table' || savedView === 'card') {
      setView(savedView);
    }
  }, []);

  // Save view preference to localStorage when it changes
  const handleViewChange = useCallback((newView: ViewType) => {
    setView(newView);
    localStorage.setItem(STORAGE_KEY, newView);
  }, []);

  return (
    <ContractsViewContext.Provider value={{ view, handleViewChange }}>
      {children}
    </ContractsViewContext.Provider>
  );
}

export function useContractsView() {
  const context = useContext(ContractsViewContext);
  if (context === undefined) {
    throw new Error(
      'useContractsView must be used within a ContractsViewProvider'
    );
  }
  return context;
}

interface ContractsViewProps {
  files: UIFileDoc[];
  user: {
    role?: string;
  } | null;
  onRefresh?: () => void;
}

export default function ContractsView({
  files,
  user,
  onRefresh,
}: ContractsViewProps) {
  const { view } = useContractsView();

  return (
    <>
      {view === 'table' ? (
        <ContractsTableView files={files} user={user} onRefresh={onRefresh} />
      ) : (
        <section className="file-list">
          {files.map((file: UIFileDoc) => (
            <Card
              key={file.$id}
              file={file}
              status={file.status}
              expirationDate={file.contractExpiryDate}
              userRole={user?.role as 'executive' | 'admin' | 'manager'}
              onRefresh={onRefresh}
            />
          ))}
        </section>
      )}
    </>
  );
}
