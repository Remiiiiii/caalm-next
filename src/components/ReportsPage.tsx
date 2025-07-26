'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Eye, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserAccessibleDepartments } from '@/lib/actions/report.actions';
import { useReports } from '@/hooks/useReports';
import ReportGenerator from './ReportGenerator';

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
  const { reports, isLoading, error, generateReport } = useReports({
    department,
  });
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(
    department || null
  );
  const [reportGeneratorOpen, setReportGeneratorOpen] = useState(false);
  const [accessibleDepartments, setAccessibleDepartments] = useState<string[]>(
    []
  );

  // Fetch accessible departments when user changes
  useEffect(() => {
    const fetchDepartments = async () => {
      if (user) {
        const departments = await getUserAccessibleDepartments(
          (user as any).role || 'user',
          (user as any).department
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
    // Implement report viewing logic
    console.log('Viewing report:', report);
  };

  const handleDownloadReport = (report: ReportCard) => {
    // Implement download logic
    console.log('Downloading report:', report);
  };

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
        <div className="animate-pulse space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Reports & Analytics
        </h1>
        <p className="text-gray-600">
          Generate and view comprehensive reports for your department and
          organization.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <p className="text-red-600 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Quick Generate Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
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
                className="flex items-center gap-2"
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
        {reports.map((report) => (
          <Card key={report.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    {report.title}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {report.department}
                  </p>
                </div>
                <Badge className={getStatusColor(report.status)}>
                  {report.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  {formatDate(report.generatedAt)}
                </div>
                <div className="text-sm text-gray-600">
                  Generated by: {report.generatedBy}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewReport(report)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadReport(report)}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {reports.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Reports Available
            </h3>
            <p className="text-gray-600 mb-4">
              Generate your first report to get started with analytics and
              insights.
            </p>
            <Button onClick={() => handleGenerateReport('all')}>
              Generate Report
            </Button>
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
