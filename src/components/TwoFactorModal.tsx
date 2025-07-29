'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Shield,
  QrCode,
  Smartphone,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

interface TwoFactorModalProps {
  email: string;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TwoFactorModal = ({
  email,
  userId,
  isOpen,
  onClose,
  onSuccess,
}: TwoFactorModalProps) => {
  const [step, setStep] = useState<'check' | 'setup' | 'verify' | 'success'>(
    'check'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [has2FA, setHas2FA] = useState(false);
  const [factorId, setFactorId] = useState('');
  const { toast } = useToast();

  // Check if user has 2FA enabled
  useEffect(() => {
    if (isOpen) {
      checkTwoFactorStatus();
    }
  }, [isOpen]);

  const checkTwoFactorStatus = async () => {
    try {
      setIsLoading(true);
      // TODO: Replace with actual Appwrite MFA check
      const response = await fetch('/api/2fa/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      setHas2FA(data.has2FA);

      if (data.has2FA) {
        setStep('verify');
      } else {
        setStep('setup');
      }
    } catch (error) {
      console.error('Error checking 2FA status:', error);
      // If check fails, assume no 2FA and show setup
      setStep('setup');
    } finally {
      setIsLoading(false);
    }
  };

  const setupTwoFactor = async () => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (data.success) {
        setQrCode(data.data.uri);
        setSecret(data.data.secret);
        setFactorId(data.data.factorId);
        setStep('verify');

        toast({
          title: '2FA Setup Started',
          description: 'Scan the QR code with your authenticator app',
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error setting up 2FA:', error);

      // Show specific error message based on the error
      let errorMessage = 'Failed to setup 2FA. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('Server configuration error')) {
          errorMessage = 'Server configuration issue. Please contact support.';
        } else if (error.message.includes('User ID is required')) {
          errorMessage =
            'User information is missing. Please refresh and try again.';
        }
      }

      toast({
        title: 'Setup Failed',
        description: errorMessage,
        variant: 'destructive',
      });

      // 2FA setup is mandatory - show retry option
      toast({
        title: 'Setup Required',
        description: 'Two-factor authentication setup is required to continue.',
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

      const response = await fetch('/api/2fa/setup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factorId: has2FA ? factorId : factorId,
          code: verificationCode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStep('success');
        toast({
          title: '2FA Verified Successfully',
          description:
            'Your account is now protected with two-factor authentication',
        });

        // Wait a moment then proceed
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error verifying 2FA:', error);

      // Show specific error message based on the error
      let errorMessage = 'Invalid verification code. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('Invalid or expired setup session')) {
          errorMessage =
            'Setup session expired. Please restart the 2FA setup process.';
        } else if (error.message.includes('Setup session expired')) {
          errorMessage =
            'Setup session expired. Please restart the 2FA setup process.';
        } else if (error.message.includes('Invalid verification code')) {
          errorMessage =
            'Invalid verification code. Please check your authenticator app and try again.';
        }
      }

      toast({
        title: 'Verification Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setStep('setup');
    setQrCode('');
    setSecret('');
    setVerificationCode('');
    setFactorId('');
  };

  if (isLoading && step === 'check') {
    return (
      <AlertDialog open={isOpen} onOpenChange={onClose}>
        <AlertDialogContent className="shad-alert-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="sr-only">
              Checking 2FA Status
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
            <span className="ml-2 text-sm text-light-200">
              Checking 2FA status...
            </span>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="shad-alert-dialog max-w-md">
        <AlertDialogHeader className="relative flex justify-center">
          <AlertDialogTitle className="h2 text-center flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            Two-Factor Authentication
            <Image
              src="/assets/icons/close-dark.svg"
              alt="close"
              width={20}
              height={20}
              className="otp-close-button"
              onClick={onClose}
            />
          </AlertDialogTitle>
          <AlertDialogDescription className="subtitle-2 text-center">
            {step === 'setup' &&
              'Two-factor authentication is required for account security'}
            {step === 'verify' &&
              'Enter your 2FA verification code to continue'}
            {step === 'success' && '2FA verification successful!'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {step === 'setup' && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-light-200 mb-4">
                Two-factor authentication is mandatory for all users to ensure
                account security.
              </p>
              <div className="flex items-center justify-center gap-2 mb-4">
                <Smartphone className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-light-200">
                  Use an authenticator app like Google Authenticator or Authy
                </span>
              </div>
            </div>

            <div className="flex gap-3 ">
              <Button
                onClick={setupTwoFactor}
                className="w-full bg-blue-500 hover:bg-blue-600 text-slate-700"
                disabled={isLoading}
              >
                <Shield className="h-4 w-4 mr-2 text-slate-700" />
                {isLoading ? 'Setting up...' : 'Setup 2FA'}
              </Button>
            </div>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            {qrCode && !has2FA && (
              <Card className="bg-white/20 backdrop-blur border border-white/40">
                <CardContent className="p-4">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="bg-white p-4 rounded-lg">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                          qrCode
                        )}`}
                        alt="QR Code"
                        className="w-36 h-36"
                      />
                    </div>

                    <div className="text-center space-y-2">
                      <p className="text-sm text-light-200">
                        Scan this QR code with your authenticator app:
                      </p>
                      <div className="flex items-center gap-2 justify-center">
                        <span className="text-xs text-light-200">
                          Secret Key:
                        </span>
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
            )}

            <div className="space-y-3">
              <p className="text-sm text-light-200 text-center">
                {has2FA
                  ? 'Enter the 6-digit verification code from your authenticator app:'
                  : 'After scanning the QR code, enter the 6-digit verification code:'}
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
                className="w-full bg-blue-500 hover:bg-blue-600 text-slate-700"
                disabled={verificationCode.length !== 6 || isLoading}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2 text-slate-700" />
                    Verify & Continue
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-4 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <p className="text-sm text-light-200">
              Two-factor authentication has been successfully verified.
              Redirecting...
            </p>
          </div>
        )}

        <AlertDialogFooter>
          {step === 'verify' && (
            <div className="w-full text-center">
              <p className="text-xs text-light-200">
                Two-factor authentication is required for account security
              </p>
            </div>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default TwoFactorModal;
