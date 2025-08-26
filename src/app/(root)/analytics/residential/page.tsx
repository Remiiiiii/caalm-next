import React from 'react';
import AnalyticsLayout from '@/components/analytics/AnalyticsLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

const ResidentialAnalytics = () => {
  return (
    <div className="space-y-6">
      <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
        <CardHeader>
          <CardTitle className="h3 text-dark-200">
            Residential Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="text-light-200">
          <p className="body-1">
            Residential analytics content will be displayed here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

const ResidentialAnalyticsPage = () => {
  const divisionData = {
    totalContracts: 167,
    totalBudget: '$2.3M',
    staffCount: 112,
    complianceRate: '87%',
    trend: 'up' as const,
    change: '+6%',
  };

  return (
    <AnalyticsLayout division="residential" divisionData={divisionData}>
      <ResidentialAnalytics />
    </AnalyticsLayout>
  );
};

export default ResidentialAnalyticsPage;
