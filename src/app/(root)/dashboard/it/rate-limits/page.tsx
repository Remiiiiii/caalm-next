/**
 * Rate Limit Monitoring Dashboard Page
 * Moved from /dashboard/admin/rate-limits to /dashboard/it/rate-limits
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import RateLimitMonitoring from '@/components/admin/RateLimitMonitoring';

export default function RateLimitsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/sign-in');
    }
  }, [user, loading, router]);

  // Always render to maintain hook consistency
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
      <RateLimitMonitoring />
    </div>
  );
}
