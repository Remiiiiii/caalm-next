import React from 'react';
import { Skeleton } from './skeleton';
import { Card, CardContent, CardHeader } from './card';

// Skeleton for stat cards
export const StatCardSkeleton = () => (
  <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </CardContent>
  </Card>
);

// Skeleton for contract cards
export const ContractCardSkeleton = () => (
  <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
    <CardContent className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-4 w-32" />
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-8 w-16" />
      </div>
    </CardContent>
  </Card>
);

// Skeleton for activity items
export const ActivityItemSkeleton = () => (
  <div className="flex justify-between items-start border-b border-border pb-2 last:border-b-0">
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-24" />
    </div>
    <Skeleton className="h-3 w-16" />
  </div>
);

// Skeleton for table rows
export const TableRowSkeleton = ({ columns = 5 }: { columns?: number }) => (
  <tr className="border-b text-center hover:bg-gray-50 transition-all duration-300">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-4 py-2">
        <Skeleton className="h-4 w-16 mx-auto" />
      </td>
    ))}
  </tr>
);

// Skeleton for file list items
export const FileItemSkeleton = () => (
  <div className="border border-border rounded-lg p-4">
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-6 w-16" />
    </div>
  </div>
);

// Skeleton for user cards
export const UserCardSkeleton = () => (
  <div className="flex items-center space-x-3 p-3 border rounded-lg">
    <Skeleton className="h-10 w-10 rounded-full" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-24" />
    </div>
    <Skeleton className="h-6 w-16" />
  </div>
);

// Skeleton for calendar events
export const CalendarEventSkeleton = () => (
  <div className="flex items-start gap-3 p-3 bg-white border-l-4 rounded-lg border border-slate-200">
    <Skeleton className="w-1 h-full rounded-full flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-3 w-24" />
    </div>
  </div>
);

// Skeleton for form fields
export const FormFieldSkeleton = () => (
  <div className="space-y-2">
    <Skeleton className="h-4 w-20" />
    <Skeleton className="h-10 w-full" />
  </div>
);

// Skeleton for search results
export const SearchResultSkeleton = () => (
  <div className="space-y-4">
    <div className="flex items-center gap-3">
      <Skeleton className="h-8 w-8 rounded" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-6 w-20" />
    </div>
  </div>
);

// Skeleton for notification items
export const NotificationItemSkeleton = () => (
  <div className="flex items-start space-x-3 p-3 border-b border-gray-200 last:border-b-0">
    <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-20" />
    </div>
    <Skeleton className="h-4 w-4 rounded-full" />
  </div>
);

// Skeleton for chart containers
export const ChartSkeleton = () => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-8 w-24" />
    </div>
    <Skeleton className="h-64 w-full" />
    <div className="flex justify-center space-x-4">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-16" />
    </div>
  </div>
);

// Skeleton for department cards
export const DepartmentCardSkeleton = () => {
  // Use fixed array to prevent hydration mismatches
  const stats = [1, 2, 3, 4];

  return (
    <Card className="bg-white/95 backdrop-blur border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] rounded-xl overflow-hidden">
      <CardHeader className="pb-4 px-6 pt-6">
        <div className="flex items-start space-x-4">
          <Skeleton className="h-12 w-12 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-6 pb-6">
        <div className="grid grid-cols-2 gap-3">
          {stats.map((i) => (
            <div
              key={i}
              className="text-center p-3 bg-gray-50 rounded-lg min-h-[80px] flex flex-col justify-center"
            >
              <Skeleton className="h-6 w-8 mx-auto mb-1" />
              <Skeleton className="h-3 w-12 mx-auto" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Skeleton for pagination
export const PaginationSkeleton = () => {
  const pages = [1, 2, 3, 4, 5];

  return (
    <div className="flex justify-center items-center space-x-2">
      {pages.map((i) => (
        <Skeleton key={i} className="h-8 w-8" />
      ))}
    </div>
  );
};

// Skeleton for tabs
export const TabsSkeleton = ({ count = 5 }: { count?: number }) => {
  // Use a fixed array to prevent hydration mismatches
  const tabs = [1, 2, 3, 4, 5].slice(0, count);

  return (
    <div className="flex w-full bg-white/20 backdrop-blur border border-white/40 rounded-lg p-1">
      {tabs.map((i) => (
        <Skeleton key={i} className="flex-1 h-10 rounded-md mx-1" />
      ))}
    </div>
  );
};

// Skeleton for breadcrumbs
export const BreadcrumbSkeleton = () => (
  <div className="flex items-center space-x-2">
    <Skeleton className="h-4 w-16" />
    <Skeleton className="h-4 w-4" />
    <Skeleton className="h-4 w-20" />
    <Skeleton className="h-4 w-4" />
    <Skeleton className="h-4 w-24" />
  </div>
);

// Skeleton for sidebar items
export const SidebarItemSkeleton = () => (
  <div className="flex items-center space-x-3 p-2 rounded-lg">
    <Skeleton className="h-5 w-5" />
    <Skeleton className="h-4 w-24" />
  </div>
);

// Skeleton for modal content
export const ModalSkeleton = () => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-48" />
    </div>
    <div className="space-y-3">
      <FormFieldSkeleton />
      <FormFieldSkeleton />
      <FormFieldSkeleton />
    </div>
    <div className="flex justify-end space-x-2">
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-8 w-20" />
    </div>
  </div>
);
