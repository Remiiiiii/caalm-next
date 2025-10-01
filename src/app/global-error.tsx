'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Global error boundary caught:', error);
    }
  }, [error]);

  // In production, show a minimal error page
  if (process.env.NODE_ENV === 'production') {
    return (
      <html>
        <body>
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-medium text-gray-900 text-center mb-2">
                Something went wrong
              </h2>
              <p className="text-sm text-gray-600 text-center mb-6">
                We're sorry, but something unexpected happened. Please try
                again.
              </p>
              <div className="flex justify-center">
                <button
                  onClick={reset}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </body>
      </html>
    );
  }

  // In development, show detailed error information
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-2xl w-full bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Global Error
            </h2>
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <p className="text-sm text-red-800 font-medium mb-2">
                Error Message:
              </p>
              <p className="text-sm text-red-700">{error.message}</p>
              {error.digest && (
                <>
                  <p className="text-sm text-red-800 font-medium mb-2 mt-3">
                    Error Digest:
                  </p>
                  <p className="text-sm text-red-700 font-mono">
                    {error.digest}
                  </p>
                </>
              )}
            </div>
            <div className="flex justify-center">
              <button
                onClick={reset}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
