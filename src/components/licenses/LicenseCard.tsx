'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Key, Calendar, DollarSign, Building } from 'lucide-react';
import type { License } from '@/types/licenses';

interface LicenseCardProps {
  license: License;
  onClick?: () => void;
}

export default function LicenseCard({ license, onClick }: LicenseCardProps) {
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green/10 text-green">Active</Badge>;
      case 'expired':
        return <Badge className="bg-red/10 text-red">Expired</Badge>;
      case 'pending_renewal':
        return <Badge className="bg-orange/10 text-orange">Pending Renewal</Badge>;
      default:
        return <Badge className="bg-slate-200/10 text-slate-600">Unknown</Badge>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  const formatCurrency = (amount?: number, currency?: string) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  return (
    <Card
      className="glass-card hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 cursor-pointer"
      onClick={onClick}
    >
      <div className="glass-card-cap" />
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-[#0f5384]" />
            <h3 className="font-semibold text-slate-900">{license.licenseName}</h3>
          </div>
          {getStatusBadge(license.status)}
        </div>

        {license.licenseNumber && (
          <p className="text-sm text-slate-600 mb-2">#{license.licenseNumber}</p>
        )}

        <div className="space-y-2 text-sm">
          {license.vendor && (
            <div className="flex items-center gap-2 text-slate-700">
              <Building className="h-4 w-4 text-slate-500" />
              <span>{license.vendor}</span>
            </div>
          )}

          {(license.licenseExpiryDate || license.expirationDate) && (
            <div className="flex items-center gap-2 text-slate-700">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span>Expires: {formatDate(license.licenseExpiryDate || license.expirationDate)}</span>
            </div>
          )}

          {license.cost && (
            <div className="flex items-center gap-2 text-slate-700">
              <DollarSign className="h-4 w-4 text-slate-500" />
              <span>{formatCurrency(license.cost, license.currencyCode)}</span>
            </div>
          )}

          {license.quantity !== undefined && (
            <div className="text-slate-700">
              <span className="font-medium">
                {license.availableQuantity ?? license.quantity}
              </span>
              {license.quantity > 0 && (
                <span className="text-slate-500"> / {license.quantity}</span>
              )}{' '}
              licenses
            </div>
          )}

          {(license.division || license.department) && (
            <div className="text-slate-600 text-xs">{license.division || license.department}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
