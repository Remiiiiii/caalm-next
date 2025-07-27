import React from 'react';
import AnalyticsLayout from '@/components/analytics/AnalyticsLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ChildWelfareAnalytics = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Child Welfare Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Child Welfare analytics dashboard will be implemented tomorrow.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

const ChildWelfareAnalyticsPage = () => {
  const departmentData = {
    totalContracts: 234,
    totalBudget: '$2.8M',
    staffCount: 156,
    complianceRate: '92%',
    trend: 'up' as const,
    change: '+8%',
  };

  return (
    <AnalyticsLayout department="child-welfare" departmentData={departmentData}>
      <ChildWelfareAnalytics />
    </AnalyticsLayout>
  );
};

export default ChildWelfareAnalyticsPage;
