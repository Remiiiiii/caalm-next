'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import ContractsGrid from './ContractsGrid';
import { useMyContracts } from '@/hooks/useMyContracts';
import { DIVISION_TO_DEPARTMENT } from '../../../constants';
import { ManagerLayoutProps } from '@/types/my-contracts';

const ManagerLayout: React.FC<ManagerLayoutProps> = ({ userDivision }) => {
  const { contracts, loading, error } = useMyContracts();

  // Filter contracts for manager's department
  const getManagerContracts = () => {
    if (!contracts || !userDivision) return [];

    const userDepartment =
      DIVISION_TO_DEPARTMENT[
        userDivision as keyof typeof DIVISION_TO_DEPARTMENT
      ];

    return contracts.filter((contract) => {
      // Filter by department
      return contract.department === userDepartment;
    });
  };

  const managerContracts = getManagerContracts();

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

      {/* Manager Contracts Grid */}
      <ContractsGrid
        contracts={managerContracts}
        loading={loading}
        error={error}
        userRole="manager"
      />
    </div>
  );
};

export default ManagerLayout;
