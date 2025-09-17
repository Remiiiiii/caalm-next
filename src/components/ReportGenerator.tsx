'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw,
  Download,
  Upload,
  Share2,
  Plus,
  Trash2,
} from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { Models } from 'appwrite';
import {
  generateReport,
  downloadReport,
  uploadReport,
  type ReportData,
} from '@/lib/actions/report.actions';
import Image from 'next/image';

type ExtendedUser = Models.User<Models.Preferences> & {
  role?: string;
  fullName?: string;
  department?: string;
};

interface ReportGeneratorProps {
  open: boolean;
  onClose: () => void;
  department?: string;
  user?: ExtendedUser | null;
  autoCloseOnSuccess?: boolean;
  onReportGenerated?: () => void;
}

import { CONTRACT_DEPARTMENTS } from '../../constants';

const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  open,
  onClose,
  department,
  user,
  autoCloseOnSuccess = false,
  onReportGenerated,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState(
    department || ''
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Update selected department when prop changes
  useEffect(() => {
    setSelectedDepartment(department || '');
  }, [department]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      // Reset states when modal opens
      setIsGenerating(false);
      setError(null);
      setReport(null);
      setDeleteDialogOpen(false);
      setIsDeleting(false);
    }
  }, [open]);

  const handleGenerateReport = async () => {
    if (!user) return;

    setIsGenerating(true);
    setError(null);

    try {
      const reportData = await generateReport({
        userId: user.$id,
        userRole: user?.role || 'user',
        department: selectedDepartment || 'All',
        userName: user?.fullName || user?.email || 'Unknown User',
      });

      setReport(reportData);

      // Notify parent component that report was generated
      if (onReportGenerated) {
        onReportGenerated();
      }

      // Auto-close modal if enabled and report generation was successful
      if (autoCloseOnSuccess) {
        setTimeout(() => {
          onClose();
        }, 1500); // Small delay to show the success state
      }
    } catch (err) {
      setError('Failed to generate report. Please try again.');
      console.error('Report generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!report) return;

    try {
      await downloadReport(report.$id, report.title);
    } catch (err) {
      setError('Failed to download report. Please try again.');
      console.error('Download error:', err);
    }
  };

  const handleUploadReport = async () => {
    if (!report) return;

    try {
      await uploadReport(report.$id, report.title, user?.$id);
      setError(null);
    } catch (err) {
      setError('Failed to upload report. Please try again.');
      console.error('Upload error:', err);
    }
  };

  const handleShareReport = async () => {
    if (!report) return;

    try {
      // Implement sharing functionality
      await navigator.share?.({
        title: report.title,
        text: `Report: ${report.title}`,
        url: window.location.href,
      });
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  const handleGenerateAnother = () => {
    // Reset all states for a fresh start
    setReport(null);
    setError(null);
    setIsGenerating(false);
    setDeleteDialogOpen(false);
    setIsDeleting(false);
  };

  const handleDeleteReport = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDeleteReport = async () => {
    if (!report) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/reports/${report.$id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete report');
      }

      // Reset the report state
      setReport(null);
      setError(null);
    } catch (err) {
      setError('Failed to delete report. Please try again.');
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-[26px] max-w-4xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur border border-white/40 shadow-drop-3 px-8 py-10">
        <DialogHeader className="text-center border-b border-light-300 pb-6 mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
              <svg
                className="w-5 h-5 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <DialogTitle className="h2 sidebar-gradient-text">
              Report Generator
            </DialogTitle>
          </div>
          <p className="body-1 text-light-200 max-w-2xl mx-auto">
            Generate comprehensive contract, audit, license, compliance, and
            other reports with AI-powered insights
          </p>
        </DialogHeader>

        <div className="space-y-8">
          {/* Report Generation Section */}
          <Card className="border border-light-300 shadow-drop-1 rounded-xl bg-white/80 backdrop-blur overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-light-300 to-light-400 border-b border-light-300">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shadow-md">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path
                      fillRule="evenodd"
                      d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm2.5 7a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm2.45.75a2.5 2.5 0 10-4.9 0h4.9zM12 9a1 1 0 100 2h3a1 1 0 100-2h-3z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <CardTitle className="h4 text-light-100">
                    Report for all departments
                  </CardTitle>
                  {/* <p className="body-2 text-light-200">
                    Configure your professional compliance report
                  </p> */}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {/* Department Selection */}
              <div className="bg-light-400/30 rounded-xl p-6 border border-light-300">
                <div className="flex items-center gap-2 mb-4">
                  <Image
                    src="/assets/icons/department.svg"
                    alt="Department Selection"
                    width={24}
                    height={24}
                  />
                  <h3 className="subtitle-1 text-light-100">
                    Department Selection
                  </h3>
                  <Badge
                    variant="secondary"
                    className="bg-light-300 text-light-100 ml-auto"
                  >
                    {user?.role === 'executive'
                      ? 'Executive Access'
                      : 'Standard User'}
                  </Badge>
                </div>

                {user?.role === 'executive' ? (
                  <div className="grid grid-cols-2 gap-3">
                    {CONTRACT_DEPARTMENTS.map((dept) => (
                      <label
                        key={dept}
                        className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                          selectedDepartment === dept
                            ? 'border-blue-500 bg-blue-50/50 shadow-md'
                            : 'border-light-300 bg-white/50 hover:border-blue-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="department"
                          value={dept}
                          checked={selectedDepartment === dept}
                          onChange={(e) =>
                            setSelectedDepartment(e.target.value)
                          }
                          className="w-4 h-4 text-blue-600 bg-light-300 border-light-300 focus:ring-blue-500 focus:ring-2"
                        />
                        <span className="body-2 text-light-100 font-medium">
                          {dept}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white/50 rounded-lg p-4 border border-light-300">
                    <p className="body-2 text-light-100 text-center">
                      <span className="font-medium">Selected Department:</span>{' '}
                      {selectedDepartment
                        ? `${selectedDepartment} Departments (default)`
                        : 'All Departments'}
                    </p>
                  </div>
                )}
              </div>

              {/* Generate Button */}
              <div className="flex justify-center pt-4">
                <Button
                  onClick={handleGenerateReport}
                  disabled={
                    isGenerating ||
                    (user?.role === 'executive' && !selectedDepartment)
                  }
                  className="primary-btn h-[52px] px-8 shadow-drop-1 text-white font-semibold"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="mr-3 h-5 w-5 animate-spin" />
                      <span>Generating Report...</span>
                    </>
                  ) : (
                    <>
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
                      <span>Generate Report</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="border-red-200 bg-red-50/80 backdrop-blur shadow-drop-1 rounded-xl overflow-hidden">
              <CardHeader className="bg-red-100/50 border-b border-red-200 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <CardTitle className="h5 text-red-700">
                    Report Generation Failed
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-red-600 body-2">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Generated Report Display */}
          {report && (
            <Card className="border border-light-300 shadow-drop-1 rounded-xl bg-gradient-to-br from-white/90 to-blue-50/80 backdrop-blur">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-xl">
                <CardTitle className="h4 text-white flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Professional Report Generated
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                {/* Report Header */}
                <div className="bg-white/60 rounded-xl p-6 border border-light-300 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <svg
                          className="w-5 h-5 text-blue-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                          <path
                            fillRule="evenodd"
                            d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <h3 className="h4 text-light-100">{report.title}</h3>
                      </div>
                      <p className="body-2 text-light-200">
                        Generated on{' '}
                        {new Date(report.generatedAt).toLocaleDateString(
                          'en-US',
                          {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }
                        )}
                      </p>
                    </div>
                    <Badge
                      variant={
                        report.status === 'completed' ? 'default' : 'secondary'
                      }
                      className={
                        report.status === 'completed'
                          ? 'bg-green text-white px-3 py-1'
                          : 'bg-light-300 text-light-100 px-3 py-1'
                      }
                    >
                      {report.status === 'completed'
                        ? '✓ Complete'
                        : report.status}
                    </Badge>
                  </div>
                </div>

                {/* Professional Metrics Summary */}
                <div className="bg-light-400/20 rounded-xl p-6 border border-light-300">
                  <h4 className="subtitle-1 text-light-100 mb-4 flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-blue-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                      <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                    </svg>
                    Key Performance Indicators
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue/10 rounded-xl border border-blue/20 shadow-drop-1 hover:shadow-drop-2 transition-all">
                      <div className="w-8 h-8 bg-blue/20 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg
                          className="w-4 h-4 text-blue"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 5a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 3a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <p className="h2 text-blue font-bold">
                        {report.contractsCount}
                      </p>
                      <p className="caption text-blue font-medium">Contracts</p>
                    </div>
                    <div className="text-center p-4 bg-green/10 rounded-xl border border-green/20 shadow-drop-1 hover:shadow-drop-2 transition-all">
                      <div className="w-8 h-8 bg-green/20 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg
                          className="w-4 h-4 text-green"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                        </svg>
                      </div>
                      <p className="h2 text-green font-bold">
                        {report.usersCount}
                      </p>
                      <p className="caption text-green font-medium">Users</p>
                    </div>
                    <div className="text-center p-4 bg-pink/10 rounded-xl border border-pink/20 shadow-drop-1 hover:shadow-drop-2 transition-all">
                      <div className="w-8 h-8 bg-pink/20 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg
                          className="w-4 h-4 text-pink"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <p className="h2 text-pink font-bold">
                        {report.eventsCount}
                      </p>
                      <p className="caption text-pink font-medium">Events</p>
                    </div>
                    <div className="text-center p-4 bg-orange/10 rounded-xl border border-orange/20 shadow-drop-1 hover:shadow-drop-2 transition-all">
                      <div className="w-8 h-8 bg-orange/20 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg
                          className="w-4 h-4 text-orange"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4 4a2 2 0 012-2h4.586A2 2 0 0114 2.586L15.414 4A2 2 0 0116 5.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <p className="h2 text-orange font-bold">
                        {report.filesCount}
                      </p>
                      <p className="caption text-orange font-medium">Files</p>
                    </div>
                  </div>
                </div>

                {/* Report Content Preview */}
                {report.content && (
                  <div className="bg-white/70 rounded-xl border border-light-300 shadow-drop-1 overflow-hidden">
                    <div className="bg-light-300/50 px-6 py-4 border-b border-light-300">
                      <h4 className="subtitle-1 text-light-100 flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-blue-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4 4a2 2 0 012-2h4.586A2 2 0 0114 2.586L15.414 4A2 2 0 0116 5.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Executive Summary & Analysis
                      </h4>
                    </div>
                    <div className="p-6 max-h-60 overflow-y-auto">
                      <div
                        className="prose prose-sm max-w-none body-2 text-light-100"
                        dangerouslySetInnerHTML={{ __html: report.content }}
                      />
                    </div>
                  </div>
                )}

                {/* Professional Action Buttons */}
                <div className="bg-light-400/20 rounded-xl p-6 border border-light-300">
                  <h4 className="subtitle-1 text-light-100 mb-4 flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-blue-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Report Actions
                  </h4>

                  {/* Primary Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <Button
                      onClick={handleDownloadReport}
                      variant="outline"
                      className="h-[52px] border-light-300 text-light-100 hover:bg-light-300/50 shadow-drop-1 justify-start"
                    >
                      <Download className="mr-3 h-4 w-4" />
                      <div className="text-left">
                        <div className="font-medium">Download PDF</div>
                        <div className="text-xs text-light-200">
                          Professional format
                        </div>
                      </div>
                    </Button>
                    <Button
                      onClick={handleUploadReport}
                      variant="outline"
                      className="h-[52px] border-light-300 text-light-100 hover:bg-light-300/50 shadow-drop-1 justify-start"
                    >
                      <Upload className="mr-3 h-4 w-4" />
                      <div className="text-left">
                        <div className="font-medium">Upload to Documents</div>
                        <div className="text-xs text-light-200">
                          Save to system
                        </div>
                      </div>
                    </Button>
                  </div>

                  {/* Secondary Actions */}
                  <div className="flex gap-3">
                    <Button
                      onClick={handleShareReport}
                      variant="outline"
                      className="flex-1 h-[42px] border-light-300 text-light-100 hover:bg-light-300/50 shadow-drop-1"
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Share Report
                    </Button>
                    <Button
                      onClick={handleDeleteReport}
                      variant="outline"
                      className="h-[42px] px-4 border-red-300 text-red-600 hover:bg-red-50 shadow-drop-1"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>

                {/* Generate Another Report Button */}
                <div className="pt-6 border-t border-light-300">
                  <div className="text-center mb-3">
                    <p className="body-2 text-light-200">
                      Need additional analysis?
                    </p>
                  </div>
                  <Button
                    onClick={handleGenerateAnother}
                    variant="outline"
                    className="w-full h-[52px] border-blue-300 text-blue-600 hover:bg-blue-50 shadow-drop-1 font-medium"
                  >
                    <Plus className="mr-3 h-4 w-4" />
                    Generate Another Professional Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Report"
        description="This action cannot be undone. The report will be permanently removed from the system."
        itemName={report?.title || ''}
        onConfirm={confirmDeleteReport}
        isLoading={isDeleting}
      />
    </Dialog>
  );
};

export default ReportGenerator;
