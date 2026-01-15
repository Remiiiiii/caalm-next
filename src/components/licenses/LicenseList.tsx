'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreVertical, Key, Calendar, DollarSign } from 'lucide-react';
import type { License } from '@/types/licenses';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import LicenseForm from './LicenseForm';
import LicenseAllocationDialog from './LicenseAllocationDialog';
import LicenseRenewalDialog from './LicenseRenewalDialog';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { useState } from 'react';

interface LicenseListProps {
  licenses: License[];
  onRefresh?: () => void;
}

export default function LicenseList({ licenses, onRefresh }: LicenseListProps) {
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showAllocate, setShowAllocate] = useState(false);
  const [showRenew, setShowRenew] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

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

  if (licenses.length === 0) {
    return (
      <div className="text-center py-12">
        <Key className="h-16 w-16 text-slate-400 mx-auto mb-4" />
        <p className="body-1 text-slate-700">No licenses found</p>
      </div>
    );
  }

  return (
    <Card className="glass-card">
      <div className="glass-card-cap" />
      <CardContent className="p-4 sm:p-6">
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 bg-slate-50">
                <TableHead className="font-semibold text-slate-700 py-4 whitespace-nowrap">
                  License Name
                </TableHead>
                <TableHead className="font-semibold text-slate-700 py-4 whitespace-nowrap">
                  Vendor
                </TableHead>
                <TableHead className="font-semibold text-slate-700 py-4 whitespace-nowrap">
                  Type
                </TableHead>
                <TableHead className="font-semibold text-slate-700 py-4 whitespace-nowrap">
                  Status
                </TableHead>
                <TableHead className="font-semibold text-slate-700 py-4 whitespace-nowrap">
                  Quantity
                </TableHead>
                <TableHead className="font-semibold text-slate-700 py-4 whitespace-nowrap">
                  Cost
                </TableHead>
                <TableHead className="font-semibold text-slate-700 py-4 whitespace-nowrap">
                  Expires
                </TableHead>
                <TableHead className="font-semibold text-slate-700 py-4 whitespace-nowrap">
                  Department
                </TableHead>
                <TableHead className="font-semibold text-slate-700 py-4 text-right whitespace-nowrap">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {licenses.map((license) => (
                <TableRow
                  key={license.$id}
                  className="border-slate-200 hover:bg-slate-50/50"
                >
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-slate-600" />
                      <span className="font-medium text-slate-900">
                        {license.licenseName}
                      </span>
                    </div>
                    {license.licenseNumber && (
                      <p className="text-xs text-slate-500 mt-1">
                        #{license.licenseNumber}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="py-4 text-slate-700">
                    {license.vendor || 'N/A'}
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge variant="outline" className="text-slate-700">
                      {license.licenseType || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4">{getStatusBadge(license.status)}</TableCell>
                  <TableCell className="py-4 text-slate-700">
                    {license.quantity !== undefined ? (
                      <div>
                        <span>{license.availableQuantity ?? license.quantity}</span>
                        {license.quantity > 0 && (
                          <span className="text-slate-500"> / {license.quantity}</span>
                        )}
                      </div>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell className="py-4 text-slate-700">
                    {formatCurrency(license.cost, license.currencyCode)}
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-slate-500" />
                      <span className="text-slate-700">
                        {formatDate(license.licenseExpiryDate || license.expirationDate)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-slate-700">
                    {license.division || license.department || 'N/A'}
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedLicense(license);
                            setShowDetail(true);
                          }}
                        >
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedLicense(license);
                            setShowEdit(true);
                          }}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedLicense(license);
                            setShowAllocate(true);
                          }}
                        >
                          Allocate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedLicense(license);
                            setShowRenew(true);
                          }}
                        >
                          Renew
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {selectedLicense && (
        <>
          {showDetail && (
            <Dialog open={showDetail} onOpenChange={setShowDetail}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogTitle>License Details</DialogTitle>
                <LicenseDetailView
                  license={selectedLicense}
                  onEdit={() => {
                    setShowDetail(false);
                    setShowEdit(true);
                  }}
                  onAllocate={() => {
                    setShowDetail(false);
                    setShowAllocate(true);
                  }}
                  onRenew={() => {
                    setShowDetail(false);
                    setShowRenew(true);
                  }}
                />
              </DialogContent>
            </Dialog>
          )}

          {showEdit && (
            <LicenseForm
              license={selectedLicense}
              onSuccess={() => {
                setShowEdit(false);
                setSelectedLicense(null);
                onRefresh?.();
              }}
            />
          )}

          {showAllocate && (
            <LicenseAllocationDialog
              license={selectedLicense}
              onSuccess={() => {
                setShowAllocate(false);
                setSelectedLicense(null);
                onRefresh?.();
              }}
            />
          )}

          {showRenew && (
            <LicenseRenewalDialog
              license={selectedLicense}
              onSuccess={() => {
                setShowRenew(false);
                setSelectedLicense(null);
                onRefresh?.();
              }}
            />
          )}
        </>
      )}
    </Card>
  );
}
