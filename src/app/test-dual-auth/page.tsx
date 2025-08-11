'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TwoFactorVerificationModal from '@/components/TwoFactorVerificationModal';
import { Shield, Mail, Smartphone } from 'lucide-react';

export default function TestDualAuthPage() {
  const [showTOTP, setShowTOTP] = useState(false);
  const [testUserId] = useState('test-user-123');
  const [testEmail] = useState('test@example.com');

  const handleTOTPSuccess = () => {
    console.log('TOTP verification completed successfully!');
    setShowTOTP(false);
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Dual Authentication Test</h1>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            Test Dual Authentication Flow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Authentication Flow</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <Mail className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium">Step 1: Email OTP Verification</p>
                  <p className="text-sm text-gray-600">
                    Enter the 6-digit code sent to your email
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <Smartphone className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">
                    Step 2: Two-Factor Authentication
                  </p>
                  <p className="text-sm text-gray-600">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Information</h3>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Test User ID:</strong> {testUserId}
              </p>
              <p>
                <strong>Test Email:</strong> {testEmail}
              </p>
              <p className="text-gray-600">
                This simulates a user who has already set up 2FA and is signing
                in again.
              </p>
            </div>
          </div>

          <Button
            onClick={() => setShowTOTP(true)}
            className="w-full bg-blue-500 hover:bg-blue-600"
            size="lg"
          >
            Start TOTP Verification Test
          </Button>
        </CardContent>
      </Card>

      {showTOTP && (
        <TwoFactorVerificationModal
          userId={testUserId}
          email={testEmail}
          onSuccess={handleTOTPSuccess}
          onClose={() => setShowTOTP(false)}
        />
      )}
    </div>
  );
}
