'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import ContractsFilter from './ContractsFilter';
import { useContractsFilter } from './ContractsView';
import ContractsExpiryModalTestButton from './ContractsExpiryModalTestButton';
import type { UIFileDoc } from '@/types/files';
import type { ContractStatus } from '@/constants/status';

interface ContractsTopControlsProps {
  files: UIFileDoc[];
  departments?: string[];
  assignedManagers?: string[];
}

export default function ContractsTopControls({
  files,
  departments = [],
  assignedManagers = [],
}: ContractsTopControlsProps) {
  const { filters, setFilters } = useContractsFilter();
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery || '');

  // Apply filters to get filtered files for export
  const filteredFilesForExport = useMemo(() => {
    return files.filter((file: UIFileDoc) => {
      // Status filter
      if (filters.status && file.status !== filters.status) {
        return false;
      }

      // Contract Type filter
      if (filters.contractType && file.contractType !== filters.contractType) {
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

      // Assigned To filter
      if (filters.assignedTo) {
        const assignedManagers = file.assignedManagers || [];
        const searchTerm = filters.assignedTo.toLowerCase();
        const hasMatch = assignedManagers.some((manager: string) =>
          manager.toLowerCase().includes(searchTerm)
        );
        if (!hasMatch) return false;
      }

      // Search query filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesName = (file.contractName || file.name || '')
          .toLowerCase()
          .includes(query);
        const matchesNumber = (file.contractNumber || '')
          .toLowerCase()
          .includes(query);
        const matchesVendor = (file.vendor || '').toLowerCase().includes(query);
        if (!matchesName && !matchesNumber && !matchesVendor) {
          return false;
        }
      }

      return true;
    });
  }, [files, filters]);

  // Export to CSV
  const handleExport = () => {
    const headers = [
      'Contract Name',
      'Contract Number',
      'Status',
      'Type',
      'Department',
      'Assigned To',
      'Expiry Date',
      'Amount',
      'Vendor',
      'Created Date',
    ];

    const rows = filteredFilesForExport.map((file) => [
      file.contractName || file.name || 'Untitled',
      file.contractNumber || '',
      file.status || '',
      file.contractType || '',
      file.department || '',
      Array.isArray(file.assignedManagers)
        ? file.assignedManagers.join(', ')
        : file.assignedManagers || '',
      file.contractExpiryDate || '',
      file.amount?.toString() || '',
      file.vendor || '',
      file.$createdAt || '',
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
      `contracts-export-${new Date().toISOString().split('T')[0]}.csv`
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

    files.forEach((file) => {
      const status: ContractStatus | 'unknown' =
        (file.status as ContractStatus) || 'unknown';

      if (status === 'active') {
        activeCount++;
      }

      if (status === 'pending-review') {
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
  }, [files]);

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
            placeholder="Search contracts..."
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
        <ContractsFilter
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
        {/* Test button for contract expiry modal - development only */}
        {process.env.NODE_ENV === 'development' && (
          <ContractsExpiryModalTestButton />
        )}
      </div>
    </div>
  );
}
