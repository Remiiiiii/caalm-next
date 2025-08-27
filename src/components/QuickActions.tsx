'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, TrendingUp } from 'lucide-react';
import ContractUploadForm from '@/components/ContractUploadForm';
import ReportGenerator from '@/components/ReportGenerator';
import { Models } from 'appwrite';

interface QuickActionsProps {
  user?:
    | (Models.User<Models.Preferences> & {
        division?: string;
      })
    | null;
}

const QuickActions = ({ user }: QuickActionsProps) => {
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    // Auto refresh every 30 minutes (30 * 60 * 1000 = 1,800,000 ms)
    const interval = setInterval(() => {
      window.location.reload();
    }, 30 * 60 * 1000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center space-x-2">
      {user && (
        <>
          <ContractUploadForm
            ownerId={user.$id}
            accountId={user.$id}
            className="primary-btn h-10 px-4 shadow-drop-1 text-sm"
            onSuccess={() => {
              // Refresh data or show success message
              console.log('Contract uploaded successfully');
            }}
          />
        </>
      )}
      <Button className="primary-btn h-10 px-4 shadow-drop-1 text-sm">
        <Calendar className="h-4 w-4" />
        Schedule Review
      </Button>
      <Button
        className="primary-btn h-10 gap-2 px-4 shadow-drop-1 text-sm"
        onClick={() => setReportOpen(true)}
      >
        <TrendingUp className="h-4 w-4" />
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
