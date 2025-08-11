import React from 'react';
import AnalyticsLayout from '@/components/analytics/AnalyticsLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

const ClinicAnalytics = () => {
  return (
    <div className="space-y-6">
      <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
        <CardHeader>
          <CardTitle className="h3 text-dark-200">Clinic Analytics</CardTitle>
        </CardHeader>
        <CardContent className="text-light-200">
          <p className="body-1">
            Clinic analytics content will be displayed here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

const ClinicAnalyticsPage = () => {
  const departmentData = {
    totalContracts: 198,
    totalBudget: '$2.5M',
    staffCount: 145,
    complianceRate: '94%',
    trend: 'up' as const,
    change: '+9%',
  };

  return (
    <AnalyticsLayout department="clinic" departmentData={departmentData}>
      <ClinicAnalytics />
    </AnalyticsLayout>
  );
};

export default ClinicAnalyticsPage;
