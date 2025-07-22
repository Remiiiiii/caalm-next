'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, TrendingUp } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import { Models } from 'appwrite';

interface QuickActionsProps {
  user?: Models.User<Models.Preferences> | null;
}

const QuickActions = ({ user }: QuickActionsProps) => {
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
        <FileUploader
          ownerId={user.$id}
          accountId={user.$id}
          className="primary-btn h-10 px-4 shadow-drop-1 text-sm"
        />
      )}
      <Button className="primary-btn h-10 px-4 shadow-drop-1 text-sm">
        <Calendar className="h-4 w-4" />
        Schedule Review
      </Button>
      <Button className="primary-btn h-10 gap-2 px-4 shadow-drop-1 text-sm">
        <TrendingUp className="h-4 w-4" />
        Generate Report
      </Button>
    </div>
  );
};

export default QuickActions;
