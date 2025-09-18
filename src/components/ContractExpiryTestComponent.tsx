'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

interface ContractExpiryResponse {
  success: boolean;
  message?: string;
  error?: string;
  details?: string;
  timestamp?: string;
}

export default function ContractExpiryTestComponent() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ContractExpiryResponse | null>(null);

  const checkContractExpiry = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/contracts/check-expiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data: ContractExpiryResponse = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: 'Failed to check contract expiry',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Contract Expiry Check
        </CardTitle>
        <CardDescription>
          Manually trigger contract expiry detection and SMS notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            This will scan all contracts in the database and send SMS
            notifications for contracts expiring within 30 days.
          </p>
          <p className="text-sm text-gray-600">
            <strong>Current test contract:</strong> "Notification Testing
            Contract" expires on August 30, 2025 (5 days from now)
          </p>
        </div>

        <Button
          onClick={checkContractExpiry}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Clock className="w-4 h-4 mr-2 animate-spin" />
              Checking Contracts...
            </>
          ) : (
            <>
              <Calendar className="w-4 h-4 mr-2" />
              Check Contract Expiry
            </>
          )}
        </Button>

        {result && (
          <Alert
            className={
              result.success
                ? 'border-green-200 bg-green-50'
                : 'border-red-200 bg-red-50'
            }
          >
            {result.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription
              className={result.success ? 'text-green-800' : 'text-red-800'}
            >
              <div className="font-medium">
                {result.success ? 'Success!' : 'Error'}
              </div>
              <div className="text-sm mt-1">
                {result.message || result.error}
              </div>
              {result.details && (
                <div className="text-xs mt-1 opacity-75">{result.details}</div>
              )}
              {result.timestamp && (
                <div className="text-xs mt-1 opacity-75">
                  Timestamp: {new Date(result.timestamp).toLocaleString()}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p>
            <strong>Expected behavior:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Scans all contracts in the database</li>
            <li>Finds "Notification Testing Contract" (5 days until expiry)</li>
            <li>Sends SMS to +12547218691 (if Twilio configured)</li>
            <li>Creates notification in database</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
