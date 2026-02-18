'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useLicensesFilter } from './LicensesView';
import type { License } from '@/types/licenses';

interface LicensesTopControlsProps {
  licenses: License[];
}

export default function LicensesTopControls({
  licenses,
}: LicensesTopControlsProps) {
  const { filters, setFilters } = useLicensesFilter();
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery || '');

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

      if (status === 'pending-review' || status === 'suspended') {
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
    <div className="flex items-center justify-between flex-wrap gap-3 w-full min-w-0">
      <div className="flex items-center gap-3 flex-wrap min-w-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            aria-label="Search licenses"
            placeholder="Search licenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 min-w-56 w-full sm:w-64 bg-white border-slate-200 rounded-md"
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
