'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Key,
  Calendar,
  DollarSign,
  Building,
  Tag,
  FileText,
  Users,
  RefreshCw,
} from 'lucide-react';
import type { License } from '@/types/licenses';
import LicenseForm from './LicenseForm';
import LicenseAllocationDialog from './LicenseAllocationDialog';
import LicenseRenewalDialog from './LicenseRenewalDialog';

interface LicenseDetailViewProps {
  license: License;
  onEdit?: () => void;
  onAllocate?: () => void;
  onRenew?: () => void;
}

export default function LicenseDetailView({
  license,
  onEdit,
  onAllocate,
  onRenew,
}: LicenseDetailViewProps) {
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green/10 text-green">Active</Badge>;
      case 'expired':
        return <Badge className="bg-red/10 text-red">Expired</Badge>;
      case 'pending_renewal':
        return <Badge className="bg-orange/10 text-orange">Pending Renewal</Badge>;
      case 'suspended':
        return <Badge className="bg-slate-400/10 text-slate-600">Suspended</Badge>;
      case 'archived':
        return <Badge className="bg-slate-300/10 text-slate-500">Archived</Badge>;
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
        month: 'long',
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
    <div className="space-y-6">
      <Card className="glass-card">
        <div className="glass-card-cap" />
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Key className="h-5 w-5 text-[#0f5384]" />
                <h2 className="text-xl font-semibold sidebar-gradient-text">
                  {license.licenseName}
                </h2>
              </div>
              {license.licenseNumber && (
                <p className="text-sm text-slate-600">#{license.licenseNumber}</p>
              )}
            </div>
            {getStatusBadge(license.status)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Vendor</p>
              <p className="text-sm text-slate-900">{license.vendor || 'N/A'}</p>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1">Product</p>
              <p className="text-sm text-slate-900">{license.product || 'N/A'}</p>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1">License Type</p>
              <p className="text-sm text-slate-900">
                {license.licenseType
                  ? license.licenseType.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
                  : 'N/A'}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1">Category</p>
              <p className="text-sm text-slate-900">
                {license.category
                  ? license.category.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
                  : 'N/A'}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1">Quantity</p>
              <p className="text-sm text-slate-900">
                {license.quantity !== undefined ? (
                  <>
                    {license.availableQuantity ?? license.quantity} / {license.quantity}
                  </>
                ) : (
                  'N/A'
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1">Cost</p>
              <p className="text-sm text-slate-900">
                {formatCurrency(license.cost, license.currencyCode)}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1">Issue Date</p>
              <p className="text-sm text-slate-900">{formatDate(license.issueDate || license.purchaseDate)}</p>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1">Expiration Date</p>
              <p className="text-sm text-slate-900">{formatDate(license.licenseExpiryDate || license.expirationDate)}</p>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1">Issuing Authority</p>
              <p className="text-sm text-slate-900">{license.issuingAuthority || 'N/A'}</p>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1">Renewal Date</p>
              <p className="text-sm text-slate-900">{formatDate(license.renewalDate)}</p>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1">Auto Renew</p>
              <p className="text-sm text-slate-900">{license.autoRenew ? 'Yes' : 'No'}</p>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1">Division</p>
              <p className="text-sm text-slate-900">{license.division || license.department || 'N/A'}</p>
            </div>

            {license.compliance && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Compliance</p>
                <p className="text-sm text-slate-900">{license.compliance}</p>
              </div>
            )}

            {license.licenseUrl && (
              <div>
                <p className="text-xs text-slate-500 mb-1">License URL</p>
                <a href={license.licenseUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                  {license.licenseUrl}
                </a>
              </div>
            )}

            <div>
              <p className="text-xs text-slate-500 mb-1">Business Unit</p>
              <p className="text-sm text-slate-900">{license.businessUnit || 'N/A'}</p>
            </div>
          </div>

          {license.description && (
            <div className="mt-4">
              <p className="text-xs text-slate-500 mb-1">Description</p>
              <p className="text-sm text-slate-900">{license.description}</p>
            </div>
          )}

          {license.notes && (
            <div className="mt-4">
              <p className="text-xs text-slate-500 mb-1">Notes</p>
              <p className="text-sm text-slate-900">{license.notes}</p>
            </div>
          )}

          {license.tags && license.tags.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-slate-500 mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {license.tags.map((tag, index) => (
                  <Badge key={index} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-200">
            {onEdit && (
              <LicenseForm
                license={license}
                trigger={
                  <Button variant="outline" className="primary-btn">
                    Edit
                  </Button>
                }
                onSuccess={() => {
                  onEdit();
                }}
              />
            )}
            {onAllocate && (
              <LicenseAllocationDialog
                license={license}
                onSuccess={() => {
                  onAllocate();
                }}
              />
            )}
            {onRenew && (
              <LicenseRenewalDialog
                license={license}
                onSuccess={() => {
                  onRenew();
                }}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
