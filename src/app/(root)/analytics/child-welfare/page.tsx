import React from 'react';
import AnalyticsLayout from '@/components/analytics/AnalyticsLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

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
  const divisionData = {
    totalContracts: 234,
    totalBudget: '$2.8M',
    staffCount: 156,
    complianceRate: '92%',
    trend: 'up' as const,
    change: '+8%',
  };

  return (
    <AnalyticsLayout division="child-welfare" divisionData={divisionData}>
      <ChildWelfareAnalytics />
    </AnalyticsLayout>
  );
};

export default ChildWelfareAnalyticsPage;
