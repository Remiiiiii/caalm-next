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

  return (
    <section className="mb-6 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Value Card */}
        {metrics.totalValue > 0 && (
          <Card className="relative border border-slate-200 shadow-lg bg-white rounded-lg overflow-hidden">
            {/* Professional Cap */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-[#d6d7d8] opacity-70 rounded-t-lg" />
            <CardContent className="p-4 bg-slate-50 pt-5">
              {/* Label with Icon */}
              <div className="flex items-center gap-1.5 mb-2">
                <DollarSign className="h-3 w-3 text-slate-700" />
                <p className="body-2 text-slate-700 text-sm">Total Value</p>
              </div>
              {/* Value Display Area */}
              <div className="bg-white rounded-lg border border-slate-300 p-3">
                <p className="h3 text-navy font-bold text-center">
                  ${metrics.totalValue.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Total Contracts Card */}
        <Card className="relative border border-slate-200 shadow-lg bg-white rounded-lg overflow-hidden">
          {/* Professional Cap */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-[#d6d7d8] opacity-70 rounded-t-lg" />
          <CardContent className="p-4 bg-slate-50 pt-5">
            {/* Label with Icon */}
            <div className="flex items-center gap-1.5 mb-2">
              <FileText className="h-3 w-3 text-slate-700" />
              <p className="body-2 text-slate-700 text-sm">Total Contracts</p>
            </div>
            {/* Value Display Area */}
            <div className="bg-white rounded-lg border border-slate-300 p-3">
              <p className="h3 text-navy font-bold text-center">
                {metrics.totalContracts.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Expiring Soon Card */}
        {totalExpiring > 0 && (
          <Card className="relative border border-slate-200 shadow-lg bg-white rounded-lg overflow-hidden">
            {/* Professional Cap */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-[#d6d7d8] opacity-70 rounded-t-lg" />
            <CardContent className="p-4 bg-slate-50 pt-5">
              {/* Label with Icon */}
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="h-3 w-3 text-slate-700" />
                <p className="body-2 text-slate-700 text-sm">Expiring Soon</p>
              </div>
              {/* Value Display Area */}
              <div className="bg-white rounded-lg border border-slate-300 p-3">
                <p className="h3 text-navy font-bold text-center">
                  {totalExpiring}
                </p>
                <p className="text-xs text-slate-600 text-center mt-1.5">
                  Next 90 days
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Contracts Card */}
        <Card className="relative border border-slate-200 shadow-lg bg-white rounded-lg overflow-hidden">
          {/* Professional Cap */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-[#d6d7d8] opacity-70 rounded-t-lg" />
          <CardContent className="p-4 bg-slate-50 pt-5">
            {/* Label with Icon */}
            <div className="flex items-center gap-1.5 mb-2">
              <CheckCircle className="h-3 w-3 text-slate-700" />
              <p className="body-2 text-slate-700 text-sm">Active</p>
            </div>
            {/* Value Display Area */}
            <div className="bg-white rounded-lg border border-slate-300 p-3">
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
