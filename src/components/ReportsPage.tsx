'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Download,
  Eye,
  Calendar,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserAccessibleDepartments } from '@/lib/actions/report.actions';
import { useUnifiedAnalyticsData } from '@/hooks/useUnifiedAnalyticsData';
import ReportGenerator from './ReportGenerator';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { Models } from 'appwrite';
import { ContractCardSkeleton } from '@/components/ui/skeletons';
import Image from 'next/image';

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [generatingDepartment, setGeneratingDepartment] = useState<
    string | null
  >(null);

  // Report generation is handled by the ReportGenerator component
  // This function was removed to prevent duplicate report generation

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

  // Reset generating state when modal closes
  useEffect(() => {
    if (!reportGeneratorOpen) {
      setGeneratingDepartment(null);
    }
  }, [reportGeneratorOpen]);

  const handleGenerateReport = async (department: string) => {
    setSelectedDepartment(department);
    setReportGeneratorOpen(true);
    // Reset generating state when opening modal
    setGeneratingDepartment(null);
    // Note: Report generation is handled in ReportGenerator component
    // This function only opens the modal and sets the department
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

  const handleDeleteReport = (reportId: string, reportTitle: string) => {
    setReportToDelete({ id: reportId, title: reportTitle });
    setDeleteDialogOpen(true);
  };

  const confirmDeleteReport = async () => {
    if (!reportToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/reports/${reportToDelete.id}`, {
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
    } finally {
      setIsDeleting(false);
      setReportToDelete(null);
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
        return 'bg-green text-white shadow-sm';
      case 'generating':
        return 'bg-orange text-white shadow-sm';
      case 'failed':
        return 'bg-red text-white shadow-sm';
      default:
        return 'bg-light-300 text-light-100 shadow-sm';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'generating':
        return (
          <svg
            className="w-3 h-3 mr-1 animate-spin"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return (
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        );
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
              disabled={generatingDepartment !== null}
              className="primary-btn"
            >
              {generatingDepartment ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate New Report
                </>
              )}
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
                disabled={generatingDepartment === dept}
                className="primary-btn"
              >
                {generatingDepartment === dept ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    {dept} Report
                  </>
                )}
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
            <Card
              key={reportId}
              className="file-card hover:shadow-drop-3 transition-all duration-200 border border-light-300 bg-white/90 backdrop-blur"
            >
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                      <Image
                        src="/assets/icons/all-departments.svg"
                        alt="Report"
                        width={32}
                        height={32}
                      />
                    </div>
                  </div>
                  <Badge
                    className={getStatusColor(reportData.status || 'completed')}
                  >
                    {getStatusIcon(reportData.status || 'completed')}
                    {reportData.status || 'completed'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="flex-1 min-w-0">
                  <CardTitle className="h4 text-light-100 line-clamp-2 mb-1">
                    {reportData.title?.replace(
                      / - \d{1,2}\/\d{1,2}\/\d{4}$/,
                      ''
                    ) || 'Untitled Report'}
                  </CardTitle>
                  <p className="body-2 text-light-200 capitalize">
                    Division: {reportData.division || 'all'}
                  </p>
                </div>
                <div className="bg-light-400/30 rounded-lg p-3 border border-light-300">
                  <div className="flex items-center gap-2 body-2 text-light-100 mb-2">
                    <svg
                      className="h-4 w-4 text-blue-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="font-medium">Department:</span>
                  </div>
                  <p className="caption text-light-200 ml-6 capitalize">
                    {reportData.division === 'all'
                      ? 'All Departments'
                      : reportData.division || 'All Departments'}
                  </p>
                </div>
                <div className="bg-light-400/30 rounded-lg p-3 border border-light-300">
                  <div className="flex items-center gap-2 body-2 text-light-100 mb-2">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Generated:</span>
                  </div>
                  <p className="caption text-light-200 ml-6">
                    {formatDate(
                      reportData.generatedAt || new Date().toISOString()
                    )}
                  </p>
                </div>
                <div className="bg-light-400/30 rounded-lg p-3 border border-light-300">
                  <div className="flex items-center gap-2 body-2 text-light-100 mb-2">
                    <svg
                      className="h-4 w-4 text-blue-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="font-medium">Author:</span>
                  </div>
                  <p className="caption text-light-200 ml-6">
                    {user?.name || 'Unknown User'}
                  </p>
                </div>

                {/* Professional Action Buttons */}
                <div className="space-y-2 pt-2">
                  <div className="grid grid-cols-2 gap-1">
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
                      className="primary-btn"
                    >
                      <Eye className="h-4 w-4" />
                      View Report
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
                      className="primary-btn"
                    >
                      <Download className="h-4 w-4" />
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
                      className="primary-btn  col-span-2"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Enhanced Empty State */}
      {reports.length === 0 && (
        <Card className="file-card text-center py-12 bg-white/90 backdrop-blur border border-light-300 shadow-drop-1">
          <CardContent>
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <h3 className="h4 text-light-100 mb-2">No Reports Available</h3>
            <p className="body-1 text-light-200 mb-6 max-w-md mx-auto">
              Generate your first report to get started with analytics and
              insights.
            </p>
            <div className="flex justify-center">
              <Button
                className="primary-btn h-[52px] px-6 shadow-drop-1"
                onClick={() => handleGenerateReport('all')}
                disabled={false}
              >
                <svg
                  className="mr-3 h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
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
        user={user as ExtendedUser}
        autoCloseOnSuccess={true}
        onReportGenerated={refresh}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Report"
        description="This action cannot be undone. The report will be permanently removed from the system."
        itemName={reportToDelete?.title || ''}
        onConfirm={confirmDeleteReport}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default ReportsPage;
