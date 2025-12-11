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
  totalSizeFormatted: string;
}

export default function ContractsControlBar({
  files,
  totalSizeFormatted,
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
    });

    return {
      statusCounts,
      totalValue,
      activeCount,
      pendingCount,
      actionRequiredCount,
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
          {/* Left side: Total and Count */}
          <div className="flex items-center gap-4 flex-wrap">
            <p className="body-1">
              Total: <span className="h5">{totalSizeFormatted}</span>
              <span className="body-1 text-slate-500 ml-2">
                ({metrics.totalContracts}{' '}
                {metrics.totalContracts === 1 ? 'contract' : 'contracts'})
              </span>
            </p>

            {/* Expiring Soon Indicator */}
            {totalExpiring > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-medium text-amber-700">
                  {totalExpiring} expiring in 30/60/90 days
                </span>
              </div>
            )}

            {/* Key Metrics Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {metrics.activeCount > 0 && (
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200"
                >
                  {metrics.activeCount} Active
                </Badge>
              )}
              {metrics.pendingCount > 0 && (
                <Badge
                  variant="outline"
                  className="bg-amber-50 text-amber-700 border-amber-200"
                >
                  {metrics.pendingCount} Pending
                </Badge>
              )}
              {metrics.actionRequiredCount > 0 && (
                <Badge
                  variant="outline"
                  className="bg-red-50 text-red-700 border-red-200"
                >
                  {metrics.actionRequiredCount} Action Required
                </Badge>
              )}
              {metrics.totalValue > 0 && (
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200"
                >
                  ${metrics.totalValue.toLocaleString()}
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
