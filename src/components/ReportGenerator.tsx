'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, Upload, Share2 } from 'lucide-react';
import { Models } from 'appwrite';
import {
  generateReport,
  downloadReport,
  uploadReport,
  type ReportData,
} from '@/lib/actions/report.actions';

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
}

import { CONTRACT_DEPARTMENTS } from '../../constants';

const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  open,
  onClose,
  department,
  user,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState(
    department || ''
  );

  // Update selected department when prop changes
  useEffect(() => {
    setSelectedDepartment(department || '');
  }, [department]);

  const handleGenerateReport = async () => {
    if (!user) return;

    setIsGenerating(true);
    setError(null);

    try {
      const reportData = await generateReport({
        userId: user.$id,
        userRole: user?.role || 'user',
        department: selectedDepartment || 'all',
        userName: user?.fullName || user?.email || 'Unknown User',
      });

      setReport(reportData);
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-[26px] max-w-5xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur border border-white/40 shadow-drop-1 px-6 py-8">
        <DialogHeader>
          <DialogTitle className="h3 text-light-100">
            Generate Report
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Report Generation Section */}
          <Card className="border border-light-300 shadow-drop-1 rounded-xl bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="h4 text-light-100">
                Report Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="subtitle-2 text-light-100">
                    Department
                    <span>
                      {' '}
                      <Badge
                        variant="secondary"
                        className="bg-light-300 text-light-100"
                      >
                        {user?.role === 'executive' ? 'Executive' : 'User'}
                      </Badge>
                    </span>
                  </p>
                  {user?.role === 'executive' ? (
                    <div className="mt-3 space-y-3">
                      {CONTRACT_DEPARTMENTS.map((dept) => (
                        <div key={dept} className="flex items-center space-x-3">
                          <input
                            type="radio"
                            id={dept}
                            name="department"
                            value={dept}
                            checked={selectedDepartment === dept}
                            onChange={(e) =>
                              setSelectedDepartment(e.target.value)
                            }
                            className="w-4 h-4 text-blue-600 bg-light-300 border-light-300 focus:ring-blue-500 focus:ring-2"
                          />
                          <label
                            htmlFor={dept}
                            className="body-2 text-light-100 cursor-pointer hover:text-light-200 transition-colors"
                          >
                            {dept}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="body-2 text-light-200">
                      {selectedDepartment
                        ? `${selectedDepartment} Department`
                        : 'All Departments'}
                    </p>
                  )}
                </div>
              </div>

              <Button
                onClick={handleGenerateReport}
                disabled={
                  isGenerating ||
                  (user?.role === 'executive' && !selectedDepartment)
                }
                className="primary-btn h-[52px] shadow-drop-1"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  'Generate Report'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="border-red-200 bg-red-50/80 backdrop-blur shadow-drop-1 rounded-xl">
              <CardContent className="pt-4">
                <p className="text-red-600 body-2">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Generated Report Display */}
          {report && (
            <Card className="border border-light-300 shadow-drop-1 rounded-xl bg-white/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="h4 text-light-100">
                  Generated Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="h5 text-light-100">{report.title}</h3>
                    <p className="body-2 text-light-200">
                      Generated on{' '}
                      {new Date(report.generatedAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      report.status === 'completed' ? 'default' : 'secondary'
                    }
                    className={
                      report.status === 'completed'
                        ? 'bg-green text-white'
                        : 'bg-light-300 text-light-100'
                    }
                  >
                    {report.status}
                  </Badge>
                </div>

                {/* Metrics Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 min-w-0">
                  <div className="text-center p-4 bg-blue/10 rounded-xl border border-blue/20 shadow-drop-1">
                    <p className="h2 text-blue">{report.contractsCount}</p>
                    <p className="caption text-blue">Contracts</p>
                  </div>
                  <div className="text-center p-4 bg-green/10 rounded-xl border border-green/20 shadow-drop-1">
                    <p className="h2 text-green">{report.usersCount}</p>
                    <p className="caption text-green">Users</p>
                  </div>
                  <div className="text-center p-4 bg-pink/10 rounded-xl border border-pink/20 shadow-drop-1">
                    <p className="h2 text-pink">{report.eventsCount}</p>
                    <p className="caption text-pink">Events</p>
                  </div>
                  <div className="text-center p-4 bg-orange/10 rounded-xl border border-orange/20 shadow-drop-1">
                    <p className="h2 text-orange">{report.filesCount}</p>
                    <p className="caption text-orange">Files</p>
                  </div>
                </div>

                {/* Report Content */}
                {report.content && (
                  <div className="border border-light-300 rounded-xl p-4 bg-light-400/50 backdrop-blur shadow-drop-1 overflow-hidden">
                    <h4 className="h5 text-light-100 mb-3">Report Summary</h4>
                    <div
                      className="prose prose-sm max-w-none body-2 text-light-100 overflow-x-auto"
                      dangerouslySetInnerHTML={{ __html: report.content }}
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 flex-wrap">
                  <Button
                    onClick={handleDownloadReport}
                    variant="outline"
                    className="flex-1 min-w-0 h-[52px] border-light-300 text-light-100 hover:bg-light-300/50 shadow-drop-1"
                  >
                    <Download className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Download PDF</span>
                  </Button>
                  <Button
                    onClick={handleUploadReport}
                    variant="outline"
                    className="flex-1 min-w-0 h-[52px] border-light-300 text-light-100 hover:bg-light-300/50 shadow-drop-1"
                  >
                    <Upload className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Upload to Documents</span>
                  </Button>
                  <Button
                    onClick={handleShareReport}
                    variant="outline"
                    size="icon"
                    className="h-[52px] w-[52px] flex-shrink-0 border-light-300 text-light-100 hover:bg-light-300/50 shadow-drop-1"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportGenerator;
