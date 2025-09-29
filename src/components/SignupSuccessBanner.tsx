'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Clock, Mail } from 'lucide-react';

const SignupSuccessBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const signupSuccess = searchParams?.get('signup');
    if (signupSuccess === 'success') {
      setIsVisible(true);

      // Auto-hide after 10 seconds
      // const timer = setTimeout(() => {
      //   setIsVisible(false);
      // }, 100000);
    }
  }, [searchParams]);

  if (!isVisible) return null;

  return (
    <div className="relative z-30 w-full max-w-3xl mx-auto px-4 py-4">
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl shadow-lg p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <CheckCircle className="h-8 w-8 text-green" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold sidebar-gradient-text mb-2">
              Thank you for signing up with CAALM Solutions!
            </h3>
            <p className="text-slate-700 mb-4">
              Your account request has been received and is currently under
              review.
            </p>

            <div className="bg-white/60 rounded-lg p-4 border border-green-100">
              <div className="flex items-center gap-3 mb-1">
                <Clock className="h-5 w-5 text-[#626364]" />
                <span className="font-medium sidebar-gradient-text">
                  What happens next?
                </span>
              </div>
              <ul className="space-y-2 text-sm text-light-100">
                <li className="flex items-center gap-2">
                  <div className="ml-4 w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                  Our team will review your request
                </li>
                <li className="flex items-center gap-3 ">
                  <Mail className="h-5 w-5 text-[#626364] flex-shrink-0" />
                  <span className="font-medium sidebar-gradient-text">
                    If approved, you'll receive an invitation link within 24-48
                    hours
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="ml-4 w-2 h-2 text-slate-700 bg-blue-500 rounded-full flex-shrink-0"></div>
                  Click the link to complete your account setup
                </li>
              </ul>
            </div>

            <div className="mt-4 text-sm text-slate-700">
              If you have any questions, please don't hesitate to contact our
              support team.
            </div>
          </div>

          <button
            onClick={() => setIsVisible(false)}
            className="flex-shrink-0 text-green-600 hover:text-green-800 transition-colors"
            aria-label="Close banner"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignupSuccessBanner;
