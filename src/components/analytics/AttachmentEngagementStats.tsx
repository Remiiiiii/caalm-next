'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Eye, Download, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface AttachmentEngagement {
  attachmentId: string;
  attachmentName: string;
  viewCount: number;
  downloadCount: number;
  uniqueViewers: number;
  eventTitle: string;
  eventDate: string;
}

interface AttachmentMetrics {
  total: number;
  totalViews: number;
  totalDownloads: number;
  engagementRate: number;
  topAttachments: AttachmentEngagement[];
}

interface AttachmentEngagementStatsProps {
  data: AttachmentMetrics;
}

export const AttachmentEngagementStats: React.FC<AttachmentEngagementStatsProps> = ({
  data,
}) => {
  const engagementPercentage =
    data.total > 0
      ? Math.round((data.totalViews / (data.total * 10)) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Attachments</p>
                <p className="text-2xl font-bold text-navy">{data.total}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Views</p>
                <p className="text-2xl font-bold text-navy">
                  {data.totalViews.toLocaleString()}
                </p>
              </div>
              <Eye className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Downloads</p>
                <p className="text-2xl font-bold text-navy">
                  {data.totalDownloads.toLocaleString()}
                </p>
              </div>
              <Download className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Engagement Rate</p>
                <p className="text-2xl font-bold text-navy">
                  {engagementPercentage}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Attachments */}
      <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
        <CardHeader>
          <CardTitle className="h3 text-navy">Top Attachments by Engagement</CardTitle>
          <CardDescription>
            Most viewed and downloaded attachments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.topAttachments.length > 0 ? (
            <div className="space-y-3">
              {data.topAttachments.map((attachment, index) => (
                <div
                  key={attachment.attachmentId}
                  className="flex items-center justify-between p-4 bg-white/50 rounded-lg border border-white/60 hover:bg-white/70 transition-colors"
                >
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg flex-shrink-0">
                      <span className="text-sm font-bold text-blue-600">
                        #{index + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-800 mb-1">
                        {attachment.attachmentName}
                      </h4>
                      <p className="text-sm text-slate-600 mb-2">
                        From: {attachment.eventTitle}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-slate-500">
                        <span>
                          <Eye className="h-3 w-3 inline mr-1" />
                          {attachment.viewCount} views
                        </span>
                        <span>
                          <Download className="h-3 w-3 inline mr-1" />
                          {attachment.downloadCount} downloads
                        </span>
                        <span>
                          <TrendingUp className="h-3 w-3 inline mr-1" />
                          {attachment.uniqueViewers} unique viewers
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Event date:{' '}
                        {format(new Date(attachment.eventDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="ml-4">
                    <Badge className="bg-blue-100 text-blue-800">
                      {Math.round(
                        (attachment.viewCount / data.totalViews) * 100
                      )}
                      % of views
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-700 font-medium">
                No attachment data available
              </p>
              <p className="text-sm text-slate-600 mt-1">
                Attachment engagement metrics will appear here once events have
                attachments
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Engagement Insights */}
      <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
        <CardHeader>
          <CardTitle className="h3 text-navy">Engagement Insights</CardTitle>
          <CardDescription>
            Analysis of attachment usage patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white/50 rounded-lg">
              <p className="text-sm text-slate-600 mb-2">Average Views per Attachment</p>
              <p className="text-2xl font-bold text-navy">
                {data.total > 0
                  ? Math.round(data.totalViews / data.total)
                  : 0}
              </p>
            </div>
            <div className="p-4 bg-white/50 rounded-lg">
              <p className="text-sm text-slate-600 mb-2">Download Rate</p>
              <p className="text-2xl font-bold text-navy">
                {data.totalViews > 0
                  ? Math.round((data.totalDownloads / data.totalViews) * 100)
                  : 0}
                %
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

