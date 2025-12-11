'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ContractsFilter from './ContractsFilter';
import { useContractsFilter } from './ContractsView';
import type { UIFileDoc } from '@/types/files';

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
    <div className="flex items-center justify-between mb-3">
      {/* Search Input - Left */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search contracts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 w-full sm:w-64 bg-white border-slate-200"
        />
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
      </div>
    </div>
  );
}

