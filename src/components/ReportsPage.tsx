'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Eye, Calendar, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserAccessibleDepartments } from '@/lib/actions/report.actions';
import { useUnifiedAnalyticsData } from '@/hooks/useUnifiedAnalyticsData';
import ReportGenerator from './ReportGenerator';
import { Models } from 'appwrite';
import { ContractCardSkeleton } from '@/components/ui/skeletons';

type ExtendedUser = Models.User<Models.Preferences> & {
  role?: string;
  department?: string;
  fullName?: string;
};

interface ReportCard {
  id: string;
  title: string;
  department: string;
  generatedAt: string;
  generatedBy: string;
  status: 'completed' | 'generating' | 'failed';
  type: 'department' | 'executive' | 'management';
}

interface ReportsPageProps {
  department?: string;
}

const ReportsPage: React.FC<ReportsPageProps> = ({ department }) => {
  const { user } = useAuth();
  const { reports, isLoading, error, refresh } = useUnifiedAnalyticsData();

  // State declarations
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(
    department || null
  );
  const [reportGeneratorOpen, setReportGeneratorOpen] = useState(false);
  const [accessibleDepartments, setAccessibleDepartments] = useState<string[]>(
    []
  );

  // Generate report function
  const generateReport = async (department: string) => {
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.$id,
          userRole: (user as ExtendedUser)?.role || 'user',
          department: department,
          userName:
            (user as ExtendedUser)?.name || user?.email || 'Unknown User',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }
      const newReport = await response.json();

      // Refresh data
      refresh();
      return newReport.report;
    } catch (error) {
      console.error('Failed to generate report:', error);
      throw error;
    }
  };

  // Fetch accessible departments when user changes
  useEffect(() => {
    const fetchDepartments = async () => {
      if (user) {
        const departments = await getUserAccessibleDepartments(
          (user as ExtendedUser)?.role || 'user',
          (user as ExtendedUser)?.department
        );
        setAccessibleDepartments(departments);
      }
    };
    fetchDepartments();
  }, [user]);

  const handleGenerateReport = async (department: string) => {
    setSelectedDepartment(department);
    setReportGeneratorOpen(true);

    // Generate the report using the hook
    if (generateReport) {
      await generateReport(department);
    }
  };

  const handleViewReport = (report: ReportCard) => {
    // Open PDF report in a new window/tab
    const pdfUrl = `/api/reports/${report.id}/pdf`;
    const reportWindow = window.open(
      pdfUrl,
      '_blank',
      'width=800,height=600,scrollbars=yes,resizable=yes'
    );

    if (!reportWindow) {
      alert('Please allow popups to view the report.');
    }
  };

  const handleDownloadReport = async (report: ReportCard) => {
    try {
      // Fetch the PDF content from the API
      const response = await fetch(`/api/reports/${report.id}/pdf`);

      if (!response.ok) {
        throw new Error('Failed to fetch PDF report');
      }

      // Get the PDF blob
      const pdfBlob = await response.blob();

      // Create a download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${report.title
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the URL object
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report. Please try again.');
    }
  };

  const handleDeleteReport = async (reportId: string, reportTitle: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${reportTitle}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete report');
      }

      // Refresh the reports list
      refresh();
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Failed to delete report. Please try again.');
    }
  };

  // Removed fetchReportContent function as it's no longer needed for PDF functionality

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'generating':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <div className="h-8 bg-gray-200 rounded-lg w-1/3 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded-lg w-1/2 animate-pulse"></div>
        </div>

        {/* Quick Generate Section Skeleton */}
        <div className="mb-6 p-6 border rounded-lg">
          <div className="h-6 bg-gray-200 rounded-lg w-1/4 mb-4 animate-pulse"></div>
          <div className="flex flex-wrap gap-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-10 bg-gray-200 rounded-lg w-24 animate-pulse"
              ></div>
            ))}
          </div>
        </div>

        {/* Reports Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <ContractCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold sidebar-gradient-text mb-2">
              Report Generation
            </h1>
            <p className="text-gray-600">
              Generate and view comprehensive reports for your department and
              organization.
            </p>
          </div>
          {reports.length > 0 && (
            <Button
              onClick={() => setReportGeneratorOpen(true)}
              className="primary-btn"
            >
              <FileText className="h-4 w-4 mr-2" />
              Generate New Report
            </Button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <p className="text-red-600 text-sm">
              {typeof error === 'string'
                ? error
                : (error as { message?: string })?.message ||
                  'An unexpected error occurred.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quick Generate Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-700">
            <FileText className="h-5 w-5" />
            Quick Generate Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {accessibleDepartments.map((dept) => (
              <Button
                key={dept}
                variant="outline"
                onClick={() => handleGenerateReport(dept)}
                className="primary-btn"
              >
                <FileText className="h-4 w-4" />
                {dept} Report
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => {
          const reportData = report as {
            $id?: string;
            id?: string;
            title?: string;
            division?: string;
            status?: string;
            generatedAt?: string;
            userName?: string;
          };
          const reportId =
            reportData.$id || reportData.id || `report-${Math.random()}`;
          return (
            <Card key={reportId} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      {reportData.title}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {reportData.division || 'Unknown Division'}
                    </p>
                  </div>
                  <Badge
                    className={getStatusColor(reportData.status || 'completed')}
                  >
                    {reportData.status || 'completed'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    {formatDate(
                      reportData.generatedAt || new Date().toISOString()
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    Generated by: {reportData.userName || 'Unknown User'}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleViewReport({
                          id: reportId,
                          title: reportData.title || 'Untitled Report',
                          department: reportData.division || 'Unknown',
                          generatedAt:
                            reportData.generatedAt || new Date().toISOString(),
                          generatedBy: reportData.userName || 'Unknown User',
                          status:
                            (reportData.status as
                              | 'completed'
                              | 'generating'
                              | 'failed') || 'completed',
                          type: 'department' as const,
                        })
                      }
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleDownloadReport({
                          id: reportId,
                          title: reportData.title || 'Untitled Report',
                          department: reportData.division || 'Unknown',
                          generatedAt:
                            reportData.generatedAt || new Date().toISOString(),
                          generatedBy: reportData.userName || 'Unknown User',
                          status:
                            (reportData.status as
                              | 'completed'
                              | 'generating'
                              | 'failed') || 'completed',
                          type: 'department' as const,
                        })
                      }
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleDeleteReport(
                          reportId,
                          reportData.title || 'Untitled Report'
                        )
                      }
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {reports.length === 0 && (
        <Card className="flex justify-center text-center py-12">
          <CardContent>
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Reports Available
            </h3>
            <p className="text-gray-600 mb-4">
              Generate your first report to get started with analytics and
              insights.
            </p>
            <div className="flex justify-center">
              <Button
                className="primary-btn"
                onClick={() => handleGenerateReport('all')}
              >
                Generate Report
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Generator Modal */}
      <ReportGenerator
        open={reportGeneratorOpen}
        onClose={() => setReportGeneratorOpen(false)}
        department={selectedDepartment || undefined}
      />
    </div>
  );
};

export default ReportsPage;
