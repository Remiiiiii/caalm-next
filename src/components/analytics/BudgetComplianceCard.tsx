'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Enhanced compliance data structure matching requirements
const complianceData = [
  {
    department: 'Administrative',
    contractId: 'ADM-2024-001',
    complianceType: 'Training Requirements',
    required: 12,
    completed: 12,
    complianceRate: 100,
    status: 'Fully Compliant',
    financialImpact: '$150,000',
  },
  {
    department: 'Operations',
    contractId: 'OPS-2024-002',
    complianceType: 'Safety Training',
    required: 8,
    completed: 7,
    complianceRate: 87.5,
    status: 'At Risk',
    financialImpact: '$200,000',
  },
  {
    department: 'Finance',
    contractId: 'FIN-2024-003',
    complianceType: 'Audit Requirements',
    required: 4,
    completed: 2,
    complianceRate: 50,
    status: 'Non-Compliant',
    financialImpact: '$100,000',
  },
  {
    department: 'HR',
    contractId: 'HR-2024-004',
    complianceType: 'Policy Adherence',
    required: 6,
    completed: 5,
    complianceRate: 83.3,
    status: 'Pending Review',
    financialImpact: '$75,000',
  },
];

// Process data for pie chart
const getCompliancePieData = () => {
  const statusCounts = {
    'Fully Compliant': 0,
    'At Risk': 0,
    'Non-Compliant': 0,
    'Pending Review': 0,
  };

  complianceData.forEach((item) => {
    statusCounts[item.status as keyof typeof statusCounts]++;
  });

  return [
    {
      name: 'Fully Compliant',
      value: statusCounts['Fully Compliant'],
      color: '#10B981',
      percentage: (
        (statusCounts['Fully Compliant'] / complianceData.length) *
        100
      ).toFixed(1),
    },
    {
      name: 'At Risk',
      value: statusCounts['At Risk'],
      color: '#F59E0B',
      percentage: (
        (statusCounts['At Risk'] / complianceData.length) *
        100
      ).toFixed(1),
    },
    {
      name: 'Non-Compliant',
      value: statusCounts['Non-Compliant'],
      color: '#EF4444',
      percentage: (
        (statusCounts['Non-Compliant'] / complianceData.length) *
        100
      ).toFixed(1),
    },
    {
      name: 'Pending Review',
      value: statusCounts['Pending Review'],
      color: '#6B7280',
      percentage: (
        (statusCounts['Pending Review'] / complianceData.length) *
        100
      ).toFixed(1),
    },
  ].filter((item) => item.value > 0);
};

// Mock data for Budget Allocation
const budgetData = [
  { department: 'Child Welfare', budget: 450000, spent: 380000 },
  { department: 'Behavioral Health', budget: 320000, spent: 295000 },
  { department: 'CINS/FINS/SNAP', budget: 280000, spent: 265000 },
  { department: 'Residential', budget: 380000, spent: 345000 },
  { department: 'Clinic', budget: 290000, spent: 275000 },
  { department: 'Administration', budget: 180000, spent: 165000 },
];

const BudgetComplianceCard = () => {
  const [budgetHovered, setBudgetHovered] = useState(false);
  const [complianceHovered, setComplianceHovered] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const pieData = getCompliancePieData();

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: unknown[];
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0] as {
        payload: { name: string; percentage: string };
      };
      const departmentData = complianceData.find(
        (item) => item.status === data.payload.name
      );

      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.payload.name}</p>
          <p className="text-sm text-gray-600">
            {data.payload.percentage}% of contracts
          </p>
          {departmentData && (
            <>
              <p className="text-xs text-gray-500 mt-1">
                Contract Value: {departmentData.financialImpact}
              </p>
              <p className="text-xs text-gray-500">
                Compliance: {departmentData.completed}/{departmentData.required}
                ({departmentData.complianceRate}%)
              </p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  const onPieEnter = (_: unknown, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  return (
    <div className="z-50 mt-[-200px] grid grid-cols-1 lg:grid-cols-2 gap-6 ml-auto pr-6">
      {/* Contractual Compliance Card */}
      <Card
        className={`transition-all duration-300 ease-in-out ${
          complianceHovered
            ? 'scale-105 shadow-2xl bg-white/70 border-white/50'
            : 'bg-white/60 backdrop-blur-md border-white/40 shadow-lg'
        }`}
        onMouseEnter={() => setComplianceHovered(true)}
        onMouseLeave={() => setComplianceHovered(false)}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold sidebar-gradient-text transition-colors duration-300">
            Contractual Compliance
          </CardTitle>
          <CardDescription className="text-sm text-slate-600 transition-colors duration-300">
            Contract compliance status by department
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name} ${percentage}%`}
                outerRadius={80}
                innerRadius={40}
                paddingAngle={3}
                dataKey="value"
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke={activeIndex === index ? '#000' : '#fff'}
                    strokeWidth={activeIndex === index ? 2 : 1}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value, entry) => (
                  <span style={{ color: entry.color, fontSize: '12px' }}>
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Budget Allocation Card */}
      <Card
        className={`transition-all duration-300 ease-in-out ${
          budgetHovered
            ? 'scale-105 shadow-2xl bg-white/70 border-white/50'
            : 'bg-white/60 backdrop-blur-md border-white/40 shadow-lg'
        }`}
        onMouseEnter={() => setBudgetHovered(true)}
        onMouseLeave={() => setBudgetHovered(false)}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold sidebar-gradient-text transition-colors duration-300">
            Budget Allocation
          </CardTitle>
          <CardDescription className="text-sm text-slate-600 transition-colors duration-300">
            Department budget distribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={budgetData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(0,0,0,0.1)"
                horizontal={true}
                vertical={false}
              />
              <XAxis dataKey="department" stroke="#524E4E" fontSize={12} />
              <YAxis
                stroke="#524E4E"
                fontSize={12}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number) => [
                  `$${value.toLocaleString()}`,
                  'Amount',
                ]}
                contentStyle={{
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar
                dataKey="budget"
                fill="#03AFBF"
                name="Budget"
                radius={[2, 2, 0, 0]}
              />
              <Bar
                dataKey="spent"
                fill="#56B8FF"
                name="Spent"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default BudgetComplianceCard;
