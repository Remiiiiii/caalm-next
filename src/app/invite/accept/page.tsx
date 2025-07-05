'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { acceptInvitation } from '@/lib/actions/user.actions'; // Your backend action
import OTPModal from '@/components/OTPModal';

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [email, setEmail] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('No invitation token found.');
      return;
    }
    // Accept the invitation and create the user if needed
    (async () => {
      try {
        const res = await acceptInvitation({ token });
        if (res && res.email && res.accountId) {
          setEmail(res.email);
          setAccountId(res.accountId);
        } else {
          setError('Invalid or expired invitation.');
        }
      } catch {
        setError('Failed to accept invitation.');
      }
    })();
  }, [token]);

  if (error) return <div>{error}</div>;
  if (!accountId || !email) return <div>Loading...</div>;

  return (
    <OTPModal
      email={email}
      accountId={accountId}
      onSuccess={() => {
        // After OTP verification, redirect to sign-in
        router.push('/sign-in');
      }}
    />
  );
}
