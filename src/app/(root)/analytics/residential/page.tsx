import React from 'react';
import AnalyticsLayout from '@/components/analytics/AnalyticsLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ResidentialAnalytics = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Residential Analytics</CardTitle>
        </CardHeader>
        <CardContent></CardContent>
      </Card>
    </div>
  );
};

const ResidentialAnalyticsPage = () => {
  const departmentData = {
    totalContracts: 167,
    totalBudget: '$2.3M',
    staffCount: 112,
    complianceRate: '87%',
    trend: 'up' as const,
    change: '+6%',
  };

  return (
    <AnalyticsLayout department="residential" departmentData={departmentData}>
      <ResidentialAnalytics />
    </AnalyticsLayout>
  );
};

export default ResidentialAnalyticsPage;
