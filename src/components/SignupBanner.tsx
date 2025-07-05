'use client';
import { useSearchParams } from 'next/navigation';

export default function SignupBanner() {
  const searchParams = useSearchParams();
  const signupSuccess = searchParams.get('signup') === 'success';

  if (!signupSuccess) return null;

  return (
    <div className="relative flex items-center justify-center px-6 py-4 mb-6 rounded-lg shadow-lg bg-gradient-to-r from-green-100 via-white to-green-50 border border-green-300">
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
      <div className="flex flex-col items-center justify-center ml-14 text-center">
        <div className="text-[#1A9FF1] font-semibold text-lg">
          Thank you for signing up!{' '}
        </div>
        <span className="block font-normal text-base mt-1">
          Our team will review your registration and send you an invitation link
          to your email address.
        </span>
      </div>
    </div>
  );
}
