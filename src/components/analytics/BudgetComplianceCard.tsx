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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

// Department-specific compliance data
const departmentComplianceData = {
  'All Departments': [
    { name: 'Fully Compliant', value: 65, color: '#03AFBF' },
    { name: 'At Risk', value: 25, color: '#56B8FF' },
    { name: 'Non-Compliant', value: 10, color: '#1E40AF' },
  ],
  Administrative: [
    { name: 'Fully Compliant', value: 65, color: '#03AFBF' },
    { name: 'At Risk', value: 25, color: '#56B8FF' },
    { name: 'Non-Compliant', value: 10, color: '#1E40AF' },
  ],
  'Child Welfare': [
    { name: 'Fully Compliant', value: 75, color: '#03AFBF' },
    { name: 'At Risk', value: 20, color: '#56B8FF' },
    { name: 'Non-Compliant', value: 5, color: '#1E40AF' },
  ],
  'Behavioral Health': [
    { name: 'Fully Compliant', value: 70, color: '#03AFBF' },
    { name: 'At Risk', value: 25, color: '#56B8FF' },
    { name: 'Non-Compliant', value: 5, color: '#1E40AF' },
  ],
  'CINS/FINS/SNAP': [
    { name: 'Fully Compliant', value: 85, color: '#03AFBF' },
    { name: 'At Risk', value: 12, color: '#56B8FF' },
    { name: 'Non-Compliant', value: 3, color: '#1E40AF' },
  ],
  Residential: [
    { name: 'Fully Compliant', value: 60, color: '#03AFBF' },
    { name: 'At Risk', value: 30, color: '#56B8FF' },
    { name: 'Non-Compliant', value: 10, color: '#1E40AF' },
  ],
  Clinic: [
    { name: 'Fully Compliant', value: 88, color: '#03AFBF' },
    { name: 'At Risk', value: 10, color: '#56B8FF' },
    { name: 'Non-Compliant', value: 2, color: '#1E40AF' },
  ],
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
  const [selectedDepartment, setSelectedDepartment] =
    useState('All Departments');

  const pieData =
    departmentComplianceData[
      selectedDepartment as keyof typeof departmentComplianceData
    ] || departmentComplianceData['All Departments'];

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: unknown[];
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0] as {
        payload: { name: string; value: number };
      };

      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.payload.name}</p>
          <p className="text-sm text-gray-600">
            {data.payload.value}% of contracts
          </p>
          {selectedDepartment !== 'All Departments' && (
            <p className="text-xs text-gray-500 mt-1">
              Department: {selectedDepartment}
            </p>
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
    <div className="z-50 mt-[-200px] flex gap-6 ml-auto pr-6">
      {/* Contractual Compliance Card */}
      <Card
        className={`transition-all duration-300 ease-in-out w-[490px] ${
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
          <CardDescription className="text-sm text-slate-600 transition-colors duration-300 mb-3">
            Contract compliance status by department
          </CardDescription>
          <Select
            value={selectedDepartment}
            onValueChange={setSelectedDepartment}
          >
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue placeholder="Select Department" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(departmentComplianceData).map((department) => (
                <SelectItem key={department} value={department}>
                  {department}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name} ${value}%`}
                outerRadius={70}
                innerRadius={35}
                paddingAngle={4}
                fontSize={14}
                stroke="#fff"
                strokeWidth={1}
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
                height={50}
                wrapperStyle={{ paddingTop: '20px' }}
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
