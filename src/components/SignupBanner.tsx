'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SignupBanner() {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSignupSuccess(searchParams?.get('signup') === 'success');
  }, [searchParams]);

  // Don't render anything until the component is mounted on the client
  if (!mounted) return null;
  if (!signupSuccess) return null;

  return (
    <div className="relative z-50 mt-4 w-[850px] rounded-full mx-auto flex items-center justify-center px-6 pt-4 mb-6  shadow-lg bg-gradient-to-r from-green-100 via-white to-green-50 border border-green-300">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 bg-green-200 rounded-full shadow-md">
        <svg
          className="w-6 h-6 text-green-600"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            className="text-[#1A9FF1]"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2l4-4m5 2a9 9 0 11-18 0a9 9 0 0118 0z"
          />
        </svg>
      </div>
      <div className="flex flex-col items-center justify-center mx-auto mb-6 text-center">
        <div className="text-[#1A9FF1] font-semibold text-lg">
          Thank you for signing up!{' '}
        </div>
        <span className="block font-normal text-base mb-2">
          Our team will review your registration and send you an invitation link
          to your email address.
        </span>
      </div>
    </div>
  );
}
