import React from 'react';
import AnalyticsLayout from '@/components/analytics/AnalyticsLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const CFSAnalytics = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>CFS Analytics</CardTitle>
        </CardHeader>
        <CardContent></CardContent>
      </Card>
    </div>
  );
};

const CFSAnalyticsPage = () => {
  const departmentData = {
    totalContracts: 145,
    totalBudget: '$1.6M',
    staffCount: 98,
    complianceRate: '91%',
    trend: 'up' as const,
    change: '+7%',
  };

  return (
    <AnalyticsLayout department="cfs" departmentData={departmentData}>
      <CFSAnalytics />
    </AnalyticsLayout>
  );
};

export default CFSAnalyticsPage;
