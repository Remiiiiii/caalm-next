'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Key, Calendar, Users, Building2 } from 'lucide-react';
import type { License } from '@/types/licenses';
import LicenseActionDropdown from './LicenseActionDropdown';
import FormattedDateTime from '../FormattedDateTime';
import { FormattedDate } from '../FormattedDateTime';

interface LicenseCardProps {
  license: License;
  onClick?: () => void;
  onRefresh?: () => void;
}

export default function LicenseCard({
  license,
  onClick,
  onRefresh,
}: LicenseCardProps) {
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="border-2 border-cyan-400 bg-[#B3EBF2] text-[#12477D] text-xs rounded-xl font-medium">
            Active
          </Badge>
        );
      case 'expired':
        return (
          <Badge className="border-2 border-purple-600 bg-purple-50 text-purple-900 text-xs rounded-xl font-medium">
            Expired
          </Badge>
        );
      case 'pending_renewal':
      case 'pending-review':
        return (
          <Badge className="border-2 border-amber-400 bg-[#FFEA99] text-[#E86100] text-xs rounded-xl font-medium">
            Pending
          </Badge>
        );
      case 'action-required':
        return (
          <Badge className="border-2 border-red-400 bg-destructive/10 text-destructive text-xs rounded-xl font-medium">
            Action Required
          </Badge>
        );
      case 'inactive':
        return (
          <Badge className="border-2 border-slate-500 bg-[#D3D3D3] text-[#878787] text-xs rounded-xl font-medium">
            Inactive
          </Badge>
        );
      case 'suspended':
        return (
          <Badge className="border-2 border-slate-400 bg-slate-300 text-slate-700 text-xs rounded-xl font-medium">
            Suspended
          </Badge>
        );
      case 'archived':
        return (
          <Badge className="border-2 border-slate-300 bg-slate-200 text-slate-600 text-xs rounded-xl font-medium">
            Archived
          </Badge>
        );
      default:
        return (
          <Badge className="border-2 border-slate-200 bg-slate-100 text-slate-800 text-xs rounded-xl font-medium">
            Unknown
          </Badge>
        );
    }
  };

  return (
    <Card
      className="glass-card hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
      onClick={onClick}
    >
      <div className="glass-card-cap" />
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Key className="h-5 w-5 text-[#0f5384] flex-shrink-0" />
            <h3 className="font-semibold text-slate-900 truncate">
              {license.licenseName}
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {getStatusBadge(license.status)}
            <div onClick={(e) => e.stopPropagation()}>
              <LicenseActionDropdown
                license={license}
                onRefresh={onRefresh}
              />
            </div>
          </div>
        </div>

        {license.licenseNumber && (
          <p className="text-sm text-slate-600 mb-3">#{license.licenseNumber}</p>
        )}

        <div className="space-y-2 text-sm">
          {license.issueDate && (
            <div className="flex items-center gap-2 text-slate-700">
              <Calendar className="h-4 w-4 text-slate-500 flex-shrink-0" />
              <span className="text-xs">
                Issued:{' '}
                <FormattedDate date={license.issueDate} className="inline" />
              </span>
            </div>
          )}

          {(license.licenseExpiryDate || license.expirationDate) && (
            <div className="flex items-center gap-2 text-slate-700">
              <Calendar className="h-4 w-4 text-slate-500 flex-shrink-0" />
              <span className="text-xs">
                Expires:{' '}
                <FormattedDate
                  date={license.licenseExpiryDate || license.expirationDate}
                  className="inline"
                />
              </span>
            </div>
          )}

          {license.assignedManagers &&
            Array.isArray(license.assignedManagers) &&
            license.assignedManagers.length > 0 && (
              <div className="flex items-center gap-2 text-slate-700">
                <Users className="h-4 w-4 text-slate-500 flex-shrink-0" />
                <span className="text-xs truncate">
                  {license.assignedManagers.length}{' '}
                  {license.assignedManagers.length === 1
                    ? 'manager'
                    : 'managers'}
                </span>
              </div>
            )}

          {(license.division || license.department) && (
            <div className="flex items-center gap-2 text-slate-600">
              <Building2 className="h-4 w-4 text-slate-500 flex-shrink-0" />
              <span className="text-xs">
                {license.division || license.department}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
