'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import OTPModal from '@/components/OTPModal';

export default function AcceptInviteClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const accountId = searchParams.get('accountId');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided.');
      return;
    }
    fetch(`/api/invite/accept?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.success) {
          // Redirect to dashboard based on role
          if (data.role === 'executive')
            window.location.href = '/dashboard/executive';
          else if (data.role === 'manager')
            window.location.href = '/dashboard/manager';
          else if (data.role === 'admin')
            window.location.href = '/dashboard/admin';
          else window.location.href = '/dashboard';
        } else {
          setError(data?.error || 'Failed to accept invitation.');
        }
      })
      .catch(() => {
        setError('Invalid or expired invitation.');
      });
  }, [token]);

  if (error) return <div>Error: {error}</div>;

  if (!email || !accountId) return <div>Loading...</div>;

  return (
    <OTPModal
      email={email}
      accountId={accountId}
      onSuccess={() => {
        router.push('/sign-in');
      }}
    />
  );
}
