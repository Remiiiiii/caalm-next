'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { licenseCreateSchema } from '@/lib/api/licenses/schemas/license.schema';
import type { LicenseCreateInput } from '@/lib/api/licenses/schemas/license.schema';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import type { License } from '@/types/licenses';

interface LicenseFormProps {
  license?: License;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

const LICENSE_TYPES = [
  'perpetual',
  'subscription',
  'concurrent',
  'named_user',
  'certificate',
  'coi',
  'purchase_order',
];

const CATEGORIES = ['saas', 'on_premise', 'cloud', 'certificate', 'insurance', 'other'];

// Status enum matches database values
const STATUSES = ['active', 'inactive', 'expired', 'pending-review', 'pending_renewal', 'suspended', 'archived', 'action-required'];

export default function LicenseForm({ license, onSuccess, trigger }: LicenseFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<LicenseCreateInput>({
    resolver: zodResolver(licenseCreateSchema),
    defaultValues      : license
      ? {
          licenseName: license.licenseName,
          licenseNumber: license.licenseNumber,
          vendor: license.vendor,
          product: license.product,
          licenseType: license.licenseType,
          category: license.category,
          quantity: license.quantity,
          availableQuantity: license.availableQuantity,
          cost: license.cost,
          currencyCode: license.currencyCode || 'USD',
          issueDate: license.issueDate || license.purchaseDate,
          licenseExpiryDate: license.licenseExpiryDate || license.expirationDate,
          expirationDate: license.licenseExpiryDate || license.expirationDate, // Alias
          purchaseDate: license.issueDate || license.purchaseDate, // Alias
          renewalDate: license.renewalDate,
          autoRenew: license.autoRenew,
          renewalNoticeDays: license.renewalNoticeDays,
          issuingAuthority: license.issuingAuthority,
          division: license.division || license.department,
          department: license.division || license.department, // Alias
          assignedManagers: license.assignedManagers || license.assignedTo,
          assignedTo: license.assignedManagers || license.assignedTo, // Alias
          subDepartment: license.subDepartment,
          businessUnit: license.businessUnit,
          tags: license.tags,
          status: license.status,
          notes: license.notes,
          description: license.description,
          compliance: license.compliance,
          licenseUrl: license.licenseUrl,
          fileId: license.fileId || license.certificateFileId,
          certificateFileId: license.fileId || license.certificateFileId, // Alias
          allowsReproduction: license.allowsReproduction,
          allowsDistribution: license.allowsDistribution,
          allowsCommercialUse: license.allowsCommercialUse,
          requiresAttribution: license.requiresAttribution,
        }
      : {
          currencyCode: 'USD',
          autoRenew: false,
        },
  });

  const onSubmit = async (data: LicenseCreateInput) => {
    setIsSubmitting(true);
    try {
      const url = license
        ? `/api/licenses/${license.$id}`
        : '/api/licenses';
      const method = license ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save license');
      }

      toast({
        title: 'Success',
        description: license
          ? 'License updated successfully'
          : 'License created successfully',
      });

      setOpen(false);
      form.reset();
      router.refresh();
      onSuccess?.();
    } catch (error) {
      console.error('Error saving license:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to save license',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="primary-btn">
            <Plus className="h-4 w-4" />
            {license ? 'Edit License' : 'Add License'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[600px] p-0 max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 shadow-xl">
        <div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-indigo-50 py-4 border-b border-slate-200 mt-4">
          <div className="flex items-center gap-3 px-6">
            <DialogTitle className="text-xl font-semibold sidebar-gradient-text">
              {license ? 'Edit License' : 'Create License'}
            </DialogTitle>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="licenseName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter license name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="licenseNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="License number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vendor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor</FormLabel>
                      <FormControl>
                        <Input placeholder="Vendor name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="product"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product</FormLabel>
                    <FormControl>
                      <Input placeholder="Product name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="licenseType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Type *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {LICENSE_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currencyCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || 'USD'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="issueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="licenseExpiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiration Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="renewalDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Renewal Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="issuingAuthority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issuing Authority *</FormLabel>
                    <FormControl>
                      <Input placeholder="Issuing authority" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="division"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Division</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select division" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="administration">Administration</SelectItem>
                        <SelectItem value="c-suite">C-Suite</SelectItem>
                        <SelectItem value="management">Management</SelectItem>
                        <SelectItem value="childwelfare">Child Welfare</SelectItem>
                        <SelectItem value="behavioralhealth">Behavioral Health</SelectItem>
                        <SelectItem value="clinic">Clinic</SelectItem>
                        <SelectItem value="residential">Residential</SelectItem>
                        <SelectItem value="cins-fins-snap">CINS-FINS-SNAP</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status.replace('_', ' ').replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="compliance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Compliance</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select compliance" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="compliant">Compliant</SelectItem>
                          <SelectItem value="non-compliant">Non-Compliant</SelectItem>
                          <SelectItem value="at-risk">At Risk</SelectItem>
                          <SelectItem value="action-required">Action Required</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center gap-4">
                <FormField
                  control={form.control}
                  name="autoRenew"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Auto Renew</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="renewalNoticeDays"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Renewal Notice (days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="30"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseInt(e.target.value) : undefined
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="licenseUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License URL</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="License description"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes" rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">Required fields marked with *</div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="primary-btn px-3 sm:px-4"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="primary-btn px-3 sm:px-4"
              onClick={form.handleSubmit(onSubmit)}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {license ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
