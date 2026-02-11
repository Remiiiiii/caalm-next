'use client';

import React, { useMemo } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LicensesFilter from './LicensesFilter';
import { useLicensesFilter, type LicenseFilters } from './LicensesView';
import type { License } from '@/types/licenses';

interface LicensesHeaderActionsProps {
  licenses: License[];
  departments?: string[];
  assignedManagers?: string[];
}

function applyFilters(licenses: License[], filters: LicenseFilters) {
  return licenses.filter((license: License) => {
    if (filters.status && license.status !== filters.status) return false;
    if (filters.licenseType && license.licenseType !== filters.licenseType) return false;
    if (filters.category && license.category !== filters.category) return false;

    if (filters.issueDateFrom || filters.issueDateTo) {
      const issueDate = license.issueDate ? new Date(license.issueDate) : null;
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

    if (filters.expiryDateFrom || filters.expiryDateTo) {
      const expiryDate = license.licenseExpiryDate ? new Date(license.licenseExpiryDate) : null;
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

    if (filters.department) {
      const licenseDept = license.division || license.department;
      if (licenseDept !== filters.department) return false;
    }

    if (filters.assignedTo) {
      const managers = license.assignedManagers || [];
      const term = filters.assignedTo.toLowerCase();
      if (!managers.some((m: string) => m.toLowerCase().includes(term))) return false;
    }

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const match =
        (license.licenseName || '').toLowerCase().includes(q) ||
        (license.licenseNumber || '').toLowerCase().includes(q) ||
        (license.vendor || '').toLowerCase().includes(q) ||
        (license.product || '').toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });
}

export default function LicensesHeaderActions({
  licenses,
  departments = [],
  assignedManagers = [],
}: LicensesHeaderActionsProps) {
  const { filters } = useLicensesFilter();

  const filteredForExport = useMemo(
    () => applyFilters(licenses, filters),
    [licenses, filters]
  );

  const handleExport = () => {
    const headers = [
      'License Name',
      'License Number',
      'Status',
      'Type',
      'Category',
      'Vendor',
      'Product',
      'Department',
      'Assigned To',
      'Issue Date',
      'Expiry Date',
      'Cost',
      'Quantity',
      'Created Date',
    ];

    const rows = filteredForExport.map((license) => [
      license.licenseName || 'Untitled',
      license.licenseNumber || '',
      license.status || '',
      license.licenseType || '',
      license.category || '',
      license.vendor || '',
      license.product || '',
      license.division || license.department || '',
      Array.isArray(license.assignedManagers)
        ? license.assignedManagers.join(', ')
        : license.assignedManagers || '',
      license.issueDate || '',
      license.licenseExpiryDate || '',
      license.cost?.toString() || '',
      license.quantity?.toString() || '',
      license.$createdAt || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `licenses-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="flex items-center gap-2">
      <LicensesFilter
        departments={departments}
        assignedManagers={assignedManagers}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        className="primary-btn px-3 sm:px-4"
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Export</span>
      </Button>
    </div>
  );
}
