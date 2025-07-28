import React from 'react';
import AnalyticsLayout from '@/components/analytics/AnalyticsLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const BehavioralHealthAnalytics = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Behavioral Health Analytics</CardTitle>
        </CardHeader>
        <CardContent></CardContent>
      </Card>
    </div>
  );
};

const BehavioralHealthAnalyticsPage = () => {
  const departmentData = {
    totalContracts: 189,
    totalBudget: '$2.1M',
    staffCount: 134,
    complianceRate: '88%',
    trend: 'up' as const,
    change: '+5%',
  };

  return (
    <AnalyticsLayout
      department="behavioral-health"
      departmentData={departmentData}
    >
      <BehavioralHealthAnalytics />
    </AnalyticsLayout>
  );
};

export default BehavioralHealthAnalyticsPage;
