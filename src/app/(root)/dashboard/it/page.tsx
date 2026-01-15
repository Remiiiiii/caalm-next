/**
 * IT Dashboard Main Page
 * Overview dashboard with system health, alerts, and quick stats
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ITDashboard from '@/components/ITDashboard';

export default function ITDashboardPage() {
  // Always call all hooks unconditionally at the top level
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/sign-in');
    }
  }, [user, loading, router]);

  // Always render ITDashboard - it handles its own loading state internally
  // This ensures consistent hook calls across renders
  return <ITDashboard />;
}
