import useSWR, { mutate } from 'swr';
import { useAuth } from '@/contexts/AuthContext';

interface DepartmentInfo {
  $id: string;
  name: string;
  code: string;
  userCount: number;
  contractCount: number;
  activeContracts: number;
  expiringContracts: number;
}

interface ReportData {
  $id: string;
  type: 'contract' | 'user' | 'compliance' | 'financial';
  title: string;
  data: any;
  generatedAt: string;
  generatedBy: string;
  department?: string;
}

interface ReportFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  department?: string;
  type?: string;
  status?: string;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch report data');
  }
  return response.json();
};

export const useReports = () => {
  const { user } = useAuth();

  // Department information
  const {
    data: departments,
    error: departmentsError,
    isLoading: departmentsLoading,
  } = useSWR(`/api/reports/departments`, fetcher, {
    refreshInterval: 300000, // Refresh every 5 minutes
    revalidateOnFocus: true,
  });

  // Recent reports
  const {
    data: recentReports,
    error: reportsError,
    isLoading: reportsLoading,
  } = useSWR(
    user?.$id ? `/api/reports/recent?userId=${user.$id}` : null,
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute
    }
  );

  // Report templates
  const {
    data: reportTemplates,
    error: templatesError,
    isLoading: templatesLoading,
  } = useSWR(`/api/reports/templates`, fetcher, {
    refreshInterval: 600000, // Refresh every 10 minutes
  });

  // Generate report
  const generateReport = async (reportType: string, filters: ReportFilters) => {
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

      // Optimistic update
      mutate(
        `/api/reports/recent?userId=${user?.$id}`,
        (current: ReportData[]) => [response.data, ...(current || [])],
        false
      );

      return response.data;
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
  const scheduleReport = async (reportType: string, schedule: any) => {
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

      return response.data;
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
      mutate(
        `/api/reports/recent?userId=${user?.$id}`,
        (current: ReportData[]) =>
          current?.filter((report) => report.$id !== reportId),
        false
      );
    } catch (error) {
      console.error('Failed to delete report:', error);
      throw error;
    }
  };

  // Refresh all data
  const refreshAll = () => {
    mutate(`/api/reports/departments`);
    mutate(`/api/reports/recent?userId=${user?.$id}`);
    mutate(`/api/reports/templates`);
  };

  return {
    // Data
    departments: departments?.data || [],
    recentReports: recentReports?.data || [],
    reportTemplates: reportTemplates?.data || [],

    // Loading states
    isLoading: departmentsLoading || reportsLoading || templatesLoading,
    departmentsLoading,
    reportsLoading,
    templatesLoading,

    // Errors
    error: departmentsError || reportsError || templatesError,
    departmentsError,
    reportsError,
    templatesError,

    // Actions
    generateReport,
    exportReport,
    scheduleReport,
    deleteReport,
    refreshAll,
  };
};
