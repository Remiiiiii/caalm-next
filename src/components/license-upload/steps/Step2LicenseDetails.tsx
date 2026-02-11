/**
 * Step 2: License Details Form
 */

'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import type { Manager } from '../types';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { LICENSE_TYPES, CATEGORIES } from '../constants';
import type { LicenseUploadFormData } from '../schema';

const LICENSE_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'expired', label: 'Expired' },
  { value: 'pending-review', label: 'Pending Review' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'action-required', label: 'Action Required' },
];

const CURRENCY_CODES = ['USD', 'EUR', 'GBP', 'CAD', 'MXN', 'JPY', 'AUD'];

const DIVISIONS = [
  'administration',
  'c-suite',
  'management',
  'childwelfare',
  'behavioralhealth',
  'clinic',
  'residential',
  'cins-fins-snap',
];

export interface Step2LicenseDetailsProps {
  form: UseFormReturn<LicenseUploadFormData>;
  departments: string[];
  filteredManagers: Manager[];
  selectedManagers: string[];
  setSelectedManagers: (ids: string[]) => void;
  fetchDepartmentManagers: (department: string) => Promise<void>;
}

export default function Step2LicenseDetails({
  form,
  departments,
  filteredManagers,
  selectedManagers,
  setSelectedManagers,
  fetchDepartmentManagers,
}: Step2LicenseDetailsProps) {
  const selectedDepartment = form.watch('department');
  return (
    <div className="space-y-4">
      {/* Basic Information */}
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="licenseName"
          render={({ field }) => (
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <FormItem>
                <FormLabel className="text-sm text-slate-700 mb-1 block">
                  License Name <span className="text-red">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter license name"
                    {...field}
                    className="bg-white border-slate-300"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </div>
          )}
        />

        <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
          <FormField
            control={form.control}
            name="licenseNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-slate-700 mb-1 block">
                  License Number
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="License number"
                    {...field}
                    className="bg-white border-slate-300"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-slate-700 mb-1 block">
                  Status <span className="text-red">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-white border-slate-300">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {LICENSE_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
          <FormField
            control={form.control}
            name="licenseType"
            render={({ field }) => (
              <div className="">
                <FormItem>
                  <FormLabel className="text-sm text-slate-700 mb-1 block">
                    License Type <span className="text-red">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white border-slate-300">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LICENSE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type
                            .replace(/_/g, ' ')
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              </div>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-slate-700 mb-1 block">
                  Category
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ''}
                >
                  <FormControl>
                    <SelectTrigger className="bg-white border-slate-300">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat
                          .replace(/_/g, ' ')
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Vendor & Product */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
          <FormField
            control={form.control}
            name="vendor"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-slate-700 mb-1 block">
                  Vendor
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Vendor name"
                    {...field}
                    className="bg-white border-slate-300"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="product"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-slate-700 mb-1 block">
                  Product
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Product name"
                    {...field}
                    className="bg-white border-slate-300"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Dates */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
          <FormField
            control={form.control}
            name="issueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-slate-700 mb-1 block">
                  Issue Date
                </FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal bg-white border-slate-300"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? (
                          format(field.value, 'PPP')
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="licenseExpiryDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-slate-700 mb-1 block">
                  Expiry Date <span className="text-red">*</span>
                </FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal bg-white border-slate-300"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? (
                          format(field.value, 'PPP')
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <FormField
            control={form.control}
            name="issuingAuthority"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-slate-700 mb-1 block">
                  Issuing Authority
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Issuing authority"
                    {...field}
                    className="bg-white border-slate-300"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Financial Information */}
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-slate-700 mb-1 block">
                  Quantity
                </FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="0"
                    {...field}
                    value={field.value || ''}
                    className="bg-white border-slate-300"
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
                <FormLabel className="text-sm text-slate-700 mb-1 block">
                  Cost
                </FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="0.00"
                    {...field}
                    value={field.value || ''}
                    className="bg-white border-slate-300"
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
                <FormLabel className="text-sm text-slate-700 mb-1 block">
                  Currency
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || 'USD'}
                >
                  <FormControl>
                    <SelectTrigger className="bg-white border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CURRENCY_CODES.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Organization & Assignment */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
          <FormField
            control={form.control}
            name="division"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-slate-700 mb-1 block">
                  Division
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ''}
                >
                  <FormControl>
                    <SelectTrigger className="bg-white border-slate-300">
                      <SelectValue placeholder="Select division" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {DIVISIONS.map((div) => (
                      <SelectItem key={div} value={div}>
                        {div
                          .replace(/-/g, ' ')
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
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
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-slate-700 mb-1 block">
                  Department
                </FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    fetchDepartmentManagers(value);
                    setSelectedManagers([]);
                  }}
                  value={field.value || ''}
                >
                  <FormControl>
                    <SelectTrigger className="bg-white border-slate-300">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <FormLabel className="text-sm text-slate-700 mb-1 block">
            Assigned To
          </FormLabel>
          {!selectedDepartment ? (
            <p className="text-sm text-slate-500">
              Select a department first to see managers.
            </p>
          ) : filteredManagers.length === 0 ? (
            <p className="text-sm text-slate-500">
              No managers in the selected department.
            </p>
          ) : (
            <Select
              value={selectedManagers[0] || ''}
              onValueChange={(value) =>
                setSelectedManagers(value ? [value] : [])
              }
            >
              <SelectTrigger className="bg-white border-slate-300 mt-1">
                <SelectValue placeholder="Select manager" />
              </SelectTrigger>
              <SelectContent>
                {filteredManagers.map((manager) => (
                  <SelectItem key={manager.$id} value={manager.$id}>
                    {manager.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Renewal Settings */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
          <FormField
            control={form.control}
            name="autoRenew"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-sm text-slate-700 mb-1 block">
                  Auto-Renew
                </FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="renewalNoticeDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-slate-700 mb-1 block">
                  Renewal Notice (Days)
                </FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="30"
                    {...field}
                    value={field.value || ''}
                    className="bg-white border-slate-300"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm text-slate-700 mb-1 block">
                Description
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter license description..."
                  className="resize-none bg-white border-slate-300"
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
