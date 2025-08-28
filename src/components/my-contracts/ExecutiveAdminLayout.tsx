'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  CONTRACT_DEPARTMENTS,
  DIVISION_TO_DEPARTMENT,
  UserDivision,
} from '../../../constants';
import ContractsGrid from './ContractsGrid';
import { useMyContracts } from '@/hooks/useMyContracts';

const ExecutiveAdminLayout: React.FC = () => {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const { contracts, loading, error } = useMyContracts();

  // Get divisions for the selected department
  const getDivisionsForDepartment = (department: string): UserDivision[] => {
    if (department === 'all') return [];

    return Object.entries(DIVISION_TO_DEPARTMENT)
      .filter(([_, dept]) => dept === department)
      .map(([division]) => division as UserDivision);
  };

  // Filter contracts based on selected department and division
  const getFilteredContracts = () => {
    if (!contracts) return [];

    return contracts.filter((contract) => {
      // If "all" is selected, show all contracts
      if (selectedDepartment === 'all') return true;

      // Filter by department
      if (contract.department !== selectedDepartment) return false;

      // If division is selected, filter by division
      if (selectedDivision !== 'all') {
        // This would need to be implemented based on your contract data structure
        // For now, we'll assume contracts have a division field
        return contract.division === selectedDivision;
      }

      return true;
    });
  };

  const filteredContracts = getFilteredContracts();
  const divisions = getDivisionsForDepartment(selectedDepartment);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative flex items-center justify-between">
        <Link href="/dashboard">
          <Button
            variant="outline"
            size="sm"
            className="bg-white/60 backdrop-blur border border-white/40 hover:bg-white/30 transition-all duration-300"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="absolute left-1/2 -translate-x-1/2 h1 sidebar-gradient-text text-center w-full pointer-events-none">
          My Contracts
        </h1>
      </div>

      {/* Department Navigation */}
      <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
        <CardHeader>
          <CardTitle className="h2 sidebar-gradient-text">
            Department Contracts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={selectedDepartment}
            onValueChange={(value) => {
              setSelectedDepartment(value);
              setSelectedDivision('all'); // Reset division when department changes
            }}
            className="w-full"
          >
            <TabsList className="flex w-full bg-white/20 backdrop-blur border border-white/40">
              <TabsTrigger
                value="all"
                className="tabs-underline flex-1 data-[state=active]:bg-white/30 data-[state=active]:text-dark-200"
              >
                All Departments
              </TabsTrigger>
              {CONTRACT_DEPARTMENTS.map((dept) => (
                <TabsTrigger
                  key={dept}
                  value={dept}
                  className="tabs-underline flex-1 data-[state=active]:bg-white/30 data-[state=active]:text-dark-200"
                >
                  {dept}
                </TabsTrigger>
              ))}
            </TabsList>

            {CONTRACT_DEPARTMENTS.map((dept) => (
              <TabsContent key={dept} value={dept} className="mt-6">
                {divisions.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-slate-700 mb-3">
                      Divisions
                    </h3>
                    <Tabs
                      value={selectedDivision}
                      onValueChange={setSelectedDivision}
                      className="w-full"
                    >
                      <TabsList className="flex w-full bg-white/20 backdrop-blur border border-white/40">
                        <TabsTrigger
                          value="all"
                          className="tabs-underline flex-1 data-[state=active]:bg-white/30 data-[state=active]:text-dark-200"
                        >
                          All Divisions
                        </TabsTrigger>
                        {divisions.map((division) => (
                          <TabsTrigger
                            key={division}
                            value={division}
                            className="tabs-underline flex-1 data-[state=active]:bg-white/30 data-[state=active]:text-dark-200"
                          >
                            {division
                              .split('-')
                              .map(
                                (word) =>
                                  word.charAt(0).toUpperCase() + word.slice(1)
                              )
                              .join(' ')}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  </div>
                )}

                <ContractsGrid
                  contracts={filteredContracts}
                  loading={loading}
                  error={error}
                  userRole="executive"
                />
              </TabsContent>
            ))}

            <TabsContent value="all" className="mt-6">
              <ContractsGrid
                contracts={filteredContracts}
                loading={loading}
                error={error}
                userRole="executive"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExecutiveAdminLayout;
