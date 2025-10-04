'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AcceptInviteClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');
  const [error, setError] = useState('');
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
          // Store invitation acceptance success in sessionStorage for sign-in page
          sessionStorage.setItem(
            'invitationAccepted',
            JSON.stringify({
              email: data.email,
              role: data.role,
              department: data.department,
            })
          );

          // Redirect to sign-in page instead of showing OTP modal directly
          router.push('/sign-in?invitation=accepted');
        } else {
          setError(data?.error || 'Failed to accept invitation.');
          setIsLoading(false);
        }
      })
      .catch(() => {
        setError('Invalid or expired invitation.');
        setIsLoading(false);
      });
  }, [token]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing your invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-red-800 mb-2">
              Invitation Error
            </h2>
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => router.push('/sign-in')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
