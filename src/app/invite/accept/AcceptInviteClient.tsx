'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import OTPModal from '@/components/OTPModal';

export default function AcceptInviteClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');
  const [error, setError] = useState('');
  const [inviteData, setInviteData] = useState<{
    email: string;
    accountId: string;
    role: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided.');
      setIsLoading(false);
      return;
    }

    fetch(`/api/invite/accept?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.success) {
          setInviteData({
            email: data.email,
            accountId: data.accountId,
            role: data.role,
          });
        } else {
          setError(data?.error || 'Failed to accept invitation.');
        }
      })
      .catch(() => {
        setError('Invalid or expired invitation.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token]);

  if (isLoading) return <div>Loading...</div>;

  if (error) return <div>Error: {error}</div>;

  if (!inviteData) return <div>No invitation data available.</div>;

  return (
    <OTPModal
      email={inviteData.email}
      accountId={inviteData.accountId}
      onSuccess={() => {
        // Redirect to dashboard based on role
        if (inviteData.role === 'executive')
          router.push('/dashboard/executive');
        else if (inviteData.role === 'manager')
          router.push('/dashboard/manager');
        else if (inviteData.role === 'admin') router.push('/dashboard/admin');
        else router.push('/dashboard');
      }}
      onClose={() => {
        router.push('/sign-in');
      }}
    />
  );
}
