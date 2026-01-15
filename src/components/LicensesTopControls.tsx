'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import LicensesFilter from './LicensesFilter';
import { useLicensesFilter } from './LicensesView';
import type { License } from '@/types/licenses';

interface LicensesTopControlsProps {
  licenses: License[];
  departments?: string[];
  assignedManagers?: string[];
}

const LICENSE_TYPES = [
  'perpetual',
  'subscription',
  'concurrent',
  'named_user',
  'certificate',
  'coi',
  'purchase_order',
];

const CATEGORIES = [
  'saas',
  'on_premise',
  'cloud',
  'certificate',
  'insurance',
  'other',
];

export default function LicensesTopControls({
  licenses,
  departments = [],
  assignedManagers = [],
}: LicensesTopControlsProps) {
  const { filters, setFilters } = useLicensesFilter();
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery || '');

  // Apply filters to get filtered licenses for export
  const filteredLicensesForExport = useMemo(() => {
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

      // Assigned To filter
      if (filters.assignedTo) {
        const assignedManagers = license.assignedManagers || [];
        const searchTerm = filters.assignedTo.toLowerCase();
        const hasMatch = assignedManagers.some((manager: string) =>
          manager.toLowerCase().includes(searchTerm)
        );
        if (!hasMatch) return false;
      }

      // Search query filter
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

  // Export to CSV
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

    const rows = filteredLicensesForExport.map((license) => [
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
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `licenses-export-${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate key metrics for status badges
  const metrics = useMemo(() => {
    let activeCount = 0;
    let pendingCount = 0;
    let actionRequiredCount = 0;
    let inactiveCount = 0;
    let expiredCount = 0;

    licenses.forEach((license) => {
      const status = license.status || 'unknown';

      if (status === 'active') {
        activeCount++;
      }

      if (status === 'pending-review' || status === 'pending_renewal') {
        pendingCount++;
      }

      if (status === 'action-required') {
        actionRequiredCount++;
      }

      if (status === 'inactive') {
        inactiveCount++;
      }

      if (status === 'expired') {
        expiredCount++;
      }
    });

    return {
      activeCount,
      pendingCount,
      actionRequiredCount,
      inactiveCount,
      expiredCount,
    };
  }, [licenses]);

  // Update filters with search query
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFilters((prev) => ({
        ...prev,
        searchQuery: searchQuery.trim() || undefined,
      }));
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery, setFilters]);

  return (
    <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
      {/* Search Input and Badges - Left */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search licenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-full sm:w-64 bg-white border-slate-200"
          />
        </div>

        {/* Status Badges - Right of Search */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className="!font-medium border-2 border-cyan-400 bg-[#B3EBF2] text-[#12477D] hover:bg-[#9FE0E8] hover:border-cyan-500 transition-all duration-200 shadow-sm"
          >
            Active ({metrics.activeCount})
          </Badge>
          <Badge
            variant="outline"
            className="!font-medium border-2 border-amber-400 bg-[#FFEA99] text-[#E86100] hover:bg-[#FFE066] hover:border-amber-500 transition-all duration-200 shadow-sm"
          >
            Pending ({metrics.pendingCount})
          </Badge>
          <Badge
            variant="outline"
            className="!font-medium border-2 border-destructive/50 bg-destructive/10 text-destructive hover:bg-red-100 hover:border-red-500 transition-all duration-200 shadow-sm"
          >
            Action Required ({metrics.actionRequiredCount})
          </Badge>
          <Badge
            variant="outline"
            className="!font-medium border-2 border-slate-500 bg-[#D3D3D3] text-[#878787] hover:bg-[#C0C0C0] hover:border-slate-600 transition-all duration-200 shadow-sm"
          >
            Inactive ({metrics.inactiveCount})
          </Badge>
          <Badge
            variant="outline"
            className="!font-medium border-2 border-purple-600 bg-purple-50 text-purple-900 hover:bg-purple-100 hover:border-purple-700 transition-all duration-200 shadow-sm"
          >
            Expired ({metrics.expiredCount})
          </Badge>
        </div>
      </div>

      {/* Filter and Export - Right */}
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
    </div>
  );
}
