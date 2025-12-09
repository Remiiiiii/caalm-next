'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import ContractsView from './ContractsView';
import type { UIFileDoc } from '@/types/files';
import { useContractsFilter } from './ContractsView';

interface ContractsViewClientProps {
  files: UIFileDoc[];
  user: {
    role?: string;
  } | null;
}

export default function ContractsViewClient({
  files,
  user,
}: ContractsViewClientProps) {
  const router = useRouter();
  const { filters } = useContractsFilter();

  const handleRefresh = () => {
    router.refresh();
  };

  // Apply filters to files
  const filteredFiles = useMemo(() => {
    if (!filters || Object.keys(filters).length === 0) {
      return files;
    }

    return files.filter((file: UIFileDoc) => {
      // Status filter
      if (filters.status && file.status !== filters.status) {
        return false;
      }

      // Uploaded On date range filter
      if (filters.uploadedOnFrom || filters.uploadedOnTo) {
        const uploadedDate = file.$createdAt ? new Date(file.$createdAt) : null;
        if (!uploadedDate) return false;

        if (filters.uploadedOnFrom) {
          const fromDate = new Date(filters.uploadedOnFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (uploadedDate < fromDate) return false;
        }

        if (filters.uploadedOnTo) {
          const toDate = new Date(filters.uploadedOnTo);
          toDate.setHours(23, 59, 59, 999);
          if (uploadedDate > toDate) return false;
        }
      }

      // Expires On date range filter
      if (filters.expiresOnFrom || filters.expiresOnTo) {
        const expiryDate = file.contractExpiryDate
          ? new Date(file.contractExpiryDate)
          : null;
        if (!expiryDate) return false;

        if (filters.expiresOnFrom) {
          const fromDate = new Date(filters.expiresOnFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (expiryDate < fromDate) return false;
        }

        if (filters.expiresOnTo) {
          const toDate = new Date(filters.expiresOnTo);
          toDate.setHours(23, 59, 59, 999);
          if (expiryDate > toDate) return false;
        }
      }

      // Department filter
      if (filters.department && file.department !== filters.department) {
        return false;
      }

      // Assigned To filter (case-insensitive partial match)
      if (filters.assignedTo) {
        const assignedManagers = file.assignedManagers || [];
        const searchTerm = filters.assignedTo.toLowerCase();
        const hasMatch = assignedManagers.some((manager: string) =>
          manager.toLowerCase().includes(searchTerm)
        );
        if (!hasMatch) return false;
      }

      return true;
    });
  }, [files, filters]);

  return (
    <ContractsView files={filteredFiles} user={user} onRefresh={handleRefresh} />
  );
}
