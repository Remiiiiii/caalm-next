'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Calendar, TrendingUp } from 'lucide-react';
import ReportGenerator from '@/components/ReportGenerator';
import { Models } from 'appwrite';
import { useUserRoles } from '@/hooks/useUserRoles';

// Lazy load ContractUploadForm for better performance
const ContractUploadForm = dynamic(
  () => import('@/components/ContractUploadForm'),
  {
    ssr: false,
    loading: () => null, // No loader for trigger button
  }
);

interface QuickActionsProps {
  user?:
    | (Models.User<Models.Preferences> & {
        division?: string;
      })
    | null;
}

const QuickActions = ({ user }: QuickActionsProps) => {
  const [reportOpen, setReportOpen] = useState(false);
  const { roles: userRoles } = useUserRoles();

  // Check if user has IT role
  const isITUser = useMemo(() => {
    return userRoles.some((r) => r.roleName === 'IT');
  }, [userRoles]);

  return (
    <div className="quick-actions-container flex items-center gap-1.5 sm:gap-2 flex-nowrap min-w-0 overflow-x-auto remove-scrollbar">
      {/* IT users only see Schedule Review and Generate Report */}
      {!isITUser && user && (
        <>
          <ContractUploadForm
            ownerId={user.$id}
            accountId={user.$id}
            className="primary-btn h-9 sm:h-10 px-4 shadow-drop-1 text-xs whitespace-nowrap flex-shrink-0 gap-2"
            onSuccess={() => {
              // Refresh data or show success message
              console.log('Contract uploaded successfully');
            }}
          />
        </>
      )}
      {!isITUser && (
        <>
          <Button className="primary-btn h-9 sm:h-10 px-4 shadow-drop-1 text-xs whitespace-nowrap flex-shrink-0 gap-2">
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Upload Audit
          </Button>
          <Button className="primary-btn h-9 sm:h-10 px-4 shadow-drop-1 text-xs whitespace-nowrap flex-shrink-0 gap-2">
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Upload License
          </Button>
        </>
      )}
      <Button className="primary-btn h-9 sm:h-10 px-4 shadow-drop-1 text-xs whitespace-nowrap flex-shrink-0 gap-2">
        <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        Schedule Review
      </Button>
      <Button
        className="primary-btn h-9 sm:h-10 px-4 shadow-drop-1 text-xs whitespace-nowrap flex-shrink-0 gap-2"
        onClick={() => setReportOpen(true)}
      >
        <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        Generate Report
      </Button>
      <ReportGenerator
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        department={user?.division}
        user={user}
      />
    </div>
  );
};

export default QuickActions;
