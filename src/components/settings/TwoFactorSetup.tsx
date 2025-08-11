'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Shield,
  QrCode,
  Smartphone,
  CheckCircle,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const TwoFactorSetup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('JBSWY3DPEHPK3PXP'); // Demo secret
  const [verificationCode, setVerificationCode] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [step, setStep] = useState<
    'initial' | 'qr' | 'verification' | 'success'
  >('initial');
  const { toast } = useToast();

  const enableTwoFactor = async () => {
    try {
      setIsLoading(true);

      // Generate demo QR code URL (in real implementation, this would come from Appwrite)
      const demoQRUrl = `otpauth://totp/CAALM:${encodeURIComponent(
        'user@example.com'
      )}?secret=${secret}&issuer=CAALM`;
      setQrCode(demoQRUrl);
      setStep('qr');

      toast({
        title: '2FA Setup Started',
        description: 'Scan the QR code with your authenticator app',
      });
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      toast({
        title: 'Error',
        description: 'Failed to enable 2FA. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyTwoFactor = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter a 6-digit verification code',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);

      // Simulate verification (in real implementation, this would verify with Appwrite)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setStep('success');

      toast({
        title: '2FA Enabled Successfully',
        description:
          'Your account is now protected with two-factor authentication',
      });
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      toast({
        title: 'Verification Failed',
        description: 'Invalid verification code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const disableTwoFactor = async () => {
    try {
      setIsLoading(true);

      // Simulate disabling 2FA
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setStep('initial');
      setQrCode('');
      setVerificationCode('');

      toast({
        title: '2FA Disabled',
        description: 'Two-factor authentication has been disabled',
      });
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      toast({
        title: 'Error',
        description: 'Failed to disable 2FA. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const regenerateQR = async () => {
    try {
      setIsLoading(true);

      // Generate new demo secret and QR code
      const newSecret =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      setSecret(newSecret);
      const demoQRUrl = `otpauth://totp/CAALM:${encodeURIComponent(
        'user@example.com'
      )}?secret=${newSecret}&issuer=CAALM`;
      setQrCode(demoQRUrl);

      toast({
        title: 'QR Code Regenerated',
        description: 'Please scan the new QR code',
      });
    } catch (error) {
      console.error('Error regenerating QR:', error);
      toast({
        title: 'Error',
        description: 'Failed to regenerate QR code',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
        <span className="ml-2 text-sm text-light-200">Loading...</span>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span className="text-sm font-medium text-green-500">
            Two-Factor Authentication Enabled
          </span>
        </div>
        <p className="text-sm text-light-200">
          Your account is now protected with two-factor authentication.
          You&apos;ll need to provide a verification code from your
          authenticator app when signing in.
        </p>
        <Button
          onClick={disableTwoFactor}
          variant="outline"
          size="sm"
          className="w-full"
        >
          Disable 2FA
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {step === 'initial' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-medium text-dark-200">
              Security Enhancement
            </span>
          </div>
          <p className="text-sm text-light-200">
            Add an extra layer of security to your account by enabling
            two-factor authentication using an authenticator app.
          </p>
          <Button
            onClick={enableTwoFactor}
            className="w-full bg-blue-500 hover:bg-blue-600"
          >
            <Smartphone className="h-4 w-4 mr-2" />
            Enable 2FA
          </Button>
        </div>
      )}

      {step === 'qr' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-medium text-dark-200">
              Scan QR Code
            </span>
          </div>

          <Card className="bg-white/20 backdrop-blur border border-white/40">
            <CardContent className="p-4">
              <div className="flex flex-col items-center space-y-4">
                {qrCode && (
                  <div className="bg-white p-4 rounded-lg">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                        qrCode
                      )}`}
                      alt="QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                )}

                <div className="text-center space-y-2">
                  <p className="text-sm text-light-200">
                    Scan this QR code with your authenticator app:
                  </p>
                  <div className="flex items-center gap-2 justify-center">
                    <span className="text-xs text-light-200">Secret Key:</span>
                    <div className="flex items-center gap-1">
                      <code className="text-xs bg-white/20 px-2 py-1 rounded">
                        {showSecret ? secret : '••••••••••••••••'}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSecret(!showSecret)}
                        className="h-6 w-6 p-0"
                      >
                        {showSecret ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <p className="text-sm text-light-200">
              After scanning the QR code, enter the 6-digit verification code
              from your authenticator app:
            </p>
            <Input
              type="text"
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) =>
                setVerificationCode(
                  e.target.value.replace(/\D/g, '').slice(0, 6)
                )
              }
              className="text-center text-lg tracking-widest"
              maxLength={6}
            />
            <Button
              onClick={verifyTwoFactor}
              className="w-full bg-blue-500 hover:bg-blue-600"
              disabled={verificationCode.length !== 6}
            >
              Verify & Enable 2FA
            </Button>
            <Button
              onClick={regenerateQR}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerate QR Code
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TwoFactorSetup;
