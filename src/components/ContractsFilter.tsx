'use client';

import React, { useState, useMemo } from 'react';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import {
  LIFECYCLE_STATUSES,
  CONTRACT_TYPES,
} from '@/components/contract-upload/constants';
import { useContractsFilter, type ContractFilters } from './ContractsView';

import { CONTRACT_STATUS_OPTIONS } from '@/constants/status';

// Use the centralized status enum from constants
// Note: LIFECYCLE_STATUSES are separate and used for lifecycle tracking,
// while CONTRACT_STATUS_OPTIONS are the actual database enum values

const COMMON_DEPARTMENTS = [
  'IT',
  'Finance',
  'Administration',
  'Legal',
  'Operations',
  'Sales',
  'Marketing',
  'Executive',
  'Engineering',
  'HR',
  'Procurement',
];

interface ContractsFilterProps {
  departments?: string[];
  assignedManagers?: string[];
}

const ContractsFilter: React.FC<ContractsFilterProps> = ({
  departments = [],
  assignedManagers = [],
}) => {
  const { filters, setFilters } = useContractsFilter();
  const [showFilters, setShowFilters] = useState(false);

  // Combine common departments with unique departments from contracts
  const allDepartments = useMemo(() => {
    const uniqueDepts = new Set([...COMMON_DEPARTMENTS, ...departments]);
    return Array.from(uniqueDepts).sort();
  }, [departments]);

  // Combine assigned managers
  const allAssignedManagers = useMemo(() => {
    const uniqueManagers = new Set(assignedManagers);
    return Array.from(uniqueManagers).sort();
  }, [assignedManagers]);

  // Calculate active filter count
  const getActiveFiltersCount = (): number => {
    let count = 0;
    if (filters.status) count++;
    if (filters.contractType) count++;
    if (filters.uploadedOnFrom || filters.uploadedOnTo) count++;
    if (filters.expiresOnFrom || filters.expiresOnTo) count++;
    if (filters.department) count++;
    if (filters.assignedTo) count++;
    return count;
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      status: undefined,
      contractType: undefined,
      uploadedOnFrom: undefined,
      uploadedOnTo: undefined,
      expiresOnFrom: undefined,
      expiresOnTo: undefined,
      department: undefined,
      assignedTo: undefined,
      searchQuery: undefined,
    });
  };

  // Update individual filter
  const updateFilter = (key: keyof ContractFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  return (
    <Popover open={showFilters} onOpenChange={setShowFilters}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="primary-btn px-3 sm:px-4"
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filter</span>
          {getActiveFiltersCount() > 0 && (
            <Badge
              variant="secondary"
              className="ml-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {getActiveFiltersCount()}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 max-h-[55vh] flex flex-col overflow-hidden border border-slate-200 shadow-xl p-0"
        sideOffset={10}
      >
        {/* Professional Cap */}
        <div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />

        {/* Header with gradient background */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-indigo-50 py-3 border-b border-slate-200 mt-4">
          <div className="flex items-center gap-3 px-6">
            {/* Icon with circular background */}
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Filter className="w-5 h-5 text-blue-600" />
            </div>

            {/* Title */}
            <div className="flex-1">
              <h4 className="text-lg font-semibold sidebar-gradient-text">
                Filter Contracts
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Refine your contract list
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          <div className="space-y-4">
            {/* Status Filter */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Status</Label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) =>
                  updateFilter('status', value === 'all' ? undefined : value)
                }
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {CONTRACT_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contract Type Filter */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Type</Label>
              <Select
                value={filters.contractType || 'all'}
                onValueChange={(value) =>
                  updateFilter(
                    'contractType',
                    value === 'all' ? undefined : value
                  )
                }
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {CONTRACT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Uploaded On Date Range */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Uploaded On</Label>
              <div className="grid grid-cols-2 gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-left font-normal bg-white"
                      size="sm"
                    >
                      {filters.uploadedOnFrom
                        ? format(filters.uploadedOnFrom, 'MMM dd, yyyy')
                        : 'From'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.uploadedOnFrom}
                      onSelect={(date) => updateFilter('uploadedOnFrom', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-left font-normal bg-white"
                      size="sm"
                    >
                      {filters.uploadedOnTo
                        ? format(filters.uploadedOnTo, 'MMM dd, yyyy')
                        : 'To'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.uploadedOnTo}
                      onSelect={(date) => updateFilter('uploadedOnTo', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Expires On Date Range */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Expires On</Label>
              <div className="grid grid-cols-2 gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-left font-normal bg-white"
                      size="sm"
                    >
                      {filters.expiresOnFrom
                        ? format(filters.expiresOnFrom, 'MMM dd, yyyy')
                        : 'From'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.expiresOnFrom}
                      onSelect={(date) => updateFilter('expiresOnFrom', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-left font-normal bg-white"
                      size="sm"
                    >
                      {filters.expiresOnTo
                        ? format(filters.expiresOnTo, 'MMM dd, yyyy')
                        : 'To'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.expiresOnTo}
                      onSelect={(date) => updateFilter('expiresOnTo', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Department Filter */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Department</Label>
              <Select
                value={filters.department || 'all'}
                onValueChange={(value) =>
                  updateFilter(
                    'department',
                    value === 'all' ? undefined : value
                  )
                }
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {allDepartments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assigned To Filter */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Assigned To</Label>
              <Select
                value={filters.assignedTo || 'all'}
                onValueChange={(value) =>
                  updateFilter(
                    'assignedTo',
                    value === 'all' ? undefined : value
                  )
                }
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="All managers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All managers</SelectItem>
                  {allAssignedManagers.map((manager) => (
                    <SelectItem key={manager} value={manager}>
                      {manager}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Professional Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {getActiveFiltersCount() > 0
              ? `${getActiveFiltersCount()} filter${
                  getActiveFiltersCount() > 1 ? 's' : ''
                } active`
              : 'No filters applied'}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="primary-btn px-3 sm:px-4 h-8"
            disabled={getActiveFiltersCount() === 0}
          >
            Clear All
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ContractsFilter;
