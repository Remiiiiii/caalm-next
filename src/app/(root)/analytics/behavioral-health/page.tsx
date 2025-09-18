import React from 'react';
import AnalyticsLayout from '@/components/analytics/AnalyticsLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

const BehavioralHealthAnalytics = () => {
  return (
    <div className="space-y-6">
      <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
        <CardHeader>
          <CardTitle className="h3 text-navy">
            Behavioral Health Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="text-light-200">
          <p className="body-1">
            Behavioral health analytics content will be displayed here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

const BehavioralHealthAnalyticsPage = () => {
  const divisionData = {
    totalContracts: 189,
    totalBudget: '$2.1M',
    staffCount: 134,
    complianceRate: '88%',
    trend: 'up' as const,
    change: '+5%',
  };

  return (
    <AnalyticsLayout division="behavioral-health" divisionData={divisionData}>
      <BehavioralHealthAnalytics />
    </AnalyticsLayout>
  );
};

export default BehavioralHealthAnalyticsPage;
