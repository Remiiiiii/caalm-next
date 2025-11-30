'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Clock,
  FileText,
  AlertCircle,
  TrendingUp,
  Users,
  CheckCircle,
  XCircle,
  Loader2,
  Download,
  RefreshCw,
} from 'lucide-react';
import { MeetingLoadChart } from './MeetingLoadChart';
import { ComplianceDeadlineTracker } from './ComplianceDeadlineTracker';
import { AttachmentEngagementStats } from './AttachmentEngagementStats';

interface CalendarAnalyticsData {
  meetingLoad: {
    totalMeetings: number;
    totalHours: number;
    averageDuration: number;
    peakDays: Array<{ day: string; count: number; hours: number }>;
    byDepartment: Array<{
      department: string;
      meetings: number;
      hours: number;
    }>;
    byType: Record<string, number>;
  };
  compliance: {
    upcoming: Array<{
      eventId: string;
      title: string;
      deadlineDate: string;
      daysUntil: number;
      status: 'on_track' | 'at_risk' | 'overdue';
      assignedTo: string;
      department?: string;
    }>;
    atRisk: number;
    overdue: number;
    complianceRate: number;
    upcomingByDepartment: Record<string, number>;
  };
  attachments: {
    total: number;
    totalViews: number;
    totalDownloads: number;
    engagementRate: number;
    topAttachments: Array<{
      attachmentId: string;
      attachmentName: string;
      viewCount: number;
      downloadCount: number;
      uniqueViewers: number;
      eventTitle: string;
      eventDate: string;
    }>;
  };
  resources: {
    totalBookings: number;
    utilizationRate: number;
    topResources: Array<{ resourceId: string; name: string; bookings: number }>;
    byStatus: Record<string, number>;
  };
  dateRange: { start: string; end: string };
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(
      errorData.message ||
        `Failed to fetch calendar analytics: ${response.status}`
    );
    (error as any).status = response.status;
    (error as any).data = errorData;
    throw error;
  }
  const data = await response.json();
  // If the response contains an error field, treat it as an error
  if (data.error && !data.meetingLoad) {
    const error = new Error(data.message || data.error);
    (error as any).status = response.status;
    (error as any).data = data;
    throw error;
  }
  return data;
};

export const CalendarAnalyticsDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState(30);
  const { data, error, isLoading, mutate } = useSWR<CalendarAnalyticsData>(
    `/api/analytics/calendar?days=${dateRange}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      onError: (err) => {
        console.error('[CalendarAnalyticsDashboard] SWR Error:', err);
      },
    }
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-navy" />
          <span className="ml-3 text-slate-700">
            Loading calendar analytics...
          </span>
        </div>
      </div>
    );
  }

  // Check if we have valid data
  const hasValidData = data && data.meetingLoad;

  if (error && !hasValidData) {
    return (
      <div className="space-y-6">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">
                  Error Loading Calendar Analytics
                </h3>
                <p className="text-red-600">
                  {error instanceof Error
                    ? error.message
                    : 'Failed to load calendar analytics data. Please try again later.'}
                </p>
                <Button
                  onClick={() => mutate()}
                  size="sm"
                  variant="outline"
                  className="mt-3"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If we don't have data yet, show loading
  if (!data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-navy" />
          <span className="ml-3 text-slate-700">
            Loading calendar analytics...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex justify-center">
          <div>
            <h1 className="h1 sidebar-gradient-text text-center">
              Calendar Analytics Dashboard
            </h1>
            <p className="body-1 text-slate-700 text-center py-2">
              Meeting load, compliance deadlines, and attachment engagement
              metrics
            </p>
          </div>
        </div>
      </div>

      {/* Calendar Analytics Card */}
      <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="h2 sidebar-gradient-text">
              Calendar Analytics
            </CardTitle>
            <div className="flex items-center gap-2">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(Number(e.target.value))}
                className="px-3 py-2 bg-white/30 backdrop-blur border border-white/40 rounded-lg text-sm text-slate-700"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={180}>Last 6 months</option>
              </select>
              <Button
                onClick={() => mutate()}
                size="sm"
                variant="outline"
                className="bg-white/30 backdrop-blur border border-white/40"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-white/30 backdrop-blur border border-white/40"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Total Events</p>
                    <p className="text-2xl font-bold text-navy">
                      {data.meetingLoad.totalMeetings}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Meeting Hours</p>
                    <p className="text-2xl font-bold text-navy">
                      {data.meetingLoad.totalHours.toFixed(1)}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Clock className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">
                      Compliance Rate
                    </p>
                    <p className="text-2xl font-bold text-navy">
                      {data.compliance.complianceRate}%
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">
                      Attachment Views
                    </p>
                    <p className="text-2xl font-bold text-navy">
                      {data.attachments.totalViews.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <FileText className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="meetings" className="w-full">
            <TabsList className="bg-white/20 backdrop-blur border border-white/40">
              <TabsTrigger value="meetings">Meeting Load</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
              <TabsTrigger value="attachments">Attachments</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
            </TabsList>

            <TabsContent value="meetings" className="mt-6">
              <MeetingLoadChart data={data.meetingLoad} />
            </TabsContent>

            <TabsContent value="compliance" className="mt-6">
              <ComplianceDeadlineTracker data={data.compliance} />
            </TabsContent>

            <TabsContent value="attachments" className="mt-6">
              <AttachmentEngagementStats data={data.attachments} />
            </TabsContent>

            <TabsContent value="resources" className="mt-6">
              <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
                <CardHeader>
                  <CardTitle className="h3 text-navy">
                    Resource Utilization
                  </CardTitle>
                  <CardDescription>
                    Resource booking statistics and utilization rates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-slate-600 mb-2">
                        Total Bookings
                      </p>
                      <p className="text-3xl font-bold text-navy">
                        {data.resources.totalBookings}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-2">
                        Utilization Rate
                      </p>
                      <p className="text-3xl font-bold text-navy">
                        {data.resources.utilizationRate}%
                      </p>
                    </div>
                  </div>
                  {data.resources.topResources.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-semibold text-slate-700 mb-3">
                        Top Resources
                      </h4>
                      <div className="space-y-2">
                        {data.resources.topResources.map((resource) => (
                          <div
                            key={resource.resourceId}
                            className="flex items-center justify-between p-3 bg-white/50 rounded-lg"
                          >
                            <span className="text-sm text-slate-700">
                              {resource.name}
                            </span>
                            <Badge variant="secondary">
                              {resource.bookings} bookings
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
