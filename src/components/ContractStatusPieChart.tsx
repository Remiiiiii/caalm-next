'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { FileText, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

interface ContractData {
  status: 'active' | 'expiring' | 'completed';
  count: number;
  percentage: number;
  color: string;
  [key: string]: any;
}

interface ContractStatusPieChartProps {
  data?: ContractData[];
}

const ContractStatusPieChart: React.FC<ContractStatusPieChartProps> = ({
  data: propData,
}) => {
  const [contractData, setContractData] = useState<ContractData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock data for development
  const mockData: ContractData[] = [
    {
      status: 'active',
      count: 45,
      percentage: 60,
      color: '#10B981', // Green
    },
    {
      status: 'expiring',
      count: 18,
      percentage: 24,
      color: '#F59E0B', // Amber
    },
    {
      status: 'completed',
      count: 12,
      percentage: 16,
      color: '#6B7280', // Gray
    },
  ];

  useEffect(() => {
    const fetchContractData = async () => {
      try {
        setLoading(true);

        // In production, this would fetch from your API
        // const response = await fetch('/api/contracts/status');
        // const data = await response.json();

        // For now, use mock data
        setContractData(propData || mockData);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load contract data'
        );
        setContractData(mockData); // Fallback to mock data
      } finally {
        setLoading(false);
      }
    };

    fetchContractData();
  }, [propData]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'expiring':
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case 'completed':
        return <FileText className="h-4 w-4 text-slate-600" />;
      default:
        return <FileText className="h-4 w-4 text-slate-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'expiring':
        return 'Expiring';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/90 backdrop-blur-sm border border-white/40 rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            {getStatusIcon(data.status)}
            <span className="text-sm font-semibold text-slate-800">
              {getStatusLabel(data.status)}
            </span>
          </div>
          <div className="text-xs text-slate-600">
            <div>
              Count: <span className="font-semibold">{data.count}</span>
            </div>
            <div>
              Percentage:{' '}
              <span className="font-semibold">{data.percentage}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="w-[320px] h-[290px] bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-md border border-white/30 shadow-xl overflow-hidden">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold sidebar-gradient-text">
            Contract Status
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-center justify-center h-32">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-600"></div>
              <p className="text-xs text-slate-500 font-medium">
                Loading contracts...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && contractData.length === 0) {
    return (
      <Card className="w-[320px] h-[290px] bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-md border border-white/30 shadow-xl overflow-hidden">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold sidebar-gradient-text">
            Contract Status
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex flex-col items-center justify-center h-32 gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
              <FileText className="h-5 w-5 text-red-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700">
                Data Unavailable
              </p>
              <p className="text-xs text-slate-500">Check your connection</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalContracts = contractData.reduce(
    (sum, item) => sum + item.count,
    0
  );

  return (
    <Card className="w-[320px] h-[290px] bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-md border border-white/30 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-600" />
          <CardTitle className="text-sm font-semibold sidebar-gradient-text">
            Contract Status
          </CardTitle>
        </div>
        <div className="text-xs text-slate-500">
          Total:{' '}
          <span className="font-semibold text-slate-700">{totalContracts}</span>{' '}
          contracts
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-2">
        <div className="space-y-4">
          {/* Main chart display */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={contractData}
                        cx="50%"
                        cy="50%"
                        innerRadius={12}
                        outerRadius={24}
                        paddingAngle={1}
                        dataKey="count"
                      >
                        {contractData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <div className="text-3xl font-bold sidebar-gradient-text tracking-tight">
                  {totalContracts}
                </div>
                <div className="text-sm text-slate-600 capitalize font-medium">
                  Total Contracts
                </div>
              </div>
            </div>

            {/* Active contracts with better styling */}
            <div className="text-right bg-white/30 rounded-lg px-3 py-1 backdrop-blur-sm">
              <div className="text-xs text-slate-500 font-medium">Active</div>
              <div className="text-lg font-semibold text-slate-700">
                {contractData.find((item) => item.status === 'active')?.count ||
                  0}
              </div>
            </div>
          </div>
          <div className="h-px bg-slate-300"></div>
          {/* Contract metrics with improved design */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm border border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">
                    Expiring
                  </div>
                  <div className="text-sm font-bold text-slate-700">
                    {contractData.find((item) => item.status === 'expiring')
                      ?.count || 0}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm border border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-4 w-4 text-slate-600" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">
                    Completed
                  </div>
                  <div className="text-sm font-bold text-slate-700">
                    {contractData.find((item) => item.status === 'completed')
                      ?.count || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Contract status indicator */}
          <div className="flex items-center justify-center mb-2">
            <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-1 backdrop-blur-sm border border-white/20">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-xs text-slate-600 font-medium">
                Live Contract Data
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContractStatusPieChart;
