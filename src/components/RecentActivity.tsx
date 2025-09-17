'use client';

import { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUnifiedDashboardData } from '@/hooks/useUnifiedDashboardData';
import { useOrganization } from '@/contexts/OrganizationContext';
import { ActivityItemSkeleton } from '@/components/ui/skeletons';

interface RecentActivity {
  $id: string;
  action: string;
  description: string;
  userId?: string;
  userName?: string;
  contractId?: string;
  contractName?: string;
  eventId?: string;
  eventTitle?: string;
  department?: string;
  timestamp: string;
  type: 'contract' | 'user' | 'event' | 'notification' | 'file';
}

interface RecentActivityProps {
  limit?: number;
}

const RecentActivity: FC<RecentActivityProps> = ({ limit = 15 }) => {
  const { orgId } = useOrganization();
  const { recentActivities, isLoading } = useUnifiedDashboardData(
    orgId || 'default_organization'
  );

  // Debug logging
  console.log('RecentActivity Debug:', {
    orgId,
    isLoading,
    recentActivitiesLength: recentActivities?.length || 0,
    recentActivities: recentActivities?.slice(0, 3) || [],
  });

  // Limit the activities to the specified limit
  const activities = recentActivities.slice(0, limit);

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInSeconds = Math.floor(
      (now.getTime() - activityTime.getTime()) / 1000
    );

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      const weeks = Math.floor(diffInSeconds / 604800);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    }
  };

  const getActivityDisplayText = (activity: RecentActivity) => {
    switch (activity.type) {
      case 'contract':
        return activity.contractName || 'Contract';
      case 'user':
        return activity.userName || 'User';
      case 'event':
        return activity.eventTitle || 'Event';
      case 'file':
        return activity.description;
      case 'notification':
        return activity.description;
      default:
        return activity.description;
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex left-0 text-lg font-bold text-center sidebar-gradient-text">
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[400px] overflow-y-auto">
            <div className="space-y-3 py-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <ActivityItemSkeleton key={i} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex left-0 text-lg font-bold text-center sidebar-gradient-text">
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[400px] overflow-y-auto">
          <div className="space-y-3 py-4">
            {activities.length === 0 ? (
              <div className="text-center text-slate-dark py-8">
                <p className="text-sm">No recent activities</p>
              </div>
            ) : (
              activities.map((activity: RecentActivity, index: number) => (
                <div
                  key={activity.$id}
                  className={`flex justify-between mr-4 items-start border-b border-border pb-2 last:border-b-0 transition-all duration-300 ${
                    index < 3 ? 'bg-blue-50/30 rounded p-2' : ''
                  }`}
                >
                  <div>
                    <p className="font-medium text-navy text-sm">
                      {activity.action}
                    </p>
                    <p className="text-xs text-slate-dark">
                      {getActivityDisplayText(activity)}
                    </p>
                  </div>
                  <span className="text-xs text-slate-light">
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
