import React from 'react';
import AnalyticsLayout from '@/components/analytics/AnalyticsLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

const CFSAnalytics = () => {
  return (
    <div className="space-y-6">
      <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
        <CardHeader>
          <CardTitle className="h3 text-navy">CFS Analytics</CardTitle>
        </CardHeader>
        <CardContent className="text-light-200">
          <p className="body-1">
            CFS analytics content will be displayed here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

const CFSAnalyticsPage = () => {
  const divisionData = {
    totalContracts: 145,
    totalBudget: '$1.6M',
    staffCount: 98,
    complianceRate: '91%',
    trend: 'up' as const,
    change: '+7%',
  };

  return (
    <AnalyticsLayout division="cfs" divisionData={divisionData}>
      <CFSAnalytics />
    </AnalyticsLayout>
  );
};

export default CFSAnalyticsPage;
