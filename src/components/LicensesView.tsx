'use client';

import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  useMemo,
} from 'react';
import Image from 'next/image';
import LicenseCard from '@/components/licenses/LicenseCard';
import LicensesTableView from './LicensesTableView';
import type { License } from '@/types/licenses';
import LicensesPagination from './LicensesPagination';

export type ViewType = 'table' | 'card';

const STORAGE_KEY = 'licenses-view-preference';

export interface LicenseFilters {
  status?: string;
  licenseType?: string;
  category?: string;
  issueDateFrom?: Date;
  issueDateTo?: Date;
  expiryDateFrom?: Date;
  expiryDateTo?: Date;
  department?: string;
  assignedTo?: string;
  searchQuery?: string;
}

interface LicensesViewContextType {
  view: ViewType;
  handleViewChange: (view: ViewType) => void;
  filters: LicenseFilters;
  setFilters: React.Dispatch<React.SetStateAction<LicenseFilters>>;
}

const LicensesViewContext = createContext<LicensesViewContextType | undefined>(
  undefined
);

export function LicensesViewProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [view, setView] = useState<ViewType>('card');
  const [filters, setFilters] = useState<LicenseFilters>({});

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
    <LicensesViewContext.Provider
      value={{ view, handleViewChange, filters, setFilters }}
    >
      {children}
    </LicensesViewContext.Provider>
  );
}

export function useLicensesView() {
  const context = useContext(LicensesViewContext);
  if (context === undefined) {
    throw new Error(
      'useLicensesView must be used within a LicensesViewProvider'
    );
  }
  return context;
}

export function useLicensesFilter() {
  const context = useContext(LicensesViewContext);
  if (context === undefined) {
    throw new Error(
      'useLicensesFilter must be used within a LicensesViewProvider'
    );
  }
  return { filters: context.filters, setFilters: context.setFilters };
}

interface LicensesViewProps {
  licenses: License[];
  user: {
    role?: string;
  } | null;
  onRefresh?: () => void;
}

export default function LicensesView({
  licenses,
  user,
  onRefresh,
}: LicensesViewProps) {
  const { view, filters } = useLicensesView();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Reset to page 1 when licenses array changes
  const licensesKey = useMemo(
    () => JSON.stringify(licenses.map((l) => l.$id)),
    [licenses]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [licensesKey]);

  // Calculate total pages
  const totalPages = Math.max(1, Math.ceil(licenses.length / itemsPerPage));

  // Ensure currentPage is within valid range
  const validCurrentPage = useMemo(() => {
    return Math.min(Math.max(1, currentPage), totalPages);
  }, [currentPage, totalPages]);

  // Sync currentPage if out of bounds
  useEffect(() => {
    if (totalPages > 0 && (currentPage > totalPages || currentPage < 1)) {
      setCurrentPage(Math.min(Math.max(1, currentPage), totalPages));
    }
  }, [totalPages, currentPage]);

  // Calculate pagination with valid page number
  const startIndex = (validCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLicenses = useMemo(
    () => licenses.slice(startIndex, endIndex),
    [licenses, startIndex, endIndex]
  );

  // Empty state for card view
  if (view === 'card' && licenses.length === 0) {
    return (
      <div className="text-center py-12">
        <Image
          src="/assets/icons/no-data.svg"
          alt="No licenses found"
          width={250}
          height={250}
          className="mx-auto mb-4"
        />
        <p className="body-1 text-slate-700">No licenses found</p>
      </div>
    );
  }

  return (
    <>
      {view === 'table' ? (
        <>
          <LicensesTableView
            licenses={paginatedLicenses}
            user={user}
            onRefresh={onRefresh}
          />
          {licenses.length > itemsPerPage && (
            <LicensesPagination
              currentPage={validCurrentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      ) : (
        <>
          <section className="file-list">
            {paginatedLicenses.map((license: License) => (
              <LicenseCard
                key={license.$id}
                license={license}
                onRefresh={onRefresh}
              />
            ))}
          </section>
          {licenses.length > itemsPerPage && (
            <LicensesPagination
              currentPage={validCurrentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}
    </>
  );
}
