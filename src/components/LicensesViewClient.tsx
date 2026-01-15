'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import LicensesView from './LicensesView';
import type { License } from '@/types/licenses';
import { useLicensesFilter } from './LicensesView';

interface LicensesViewClientProps {
  licenses: License[];
  user: {
    role?: string;
  } | null;
}

export default function LicensesViewClient({
  licenses,
  user,
}: LicensesViewClientProps) {
  const router = useRouter();
  const { filters } = useLicensesFilter();

  const handleRefresh = () => {
    router.refresh();
  };

  // Apply filters to licenses
  const filteredLicenses = useMemo(() => {
    if (!filters || Object.keys(filters).length === 0) {
      return licenses;
    }

    return licenses.filter((license: License) => {
      // Status filter
      if (filters.status && license.status !== filters.status) {
        return false;
      }

      // License Type filter
      if (filters.licenseType && license.licenseType !== filters.licenseType) {
        return false;
      }

      // Category filter
      if (filters.category && license.category !== filters.category) {
        return false;
      }

      // Issue Date range filter
      if (filters.issueDateFrom || filters.issueDateTo) {
        const issueDate = license.issueDate
          ? new Date(license.issueDate)
          : null;
        if (!issueDate) return false;

        if (filters.issueDateFrom) {
          const fromDate = new Date(filters.issueDateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (issueDate < fromDate) return false;
        }

        if (filters.issueDateTo) {
          const toDate = new Date(filters.issueDateTo);
          toDate.setHours(23, 59, 59, 999);
          if (issueDate > toDate) return false;
        }
      }

      // Expiry Date range filter
      if (filters.expiryDateFrom || filters.expiryDateTo) {
        const expiryDate = license.licenseExpiryDate
          ? new Date(license.licenseExpiryDate)
          : null;
        if (!expiryDate) return false;

        if (filters.expiryDateFrom) {
          const fromDate = new Date(filters.expiryDateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (expiryDate < fromDate) return false;
        }

        if (filters.expiryDateTo) {
          const toDate = new Date(filters.expiryDateTo);
          toDate.setHours(23, 59, 59, 999);
          if (expiryDate > toDate) return false;
        }
      }

      // Department filter
      if (filters.department) {
        const licenseDept = license.division || license.department;
        if (licenseDept !== filters.department) return false;
      }

      // Assigned To filter (case-insensitive partial match)
      if (filters.assignedTo) {
        const assignedManagers = license.assignedManagers || [];
        const searchTerm = filters.assignedTo.toLowerCase();
        const hasMatch = assignedManagers.some((manager: string) =>
          manager.toLowerCase().includes(searchTerm)
        );
        if (!hasMatch) return false;
      }

      // Search query filter (license name, number, vendor, product)
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesName = (license.licenseName || '')
          .toLowerCase()
          .includes(query);
        const matchesNumber = (license.licenseNumber || '')
          .toLowerCase()
          .includes(query);
        const matchesVendor = (license.vendor || '')
          .toLowerCase()
          .includes(query);
        const matchesProduct = (license.product || '')
          .toLowerCase()
          .includes(query);
        if (!matchesName && !matchesNumber && !matchesVendor && !matchesProduct) {
          return false;
        }
      }

      return true;
    });
  }, [licenses, filters]);

  return (
    <LicensesView
      licenses={filteredLicenses}
      user={user}
      onRefresh={handleRefresh}
    />
  );
}
