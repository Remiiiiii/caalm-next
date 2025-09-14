import useSWR, { mutate } from 'swr';
import { useAuth } from '@/contexts/AuthContext';

interface ReportFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  department?: string;
  type?: string;
  status?: string;
}

interface UseReportsOptions {
  department?: string;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch report data');
  }
  return response.json();
};

export const useReports = (options: UseReportsOptions = {}) => {
  const { user } = useAuth();
  const { department } = options;

  // Reports data with department filtering
  const {
    data: reportsData,
    error: reportsError,
    isLoading: reportsLoading,
    mutate: mutateReports,
  } = useSWR(
    user?.$id
      ? `/api/reports/recent?userId=${user.$id}${
          department ? `&department=${department}` : ''
        }`
      : null,
    fetcher,
    {
      refreshInterval: 5000, // Refresh every 5 seconds (very frequent)
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 1000, // Dedupe requests within 1 second (very short)
      errorRetryCount: 3,
      errorRetryInterval: 1000, // Faster retry every 1 second
      // Force revalidation on mount
      revalidateIfStale: true,
      revalidateOnMount: true,
      keepPreviousData: false, // Don't keep stale data
    }
  );

  // Department information
  const {
    data: departmentsData,
    error: departmentsError,
    isLoading: departmentsLoading,
  } = useSWR(`/api/reports/departments`, fetcher, {
    refreshInterval: 300000, // Refresh every 5 minutes
    revalidateOnFocus: false,
    dedupingInterval: 60000, // Dedupe requests within 1 minute
  });

  // Report templates
  const {
    data: reportTemplatesData,
    error: templatesError,
    isLoading: templatesLoading,
  } = useSWR(`/api/reports/templates`, fetcher, {
    refreshInterval: 600000, // Refresh every 10 minutes
    revalidateOnFocus: false,
    dedupingInterval: 300000, // Dedupe requests within 5 minutes
  });

  // Generate report
  const generateReport = async (
    reportType: string,
    filters: ReportFilters = {}
  ) => {
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: reportType,
          filters,
          generatedBy: user?.$id,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate report');

      const newReport = (await response.json()) as { data: unknown };

      // Optimistic update
      mutateReports(
        (current: { data?: unknown[] } | undefined) => ({
          ...current,
          data: [newReport.data, ...(current?.data || [])],
        }),
        false
      );

      return newReport.data;
    } catch (error) {
      console.error('Failed to generate report:', error);
      throw error;
    }
  };

  // Export report
  const exportReport = async (
    reportId: string,
    format: 'pdf' | 'excel' | 'csv'
  ) => {
    try {
      const response = await fetch(`/api/reports/${reportId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          exportedBy: user?.$id,
        }),
      });

      if (!response.ok) throw new Error('Failed to export report');

      return response;
    } catch (error) {
      console.error('Failed to export report:', error);
      throw error;
    }
  };

  // Schedule report
  const scheduleReport = async (
    reportType: string,
    schedule: Record<string, unknown>
  ) => {
    try {
      const response = await fetch('/api/reports/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: reportType,
          schedule,
          scheduledBy: user?.$id,
        }),
      });

      if (!response.ok) throw new Error('Failed to schedule report');

      return response;
    } catch (error) {
      console.error('Failed to schedule report:', error);
      throw error;
    }
  };

  // Delete report
  const deleteReport = async (reportId: string) => {
    try {
      await fetch(`/api/reports/${reportId}`, {
        method: 'DELETE',
      });

      // Optimistic update
      mutateReports(
        (current: { data?: unknown[] } | undefined) => ({
          ...current,
          data: current?.data?.filter(
            (report) => (report as { id?: string }).id !== reportId
          ),
        }),
        false
      );
    } catch (error) {
      console.error('Failed to delete report:', error);
      throw error;
    }
  };

  // Refresh all data
  const refreshAll = () => {
    mutateReports();
    mutate(`/api/reports/departments`);
    mutate(`/api/reports/templates`);
  };

  // Prefetch data for better performance
  const prefetchReports = () => {
    if (user?.$id) {
      mutate(
        `/api/reports/recent?userId=${user.$id}${
          department ? `&department=${department}` : ''
        }`
      );
    }
  };

  return {
    // Data - match the interface expected by ReportsPage
    reports: reportsData?.data || [],
    departments: departmentsData?.data || [],
    reportTemplates: reportTemplatesData?.data || [],

    // Loading states
    isLoading: reportsLoading || departmentsLoading || templatesLoading,
    reportsLoading,
    departmentsLoading,
    templatesLoading,

    // Errors
    error: reportsError || departmentsError || templatesError,
    reportsError,
    departmentsError,
    templatesError,

    // Actions
    generateReport,
    exportReport,
    scheduleReport,
    deleteReport,
    refreshAll,
    prefetchReports,
  };
};
