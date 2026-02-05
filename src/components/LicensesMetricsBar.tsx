'use client';

import React, { useMemo } from 'react';
import {
  DollarSign,
  FileText,
  AlertTriangle,
  CheckCircle,
  IdCard,
  ChartColumnIncreasing,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { License } from '@/types/licenses';

interface LicensesMetricsBarProps {
  licenses: License[];
}

export default function LicensesMetricsBar({
  licenses,
}: LicensesMetricsBarProps) {
  const expiryDatesKey = useMemo(() => {
    return licenses
      .map(
        (license) => license.licenseExpiryDate || license.expirationDate || ''
      )
      .filter(Boolean)
      .join('|');
  }, [licenses]);

  const expiringLicenses = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const in30Days = new Date(now);
    in30Days.setDate(now.getDate() + 30);
    const in60Days = new Date(now);
    in60Days.setDate(now.getDate() + 60);
    const in90Days = new Date(now);
    in90Days.setDate(now.getDate() + 90);

    return {
      in30: licenses.filter((license) => {
        const expiryDate = license.licenseExpiryDate || license.expirationDate;
        if (!expiryDate) return false;
        const expiryStr = expiryDate.split('T')[0];
        const [year, month, day] = expiryStr.split('-').map(Number);
        const expiry = new Date(year, month - 1, day);
        expiry.setHours(0, 0, 0, 0);
        return expiry >= now && expiry <= in30Days;
      }).length,
      in60: licenses.filter((license) => {
        const expiryDate = license.licenseExpiryDate || license.expirationDate;
        if (!expiryDate) return false;
        const expiryStr = expiryDate.split('T')[0];
        const [year, month, day] = expiryStr.split('-').map(Number);
        const expiry = new Date(year, month - 1, day);
        expiry.setHours(0, 0, 0, 0);
        return expiry > in30Days && expiry <= in60Days;
      }).length,
      in90: licenses.filter((license) => {
        const expiryDate = license.licenseExpiryDate || license.expirationDate;
        if (!expiryDate) return false;
        const expiryStr = expiryDate.split('T')[0];
        const [year, month, day] = expiryStr.split('-').map(Number);
        const expiry = new Date(year, month - 1, day);
        expiry.setHours(0, 0, 0, 0);
        return expiry > in60Days && expiry <= in90Days;
      }).length,
    };
  }, [licenses, expiryDatesKey]);

  const metrics = useMemo(() => {
    let totalCost = 0;
    let activeCount = 0;
    let expiredCount = 0;
    let pendingRenewalCount = 0;
    let totalQuantity = 0;
    let usedQuantity = 0;

    licenses.forEach((license) => {
      const status = license.status || 'unknown';

      if (license.cost) {
        totalCost += license.cost;
      }

      if (status === 'active') {
        activeCount++;
      }

      if (status === 'expired') {
        expiredCount++;
      }

      if (status === 'pending_renewal') {
        pendingRenewalCount++;
      }

      if (license.quantity) {
        totalQuantity += license.quantity;
      }

      if (license.quantity && license.availableQuantity !== undefined) {
        usedQuantity += license.quantity - license.availableQuantity;
      }
    });

    const utilizationRate =
      totalQuantity > 0 ? (usedQuantity / totalQuantity) * 100 : 0;

    return {
      totalCost,
      activeCount,
      expiredCount,
      pendingRenewalCount,
      totalLicenses: licenses.length,
      totalQuantity,
      usedQuantity,
      utilizationRate,
    };
  }, [licenses]);

  const totalExpiring =
    expiringLicenses.in30 + expiringLicenses.in60 + expiringLicenses.in90;

  return (
    <section className="mb-6 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Value Card */}
        {metrics.totalCost > 0 && (
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
                  ${metrics.totalCost.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Total Licenses Card */}
        <Card className="glass-card">
          {/* Professional Cap */}
          <div className="glass-card-cap" />
          <CardContent className="p-4 pt-5">
            {/* Label with Icon */}
            <div className="flex items-center gap-1.5 mb-2">
              <FileText className="h-3 w-3 text-slate-700" />
              <p className="body-2 text-slate-700 text-sm">Total Licenses</p>
            </div>
            {/* Value Display Area */}
            <div className="glass-card-inner">
              <p className="h3 text-navy font-bold text-center">
                {metrics.totalLicenses.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Active Licenses Card */}
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
                {metrics.totalLicenses > 0
                  ? `${Math.round(
                      (metrics.activeCount / metrics.totalLicenses) * 100
                    )}% of total`
                  : 'No contracts'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Expiring Soon Card */}
        {totalExpiring > 0 && (
          <Card className="glass-card">
            <div className="glass-card-cap" />
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium sidebar-gradient-text">
                    Expiring Soon
                  </p>
                  <div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
                    <span>{totalExpiring.toLocaleString()}</span>
                    <span className="inline-block ml-2 pb-1">
                      <AlertTriangle className="h-8 w-8 text-orange" />
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {expiringLicenses.in30} in 30 days, {expiringLicenses.in60}{' '}
                    in 60 days, {expiringLicenses.in90} in 90 days
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Utilization Rate Card */}
        {metrics.totalQuantity > 0 && (
          <Card className="glass-card">
            <div className="glass-card-cap" />
            <CardContent className="p-4 pt-5">
              {/* Label with Icon */}
              <div className="flex items-center gap-1.5 mb-2">
                <ChartColumnIncreasing className="h-3 w-3 text-slate-700" />
                <p className="body-2 text-slate-700 text-sm">Utilization</p>
              </div>
              {/* Value Display Area */}
              <div className="glass-card-inner">
                <p className="h3 text-navy font-bold text-center">
                  {metrics.utilizationRate.toFixed(1)}%
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
