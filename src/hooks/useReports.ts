import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Models } from 'appwrite';

type ExtendedUser = Models.User<Models.Preferences> & {
  role?: string;
  department?: string;
  fullName?: string;
};

export interface Report {
  id: string;
  title: string;
  department: string;
  generatedAt: string;
  generatedBy: string;
  status: 'completed' | 'generating' | 'failed';
  type: 'department' | 'executive' | 'management';
}

interface UseReportsOptions {
  department?: string;
  limit?: number;
}

export function useReports(options: UseReportsOptions = {}) {
  const { user } = useAuth();
  const extendedUser = user as ExtendedUser;
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        userRole: extendedUser.role || 'user',
        userDepartment: extendedUser.department || '',
        ...(options.department && { department: options.department }),
        ...(options.limit && { limit: options.limit.toString() }),
      });

      const response = await fetch(`/api/reports?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }

      const data = await response.json();
      setReports(data.reports || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reports');
      console.error('Error fetching reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateReport = async (department: string) => {
    if (!user) return null;

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.$id,
          userRole: extendedUser.role || 'user',
          department,
          userName: extendedUser.fullName || user.email || 'Unknown User',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const data = await response.json();

      // Add the new report to the list
      setReports((prev) => [data.report, ...prev]);

      return data.report;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate report'
      );
      console.error('Error generating report:', err);
      return null;
    }
  };

  useEffect(() => {
    fetchReports();
  }, [user, options.department]);

  return {
    reports,
    isLoading,
    error,
    fetchReports,
    generateReport,
  };
}
