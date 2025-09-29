'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error boundary caught an error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // In production, show a generic error message
      if (process.env.NODE_ENV === 'production') {
        return (
          this.props.fallback || (
            <div className="p-6 text-center">
              <div className="text-red-600 mb-4">⚠️ Something went wrong</div>
              <p className="text-gray-600 mb-4">
                We're sorry, but something unexpected happened. Please try
                again.
              </p>
              <button
                onClick={() =>
                  this.setState({ hasError: false, error: undefined })
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )
        );
      }

      // In development, show detailed error information
      return (
        <div className="p-6 text-center">
          <div className="text-red-600 mb-4">⚠️ Error</div>
          <p className="text-red-700 mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
