'use client';

import React, { useMemo } from 'react';
import { DollarSign, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { UIFileDoc } from '@/types/files';

interface ContractsMetricsBarProps {
  files: UIFileDoc[];
}

export default function ContractsMetricsBar({
  files,
}: ContractsMetricsBarProps) {
  // Create a dependency key from expiry dates to ensure recalculation when dates change
  const expiryDatesKey = useMemo(() => {
    return files
      .map((file) => file.contractExpiryDate || '')
      .filter(Boolean)
      .join('|');
  }, [files]);

  // Calculate expiring contracts with proper date handling
  // Recalculates whenever files change OR expiry dates change
  const expiringContracts = useMemo(() => {
    const now = new Date();
    // Set to start of day to avoid timezone issues
    now.setHours(0, 0, 0, 0);

    const in30Days = new Date(now);
    in30Days.setDate(now.getDate() + 30);
    const in60Days = new Date(now);
    in60Days.setDate(now.getDate() + 60);
    const in90Days = new Date(now);
    in90Days.setDate(now.getDate() + 90);

    return {
      in30: files.filter((file) => {
        if (!file.contractExpiryDate) return false;
        // Parse date-only strings (YYYY-MM-DD) using local timezone to avoid timezone issues
        const expiryStr = file.contractExpiryDate.split('T')[0];
        const [year, month, day] = expiryStr.split('-').map(Number);
        const expiry = new Date(year, month - 1, day);
        expiry.setHours(0, 0, 0, 0);
        return expiry >= now && expiry <= in30Days;
      }).length,
      in60: files.filter((file) => {
        if (!file.contractExpiryDate) return false;
        const expiryStr = file.contractExpiryDate.split('T')[0];
        const [year, month, day] = expiryStr.split('-').map(Number);
        const expiry = new Date(year, month - 1, day);
        expiry.setHours(0, 0, 0, 0);
        return expiry > in30Days && expiry <= in60Days;
      }).length,
      in90: files.filter((file) => {
        if (!file.contractExpiryDate) return false;
        const expiryStr = file.contractExpiryDate.split('T')[0];
        const [year, month, day] = expiryStr.split('-').map(Number);
        const expiry = new Date(year, month - 1, day);
        expiry.setHours(0, 0, 0, 0);
        return expiry > in60Days && expiry <= in90Days;
      }).length,
    };
  }, [files, expiryDatesKey]);

  // Calculate key metrics
  const metrics = useMemo(() => {
    let totalValue = 0;
    let activeCount = 0;
    let pendingCount = 0;
    let actionRequiredCount = 0;

    files.forEach((file) => {
      const status = file.status || 'unknown';

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
      totalValue,
      activeCount,
      pendingCount,
      actionRequiredCount,
      totalContracts: files.length,
    };
  }, [files]);

  const totalExpiring =
    expiringContracts.in30 + expiringContracts.in60 + expiringContracts.in90;

  // Check if any contracts have expiry dates
  const hasContractsWithExpiryDates = useMemo(() => {
    return files.some((file) => file.contractExpiryDate);
  }, [files]);

  return (
    <section className="mb-6 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Value Card */}
        {metrics.totalValue > 0 && (
          <Card className="glass-card">
            {/* Professional Cap */}
            <div className="glass-card-cap" />
            <CardContent className="p-4 pt-5">
              {/* Label with Icon */}
              <div className="flex items-center gap-1.5 mb-2">
                <DollarSign className="h-3 w-3 text-slate-700" />
                <p className="body-2 text-slate-700 text-sm">Total Value</p>
              </div>
              {/* Value Display Area */}
              <div className="glass-card-inner">
                <p className="h3 text-navy font-bold text-center">
                  ${metrics.totalValue.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Total Contracts Card */}
        <Card className="glass-card">
          {/* Professional Cap */}
          <div className="glass-card-cap" />
          <CardContent className="p-4 pt-5">
            {/* Label with Icon */}
            <div className="flex items-center gap-1.5 mb-2">
              <FileText className="h-3 w-3 text-slate-700" />
              <p className="body-2 text-slate-700 text-sm">Total Contracts</p>
            </div>
            {/* Value Display Area */}
            <div className="glass-card-inner">
              <p className="h3 text-navy font-bold text-center">
                {metrics.totalContracts.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Expiring Soon Card - Show if any contracts have expiry dates */}
        {hasContractsWithExpiryDates && (
          <Card className="glass-card">
            {/* Professional Cap */}
            <div className="glass-card-cap" />
            <CardContent className="p-4 pt-5">
              {/* Label with Icon */}
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="h-3 w-3 text-slate-700" />
                <p className="body-2 text-slate-700 text-sm">Expiring Soon</p>
              </div>
              {/* Value Display Area - 3 sections horizontally */}
              <div className="glass-card-inner">
                <div className="flex items-center justify-between gap-2">
                  {/* Next 30 days */}
                  <div className="flex-1 text-center">
                    <p className="h3 text-navy font-bold">
                      {expiringContracts.in30}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">Next 30 days</p>
                  </div>
                  {/* Divider */}
                  <div className="h-12 w-px bg-slate-300" />
                  {/* Next 60 days */}
                  <div className="flex-1 text-center">
                    <p className="h3 text-navy font-bold">
                      {expiringContracts.in60}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">Next 60 days</p>
                  </div>
                  {/* Divider */}
                  <div className="h-12 w-px bg-slate-300" />
                  {/* Next 90 days */}
                  <div className="flex-1 text-center">
                    <p className="h3 text-navy font-bold">
                      {expiringContracts.in90}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">Next 90 days</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Contracts Card */}
        <Card className="glass-card">
          {/* Professional Cap */}
          <div className="glass-card-cap" />
          <CardContent className="p-4 pt-5">
            {/* Label with Icon */}
            <div className="flex items-center gap-1.5 mb-2">
              <CheckCircle className="h-3 w-3 text-slate-700" />
              <p className="body-2 text-slate-700 text-sm">Active</p>
            </div>
            {/* Value Display Area */}
            <div className="glass-card-inner">
              <p className="h3 text-navy font-bold text-center">
                {metrics.activeCount}
              </p>
              <p className="text-xs text-slate-600 text-center mt-1.5">
                {metrics.totalContracts > 0
                  ? `${Math.round(
                      (metrics.activeCount / metrics.totalContracts) * 100
                    )}% of total`
                  : 'No contracts'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
