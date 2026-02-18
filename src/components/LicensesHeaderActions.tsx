'use client';

import React, { useMemo } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LicensesFilter from './LicensesFilter';
import { useLicensesFilter } from './LicensesView';
import type { License } from '@/types/licenses';
import { applyLicenseFilters } from '@/lib/licenses/applyLicenseFilters';

interface LicensesHeaderActionsProps {
  licenses: License[];
  departments?: string[];
  assignedManagers?: string[];
}

export default function LicensesHeaderActions({
  licenses,
  departments = [],
  assignedManagers = [],
}: LicensesHeaderActionsProps) {
  const { filters } = useLicensesFilter();

  const filteredForExport = useMemo(
    () => applyLicenseFilters(licenses, filters),
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
