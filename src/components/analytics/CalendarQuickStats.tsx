'use client';

import React from 'react';
import useSWR from 'swr';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  AlertCircle,
  FileText,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch calendar quick stats');
  }
  return response.json();
};

export const CalendarQuickStats: React.FC = () => {
  const { data, error, isLoading } = useSWR(
    '/api/analytics/calendar?days=7',
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  if (isLoading) {
    return (
      <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-navy" />
            <span className="ml-2 text-slate-700">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
        <CardContent className="pt-6">
          <div className="text-center py-4">
            <AlertCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-slate-600">Failed to load calendar stats</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const today = new Date();
  const todayEvents = data.meetingLoad?.totalMeetings || 0;
  const urgentDeadlines = (data.compliance?.atRisk || 0) + (data.compliance?.overdue || 0);
  const totalAttachments = data.attachments?.total || 0;
  const totalViews = data.attachments?.totalViews || 0;

  return (
    <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
      <CardHeader>
        <CardTitle className="h3 text-navy flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendar Quick Stats
        </CardTitle>
        <CardDescription>This week's calendar activity at a glance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Today's Events */}
          <div className="p-4 bg-white/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Today's Events</p>
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-navy">{todayEvents}</p>
            <p className="text-xs text-slate-500 mt-1">
              {format(today, 'MMM d, yyyy')}
            </p>
          </div>

          {/* Meeting Hours */}
          <div className="p-4 bg-white/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Meeting Hours</p>
              <Clock className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-navy">
              {data.meetingLoad?.totalHours?.toFixed(1) || '0'}
            </p>
            <p className="text-xs text-slate-500 mt-1">This week</p>
          </div>

          {/* Urgent Items */}
          <div className="p-4 bg-white/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Urgent Items</p>
              <AlertCircle className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-amber-600">{urgentDeadlines}</p>
            <p className="text-xs text-slate-500 mt-1">
              {data.compliance?.overdue || 0} overdue,{' '}
              {data.compliance?.atRisk || 0} at risk
            </p>
          </div>

          {/* Attachments */}
          <div className="p-4 bg-white/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Attachments</p>
              <FileText className="h-4 w-4 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-navy">{totalAttachments}</p>
            <p className="text-xs text-slate-500 mt-1">
              {totalViews.toLocaleString()} views
            </p>
          </div>
        </div>

        {/* Compliance Status */}
        {data.compliance && (
          <div className="mt-4 p-4 bg-white/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Compliance Rate</p>
                <p className="text-2xl font-bold text-navy">
                  {data.compliance.complianceRate}%
                </p>
              </div>
              <div className="flex items-center gap-2">
                {data.compliance.complianceRate >= 90 ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-amber-600" />
                )}
                <Badge
                  className={
                    data.compliance.complianceRate >= 90
                      ? 'bg-green-100 text-green-800'
                      : 'bg-amber-100 text-amber-800'
                  }
                >
                  {data.compliance.complianceRate >= 90 ? 'Good' : 'Needs Attention'}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Peak Day */}
        {data.meetingLoad?.peakDays && data.meetingLoad.peakDays.length > 0 && (
          <div className="mt-4 p-4 bg-white/50 rounded-lg">
            <p className="text-sm text-slate-600 mb-2">Peak Meeting Day</p>
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold text-navy">
                {data.meetingLoad.peakDays[0].day}
              </p>
              <p className="text-sm text-slate-600">
                {data.meetingLoad.peakDays[0].count} meetings •{' '}
                {data.meetingLoad.peakDays[0].hours.toFixed(1)} hours
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

