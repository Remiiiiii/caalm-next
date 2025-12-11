'use client';

import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from 'react';
import Image from 'next/image';
import Card from '@/components/Card';
import ContractsTableView from './ContractsTableView';
import type { UIFileDoc } from '@/types/files';
import { Card as UICard, CardContent } from '@/components/ui/card';

export type ViewType = 'table' | 'card';

const STORAGE_KEY = 'contracts-view-preference';

export interface ContractFilters {
  status?: string;
  uploadedOnFrom?: Date;
  uploadedOnTo?: Date;
  expiresOnFrom?: Date;
  expiresOnTo?: Date;
  department?: string;
  assignedTo?: string;
  contractType?: string;
  searchQuery?: string;
}

interface ContractsViewContextType {
  view: ViewType;
  handleViewChange: (view: ViewType) => void;
  filters: ContractFilters;
  setFilters: React.Dispatch<React.SetStateAction<ContractFilters>>;
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
  const [filters, setFilters] = useState<ContractFilters>({});

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
    <ContractsViewContext.Provider
      value={{ view, handleViewChange, filters, setFilters }}
    >
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

export function useContractsFilter() {
  const context = useContext(ContractsViewContext);
  if (context === undefined) {
    throw new Error(
      'useContractsFilter must be used within a ContractsViewProvider'
    );
  }
  return { filters: context.filters, setFilters: context.setFilters };
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

  // Empty state for card view
  if (view === 'card' && files.length === 0) {
    return (
      <div className="text-center py-12">
        <Image
          src="/assets/icons/no-data.svg"
          alt="No contracts found"
          width={250}
          height={250}
          className="mx-auto mb-4"
        />
        <p className="body-1 text-slate-700">No contracts found</p>
      </div>
    );
  }

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
