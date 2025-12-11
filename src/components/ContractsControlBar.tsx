'use client';

import React, { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useContractsView } from './ContractsView';
import { ContractsViewToggle } from './ContractsViewToggle';
import Sort from './Sort';
import type { UIFileDoc } from '@/types/files';

interface ContractsControlBarProps {
  files: UIFileDoc[];
}

export default function ContractsControlBar({
  files,
}: ContractsControlBarProps) {
  const { view } = useContractsView();

  // Calculate expiring contracts
  const expiringContracts = useMemo(() => {
    const now = new Date();
    const in30Days = new Date(now);
    in30Days.setDate(now.getDate() + 30);
    const in60Days = new Date(now);
    in60Days.setDate(now.getDate() + 60);
    const in90Days = new Date(now);
    in90Days.setDate(now.getDate() + 90);

    return {
      in30: files.filter((file) => {
        if (!file.contractExpiryDate) return false;
        const expiry = new Date(file.contractExpiryDate);
        return expiry >= now && expiry <= in30Days;
      }).length,
      in60: files.filter((file) => {
        if (!file.contractExpiryDate) return false;
        const expiry = new Date(file.contractExpiryDate);
        return expiry > in30Days && expiry <= in60Days;
      }).length,
      in90: files.filter((file) => {
        if (!file.contractExpiryDate) return false;
        const expiry = new Date(file.contractExpiryDate);
        return expiry > in60Days && expiry <= in90Days;
      }).length,
    };
  }, [files]);

  // Calculate key metrics
  const metrics = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    let totalValue = 0;
    let activeCount = 0;
    let pendingCount = 0;
    let actionRequiredCount = 0;
    let inactiveCount = 0;

    files.forEach((file) => {
      const status = file.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      if (file.amount) {
        totalValue += file.amount;
      }

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
      statusCounts,
      totalValue,
      activeCount,
      pendingCount,
      actionRequiredCount,
      inactiveCount,
      totalContracts: files.length,
    };
  }, [files]);

  const totalExpiring =
    expiringContracts.in30 + expiringContracts.in60 + expiringContracts.in90;

  return (
    <div className="w-full">
      {/* Main Control Bar */}
      <div className="total-size-section">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full">
          {/* Left side: Total Value and Status Badges */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Total Value */}
            {metrics.totalValue > 0 && (
              <p className="body-1">
                Total:{' '}
                <span className="h5">
                  ${metrics.totalValue.toLocaleString()}
                </span>
              </p>
            )}

            {/* Expiring Soon Indicator */}
            {totalExpiring > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-medium text-amber-700">
                  {totalExpiring} expiring in 30/60/90 days
                </span>
              </div>
            )}

            {/* Static Status Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="!font-normal border border-slate-200 bg-[#B3EBF2] text-[#12477D]"
              >
                Active ({metrics.activeCount})
              </Badge>
              <Badge
                variant="outline"
                className="!font-normal border border-slate-200 bg-[#FFEA99] text-[#E86100]"
              >
                Pending ({metrics.pendingCount})
              </Badge>
              <Badge
                variant="outline"
                className="!font-normal border border-slate-200 bg-destructive/10 text-destructive"
              >
                Action Required ({metrics.actionRequiredCount})
              </Badge>
              {metrics.inactiveCount > 0 && (
                <Badge
                  variant="outline"
                  className="!font-normal border border-slate-200 bg-[#D3D3D3] text-[#878787]"
                >
                  Inactive ({metrics.inactiveCount})
                </Badge>
              )}
            </div>
          </div>

          {/* Right side: View, Sort */}
          <div className="sort-container">
            <ContractsViewToggle />
            <p className="body-1 hidden text-light-200 sm:block">Sort by:</p>
            <Sort />
          </div>
        </div>
      </div>
    </div>
  );
}
