import React from 'react';
import ReportsPage from '@/components/ReportsPage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  TrendingUp,
  Users,
  FileText,
  Building,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

const AnalyticsPage = () => {
  const departments = [
    {
      id: 'administration',
      name: 'Administration',
      description: 'Administrative operations and performance metrics',
      icon: Building,
      color: 'bg-blue-500',
      route: '/analytics/administration',
      stats: {
        contracts: 156,
        budget: '$1.9M',
        staff: 89,
        compliance: '85%',
      },
    },
    {
      id: 'child-welfare',
      name: 'Child Welfare',
      description: 'Child welfare services and program metrics',
      icon: Users,
      color: 'bg-green-500',
      route: '/analytics/child-welfare',
      stats: {
        contracts: 234,
        budget: '$2.8M',
        staff: 156,
        compliance: '92%',
      },
    },
    {
      id: 'behavioral-health',
      name: 'Behavioral Health',
      description: 'Behavioral health services and outcomes',
      icon: TrendingUp,
      color: 'bg-purple-500',
      route: '/analytics/behavioral-health',
      stats: {
        contracts: 189,
        budget: '$2.1M',
        staff: 134,
        compliance: '88%',
      },
    },
    {
      id: 'cfs',
      name: 'CFS',
      description: 'CFS program analytics and performance',
      icon: FileText,
      color: 'bg-orange-500',
      route: '/analytics/cfs',
      stats: {
        contracts: 145,
        budget: '$1.6M',
        staff: 98,
        compliance: '91%',
      },
    },
    {
      id: 'residential',
      name: 'Residential',
      description: 'Residential services and facility metrics',
      icon: Building,
      color: 'bg-red-500',
      route: '/analytics/residential',
      stats: {
        contracts: 167,
        budget: '$2.3M',
        staff: 112,
        compliance: '87%',
      },
    },
    {
      id: 'clinic',
      name: 'Clinic',
      description: 'Clinical services and patient outcomes',
      icon: BarChart3,
      color: 'bg-teal-500',
      route: '/analytics/clinic',
      stats: {
        contracts: 198,
        budget: '$2.5M',
        staff: 145,
        compliance: '94%',
      },
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Reports & Analytics
        </h1>
        <p className="text-gray-600">
          Comprehensive analytics and reporting for all departments
        </p>
      </div>

      {/* Department Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {departments.map((dept) => {
          const IconComponent = dept.icon;
          return (
            <Card key={dept.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${dept.color}`}>
                      <IconComponent className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{dept.name}</CardTitle>
                      <p className="text-sm text-gray-600">
                        {dept.description}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {dept.stats.contracts}
                    </div>
                    <div className="text-xs text-gray-600">Contracts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {dept.stats.budget}
                    </div>
                    <div className="text-xs text-gray-600">Budget</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {dept.stats.staff}
                    </div>
                    <div className="text-xs text-gray-600">Staff</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {dept.stats.compliance}
                    </div>
                    <div className="text-xs text-gray-600">Compliance</div>
                  </div>
                </div>
                <Link href={dept.route}>
                  <Button className="w-full" variant="outline">
                    View Analytics
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reports Section */}
      <div className="border-t pt-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Generated Reports
        </h2>
        <ReportsPage />
      </div>
    </div>
  );
};

export default AnalyticsPage;
