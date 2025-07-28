import React from 'react';
import AnalyticsLayout from '@/components/analytics/AnalyticsLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ChildWelfareAnalytics = () => {
  return (
    <div className="space-y-6">
      <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
        <CardHeader>
          <CardTitle className="h3 text-dark-200">
            Child Welfare Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="text-light-200">
          <p className="body-1">
            Child welfare analytics content will be displayed here.
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
