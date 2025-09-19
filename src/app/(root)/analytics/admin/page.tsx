'use client';

import AdminAnalyticsDashboard from '@/components/analytics/AdminAnalyticsDashboard';
import AnalyticsErrorBoundary from '@/components/analytics/AnalyticsErrorBoundary';

export const dynamic = 'force-dynamic';

const AdminAnalyticsPage = () => {
  return (
    <AnalyticsErrorBoundary>
      <AdminAnalyticsDashboard />
    </AnalyticsErrorBoundary>
  );
};

export default AdminAnalyticsPage;
