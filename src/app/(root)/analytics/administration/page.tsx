import React from 'react';
import AdministrationAnalytics from '@/components/analytics/AdministrationAnalytics';
import AnalyticsLayout from '@/components/analytics/AnalyticsLayout';

export const dynamic = 'force-dynamic';

const AdministrationAnalyticsPage = () => {
  const departmentData = {
    totalContracts: 156,
    totalBudget: '$1.9M',
    staffCount: 89,
    complianceRate: '85%',
    trend: 'up' as const,
    change: '+12%',
  };

  return (
    <AnalyticsLayout
      department="administration"
      departmentData={departmentData}
    >
      <AdministrationAnalytics />
    </AnalyticsLayout>
  );
};

export default AdministrationAnalyticsPage;
