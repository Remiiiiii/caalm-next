'use client';

import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { Key } from 'lucide-react';
import type { License } from '@/types/licenses';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-config';

interface LicenseStatusPieChartProps {
  licenses?: License[];
}

const COLORS = {
  active: '#10B981',
  expired: '#EF4444',
  suspended: '#6B7280',
};

export default function LicenseStatusPieChart({
  licenses: propsLicenses,
}: LicenseStatusPieChartProps) {
  const { data, error, isLoading } = useSWR(
    propsLicenses ? null : '/api/licenses',
    fetcher,
    {
      refreshInterval: 300000,
      revalidateOnFocus: false,
    }
  );

  const licenses =
    propsLicenses ?? data?.data?.licenses ?? data?.licenses ?? [];

  const chartData = useMemo(() => {
    const statusCounts: Record<string, number> = {};

    licenses.forEach((license: License) => {
      const status = license.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const total = licenses.length;

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      value: count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      color: COLORS[status as keyof typeof COLORS] || '#9CA3AF',
    }));
  }, [licenses]);

  if (isLoading) {
    return (
      <Card className="glass-card">
        <div className="glass-card-cap" />
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Key className="h-5 w-5 text-[#0f5384]" />
            <h3 className="text-lg font-semibold sidebar-gradient-text">
              License Status
            </h3>
          </div>
          <div className="text-center py-8 text-slate-500">
            <p className="text-sm">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="glass-card">
        <div className="glass-card-cap" />
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Key className="h-5 w-5 text-[#0f5384]" />
            <h3 className="text-lg font-semibold sidebar-gradient-text">
              License Status
            </h3>
          </div>
          <div className="text-center py-8 text-red">
            <p className="text-sm">Error loading licenses</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (licenses.length === 0) {
    return (
      <Card className="glass-card">
        <div className="glass-card-cap" />
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Key className="h-5 w-5 text-[#0f5384]" />
            <h3 className="text-lg font-semibold sidebar-gradient-text">
              License Status
            </h3>
          </div>
          <div className="text-center py-8 text-slate-500">
            <p className="text-sm">No license data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <div className="glass-card-cap" />
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Key className="h-5 w-5 text-[#0f5384]" />
          <h3 className="text-lg font-semibold sidebar-gradient-text">
            License Status
          </h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 space-y-2">
          {chartData.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-slate-700">{item.name}</span>
              </div>
              <span className="font-medium text-slate-900">
                {item.value} ({item.percentage}%)
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
