'use client';

import React from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import ExecutiveAdminLayout from './ExecutiveAdminLayout';
import ManagerLayout from './ManagerLayout';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const MyContractsLayout: React.FC = () => {
  const { role, division, loading } = useUserRole();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-white/20 rounded-xl w-1/3 mb-4"></div>
          <div className="h-4 bg-white/20 rounded-xl w-1/2 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
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

  // Check if user has access to My Contracts
  const hasAccess = ['executive', 'admin', 'manager'].includes(role);

  if (!hasAccess) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h1 className="h2 text-dark-200 mb-4">Access Denied</h1>
          <p className="body-1 text-light-200 mb-6">
            You don&apos;t have permission to view My Contracts.
          </p>
          <Link href="/dashboard">
            <Button className="bg-white/20 backdrop-blur border text-slate-700 border-white/40 hover:bg-white/30 transition-all duration-300">
              <ArrowLeft className="h-4 w-4 mr-2 text-slate-700" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Render appropriate layout based on role
  if (role === 'executive' || role === 'admin') {
    return <ExecutiveAdminLayout />;
  }

  if (role === 'manager') {
    return <ManagerLayout userDivision={division} />;
  }

  // Fallback
  return (
    <div className="space-y-6">
      <div className="text-center py-12">
        <h1 className="h2 text-dark-200 mb-4">Role Not Supported</h1>
        <p className="body-1 text-light-200 mb-6">
          Your current role is not supported for My Contracts.
        </p>
        <Link href="/dashboard">
          <Button className="bg-white/20 backdrop-blur border text-slate-700 border-white/40 hover:bg-white/30 transition-all duration-300">
            <ArrowLeft className="h-4 w-4 mr-2 text-slate-700" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default MyContractsLayout;
