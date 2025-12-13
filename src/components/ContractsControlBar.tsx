'use client';

import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { ContractsViewToggle } from './ContractsViewToggle';
import Sort from './Sort';
import type { UIFileDoc } from '@/types/files';

interface ContractsControlBarProps {
  files: UIFileDoc[];
}

export default function ContractsControlBar({
  files,
}: ContractsControlBarProps) {
  // Calculate key metrics for status badges
  const metrics = useMemo(() => {
    let activeCount = 0;
    let pendingCount = 0;
    let actionRequiredCount = 0;
    let inactiveCount = 0;

    files.forEach((file) => {
      const status = file.status || 'unknown';

      if (status === 'active') {
        activeCount++;
      }

      if (status === 'pending-review' || status === 'under_review') {
        pendingCount++;
      }

      if (status === 'action-required') {
        actionRequiredCount++;
      }

      if (status === 'inactive') {
        inactiveCount++;
      }
    });

    return {
      activeCount,
      pendingCount,
      actionRequiredCount,
      inactiveCount,
    };
  }, [files]);

  return (
    <div className="w-full">
      {/* Main Control Bar */}
      <div className="relative border border-slate-200 shadow-lg bg-white rounded-lg overflow-hidden">
        {/* Professional Cap */}
        <div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-lg" />

        {/* Control Bar Content */}
        <div className="bg-slate-50 pt-6 pb-4 px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between w-full">
            {/* Left side: Status Badges */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Status Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className="!font-medium border-2 border-cyan-200 bg-[#B3EBF2] text-[#12477D] hover:bg-[#9FE0E8] hover:border-cyan-300 transition-all duration-200 shadow-sm"
                >
                  Active ({metrics.activeCount})
                </Badge>
                <Badge
                  variant="outline"
                  className="!font-medium border-2 border-amber-200 bg-[#FFEA99] text-[#E86100] hover:bg-[#FFE066] hover:border-amber-300 transition-all duration-200 shadow-sm"
                >
                  Pending ({metrics.pendingCount})
                </Badge>
                <Badge
                  variant="outline"
                  className="!font-medium border-2 border-destructive/10 bg-destructive/10 text-destructive hover:bg-red-100 hover:border-red-300 transition-all duration-200 shadow-sm"
                >
                  Action Required ({metrics.actionRequiredCount})
                </Badge>
                {metrics.inactiveCount > 0 && (
                  <Badge
                    variant="outline"
                    className="!font-medium border-2 border-slate-300 bg-[#D3D3D3] text-[#878787] hover:bg-[#C0C0C0] hover:border-slate-400 transition-all duration-200 shadow-sm"
                  >
                    Inactive ({metrics.inactiveCount})
                  </Badge>
                )}
              </div>
            </div>

            {/* Right side: View, Sort */}
            <div className="flex items-center gap-4 flex-wrap">
              <ContractsViewToggle />
              <div className="flex items-center gap-2">
                <p className="body-1 hidden text-slate-700 sm:block font-medium">
                  Sort by:
                </p>
                <Sort />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
