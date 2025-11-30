'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/constants/permissions';

export const dynamic = 'force-dynamic';

const DepartmentsAnalyticsPage = () => {
  const { permissions, loading } = usePermissions();
  const router = useRouter();

  // Redirect to main analytics page with organization tab active
  useEffect(() => {
    if (!loading) {
      // Always redirect to the main analytics page with the organization tab
      router.replace('/analytics?tab=organization');
    }
  }, [loading, router]);

  // Show loading while redirecting
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <div className="h-8 bg-white/20 rounded-xl w-1/3 mb-2 animate-pulse"></div>
        <div className="h-4 bg-white/20 rounded-xl w-1/2 animate-pulse"></div>
      </div>
      <div className="bg-white/30 backdrop-blur border border-white/40 shadow-lg rounded-xl p-6">
        <div className="h-6 bg-white/20 rounded-lg w-1/4 mb-6 animate-pulse"></div>
        <div className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-white/20 rounded-xl animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentsAnalyticsPage;
