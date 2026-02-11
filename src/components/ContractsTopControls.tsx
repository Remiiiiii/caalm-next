'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useContractsFilter } from './ContractsView';
import type { UIFileDoc } from '@/types/files';
import type { ContractStatus } from '@/constants/status';

interface ContractsTopControlsProps {
  files: UIFileDoc[];
  departments?: string[];
  assignedManagers?: string[];
}

export default function ContractsTopControls({
  files,
}: ContractsTopControlsProps) {
  const { filters, setFilters } = useContractsFilter();
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery || '');

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
    <div className="flex items-center justify-between flex-wrap gap-3 w-full min-w-0">
      {/* Search Input and Badges - Left */}
      <div className="flex items-center gap-3 flex-wrap min-w-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search contracts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 min-w-md sm:w-64 bg-white border-slate-200"
          />
        </div>

        {/* Status Badges - Right of Search */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className="font-medium! border-2 border-cyan-400 bg-[#B3EBF2] text-[#12477D] hover:bg-[#9FE0E8] hover:border-cyan-500 transition-all duration-200 shadow-sm"
          >
            Active ({metrics.activeCount})
          </Badge>
          <Badge
            variant="outline"
            className="font-medium! border-2 border-amber-400 bg-[#FFEA99] text-[#E86100] hover:bg-[#FFE066] hover:border-amber-500 transition-all duration-200 shadow-sm"
          >
            Pending ({metrics.pendingCount})
          </Badge>
          <Badge
            variant="outline"
            className="font-medium! border-2 border-destructive/50 bg-destructive/10 text-destructive hover:bg-red-100 hover:border-red-500 transition-all duration-200 shadow-sm"
          >
            Action Required ({metrics.actionRequiredCount})
          </Badge>
          <Badge
            variant="outline"
            className="font-medium! border-2 border-slate-500 bg-[#D3D3D3] text-[#878787] hover:bg-[#C0C0C0] hover:border-slate-600 transition-all duration-200 shadow-sm"
          >
            Inactive ({metrics.inactiveCount})
          </Badge>
          <Badge
            variant="outline"
            className="font-medium! border-2 border-purple-600 bg-purple-50 text-purple-900 hover:bg-purple-100 hover:border-purple-700 transition-all duration-200 shadow-sm"
          >
            Expired ({metrics.expiredCount})
          </Badge>
        </div>
      </div>
    </div>
  );
}
