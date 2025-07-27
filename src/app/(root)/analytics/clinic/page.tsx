import React from 'react';
import AnalyticsLayout from '@/components/analytics/AnalyticsLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ClinicAnalytics = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Clinic Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Clinic analytics dashboard will be implemented tomorrow.
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
