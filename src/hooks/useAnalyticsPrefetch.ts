import { useCallback } from 'react';
import { mutate } from 'swr';
import { useAuth } from '@/contexts/AuthContext';

export const useAnalyticsPrefetch = () => {
  const { user } = useAuth();

  const prefetchAnalyticsData = useCallback(
    (department?: string) => {
      if (!user?.$id) return;

      // Prefetch reports data
      mutate(
        `/api/reports/recent?userId=${user.$id}${
          department ? `&department=${department}` : ''
        }`
      );

      // Prefetch departments data
      mutate('/api/reports/departments');

      // Prefetch templates data
      mutate('/api/reports/templates');
    },
    [user?.$id]
  );

  const prefetchDepartmentAnalytics = useCallback(
    (department: string) => {
      if (!user?.$id) return;

      // Prefetch specific department analytics
      mutate(`/api/reports/recent?userId=${user.$id}&department=${department}`);

      // Prefetch department-specific data
      mutate(`/api/analytics/${department}/stats`);
      mutate(`/api/analytics/${department}/contracts`);
      mutate(`/api/analytics/${department}/compliance`);
    },
    [user?.$id]
  );

  return {
    prefetchAnalyticsData,
    prefetchDepartmentAnalytics,
  };
};
