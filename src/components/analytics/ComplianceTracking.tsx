'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  FileText,
  TrendingUp,
  TrendingDown,
  Eye,
  Download,
  Filter,
} from 'lucide-react';

interface ComplianceTrackingProps {
  department?: string;
}

interface ComplianceData {
  status: 'compliant' | 'action-required' | 'non-compliant' | 'pending-review';
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  contracts: Array<{
    id: string;
    name: string;
    vendor: string;
    expiryDate: string;
    daysUntilExpiry: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
  }>;
}

interface ComplianceMetrics {
  overall: {
    rate: number;
    trend: 'up' | 'down' | 'stable';
    change: number;
  };
  byStatus: ComplianceData[];
  riskFactors: Array<{
    factor: string;
    impact: 'low' | 'medium' | 'high' | 'critical';
    count: number;
    description: string;
  }>;
  upcomingRenewals: Array<{
    id: string;
    name: string;
    vendor: string;
    expiryDate: string;
    daysUntilExpiry: number;
    status: string;
  }>;
}

const ComplianceTracking: React.FC<ComplianceTrackingProps> = ({
  department,
}) => {
  const [complianceData, setComplianceData] =
    useState<ComplianceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | '1y'>('90d');

  // Mock data generation
  const generateComplianceData = (dept?: string) => {
    const baseData = {
      overall: {
        rate: 89.2,
        trend: 'up' as const,
        change: 2.1,
      },
      byStatus: [
        {
          status: 'compliant' as const,
          count: 1112,
          percentage: 89.2,
          trend: 'up' as const,
          contracts: [
            {
              id: '1',
              name: 'IT Services Agreement',
              vendor: 'TechCorp Solutions',
              expiryDate: '2024-12-15',
              daysUntilExpiry: 45,
              priority: 'medium' as const,
            },
            {
              id: '2',
              name: 'Office Supplies Contract',
              vendor: 'SupplyCo Inc',
              expiryDate: '2025-03-20',
              daysUntilExpiry: 120,
              priority: 'low' as const,
            },
          ],
        },
        {
          status: 'action-required' as const,
          count: 91,
          percentage: 7.3,
          trend: 'down' as const,
          contracts: [
            {
              id: '3',
              name: 'Security Services',
              vendor: 'SecureGuard Ltd',
              expiryDate: '2024-11-30',
              daysUntilExpiry: 15,
              priority: 'high' as const,
            },
            {
              id: '4',
              name: 'Maintenance Agreement',
              vendor: 'FixIt Services',
              expiryDate: '2024-12-05',
              daysUntilExpiry: 20,
              priority: 'medium' as const,
            },
          ],
        },
        {
          status: 'non-compliant' as const,
          count: 44,
          percentage: 3.5,
          trend: 'down' as const,
          contracts: [
            {
              id: '5',
              name: 'Legacy Software License',
              vendor: 'OldTech Corp',
              expiryDate: '2024-10-15',
              daysUntilExpiry: -10,
              priority: 'critical' as const,
            },
          ],
        },
        {
          status: 'pending-review' as const,
          count: 0,
          percentage: 0,
          trend: 'stable' as const,
          contracts: [],
        },
      ],
      riskFactors: [
        {
          factor: 'Expiring Contracts',
          impact: 'high' as const,
          count: 23,
          description: 'Contracts expiring within 30 days',
        },
        {
          factor: 'Overdue Renewals',
          impact: 'critical' as const,
          count: 7,
          description: 'Contracts past renewal date',
        },
        {
          factor: 'Missing Documentation',
          impact: 'medium' as const,
          count: 12,
          description: 'Contracts missing required documents',
        },
        {
          factor: 'Budget Overruns',
          impact: 'low' as const,
          count: 3,
          description: 'Contracts exceeding budget limits',
        },
      ],
      upcomingRenewals: [
        {
          id: '1',
          name: 'IT Services Agreement',
          vendor: 'TechCorp Solutions',
          expiryDate: '2024-12-15',
          daysUntilExpiry: 45,
          status: 'compliant',
        },
        {
          id: '2',
          name: 'Security Services',
          vendor: 'SecureGuard Ltd',
          expiryDate: '2024-11-30',
          daysUntilExpiry: 15,
          status: 'action-required',
        },
        {
          id: '3',
          name: 'Maintenance Agreement',
          vendor: 'FixIt Services',
          expiryDate: '2024-12-05',
          daysUntilExpiry: 20,
          status: 'action-required',
        },
      ],
    };

    // Adjust data based on department
    if (department && department !== 'all') {
      const departmentMultiplier =
        {
          'child-welfare': 0.25,
          'behavioral-health': 0.2,
          cfs: 0.15,
          residential: 0.18,
          clinic: 0.22,
          administration: 0.1,
        }[department] || 0.2;

      baseData.byStatus.forEach((status) => {
        status.count = Math.round(status.count * departmentMultiplier);
        status.contracts = status.contracts.slice(
          0,
          Math.max(
            1,
            Math.round(status.contracts.length * departmentMultiplier)
          )
        );
      });

      baseData.riskFactors.forEach((risk) => {
        risk.count = Math.round(risk.count * departmentMultiplier);
      });

      baseData.upcomingRenewals = baseData.upcomingRenewals.slice(
        0,
        Math.max(
          1,
          Math.round(baseData.upcomingRenewals.length * departmentMultiplier)
        )
      );
    }

    return baseData;
  };

  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      setComplianceData(generateComplianceData(department));
      setIsLoading(false);
    }, 1000);
  }, [department, timeRange]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'action-required':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'non-compliant':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'pending-review':
        return <Clock className="h-5 w-5 text-blue-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'action-required':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'non-compliant':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending-review':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-white/20 rounded-xl w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-32 bg-white/20 rounded-xl backdrop-blur"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!complianceData) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="h2 sidebar-gradient-text">Compliance Tracking</h2>
          <p className="body-2 text-slate-700">
            Monitor contract compliance status and risk factors
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-white/20 backdrop-blur border border-white/40 hover:bg-white/30"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-white/20 backdrop-blur border border-white/40 hover:bg-white/30"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overall Compliance Rate */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <span className="text-green-800">Overall Compliance Rate</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="h1 text-green-800 font-bold">
                {complianceData.overall.rate}%
              </div>
              <div className="flex items-center space-x-2 mt-2">
                {complianceData.overall.trend === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm text-green-700">
                  {complianceData.overall.change > 0 ? '+' : ''}
                  {complianceData.overall.change}% from last period
                </span>
              </div>
            </div>
            <div className="w-32">
              <Progress value={complianceData.overall.rate} className="h-3" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Status Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {complianceData.byStatus.map((status, index) => (
          <Card
            key={index}
            className="bg-white/60 backdrop-blur border border-white/40 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="body-2 text-slate-700 capitalize">
                {status.status.replace('-', ' ')}
              </CardTitle>
              {getStatusIcon(status.status)}
            </CardHeader>
            <CardContent>
              <div className="h2 text-navy font-bold mb-2">
                {status.count.toLocaleString()}
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">
                  {status.percentage}% of total
                </span>
                <Badge className={getStatusColor(status.status)}>
                  {status.status.replace('-', ' ')}
                </Badge>
              </div>
              <Progress value={status.percentage} className="h-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Risk Factors */}
      <Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <span className="sidebar-gradient-text">Risk Factors</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {complianceData.riskFactors.map((risk, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-white/40 rounded-lg border border-white/60"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-semibold text-slate-800">
                      {risk.factor}
                    </h4>
                    <Badge className={getImpactColor(risk.impact)}>
                      {risk.impact}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">{risk.description}</p>
                </div>
                <div className="text-right">
                  <div className="h2 text-navy font-bold">{risk.count}</div>
                  <div className="text-xs text-slate-500">contracts</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Renewals */}
      <Card className="bg-white/60 backdrop-blur border border-white/40 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <span className="sidebar-gradient-text">Upcoming Renewals</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {complianceData.upcomingRenewals.map((renewal, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-white/40 rounded-lg border border-white/60 hover:bg-white/60 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-semibold text-slate-800">
                      {renewal.name}
                    </h4>
                    <Badge className={getStatusColor(renewal.status)}>
                      {renewal.status.replace('-', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">{renewal.vendor}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-800">
                    {renewal.daysUntilExpiry > 0
                      ? `${renewal.daysUntilExpiry} days`
                      : 'Overdue'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(renewal.expiryDate).toLocaleDateString()}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 hover:bg-white/60"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComplianceTracking;
