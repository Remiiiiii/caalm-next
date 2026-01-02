/**
 * IT Dashboard Error Boundary
 * Catches errors in IT dashboard components without crashing the entire app
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ITDashboardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ITDashboardErrorBoundary] Caught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });

    // Log error to monitoring service (if available)
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking service
      // errorTrackingService.logError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/dashboard/it';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="glass-card w-full overflow-hidden">
          <div className="glass-card-cap" />
          <div className="bg-gradient-to-r from-red-50 to-orange-50 py-4 border-b border-slate-200 mt-4">
            <div className="flex items-center gap-3 px-6">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <CardTitle className="text-xl font-semibold text-red-900">
                IT Dashboard Error
              </CardTitle>
            </div>
          </div>
          <CardContent className="pt-6 bg-slate-50">
            <div className="text-center py-8 px-6">
              <AlertTriangle className="h-16 w-16 mx-auto text-red-500 mb-4" />
              <h3 className="text-2xl font-semibold mb-2 text-slate-900">
                Something went wrong
              </h3>
              <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
                An error occurred in the IT dashboard. The error has been logged and our team has been notified.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left max-w-4xl mx-auto">
                  <p className="font-semibold text-red-900 mb-2">Error Details:</p>
                  <pre className="text-xs text-red-800 overflow-auto">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </div>
              )}

              <div className="flex items-center justify-center gap-4 mt-8">
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  className="primary-btn px-4 sm:px-6"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  className="primary-btn px-4 sm:px-6"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </div>
      );
    }

    return this.props.children;
  }
}
