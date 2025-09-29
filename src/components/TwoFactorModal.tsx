'use client';

import React, { useState } from 'react';
import {
  AlertDialog,
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
  Smartphone,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle,
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
  userId,
  isOpen,
  onClose,
  onSuccess,
}: TwoFactorModalProps) => {
  const [step, setStep] = useState<'setup' | 'verify' | 'success'>('setup');
  const [isLoading, setIsLoading] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [factorId, setFactorId] = useState('');
  const { toast } = useToast();

  const setupTwoFactor = async () => {
    try {
      setIsLoading(true);
      console.log('TwoFactorModal: Setting up 2FA for userId:', userId);

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
          factorId,
          code: verificationCode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStep('success');
        toast({
          title: '2FA Setup Complete',
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

  // const handleRetry = () => {
  //   setStep('setup');
  //   setQrCode('');
  //   setSecret('');
  //   setVerificationCode('');
  //   setFactorId('');
  // };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="shad-alert-dialog max-w-md">
        <AlertDialogHeader className="relative flex justify-center">
          <AlertDialogTitle className="h2 text-center flex items-center gap-2 sidebar-gradient-text">
            <Shield className="h-5 w-5 text-navy" />
            Two-Factor Authentication Setup
            <Image
              src="/assets/icons/close-dark.svg"
              alt="close"
              width={20}
              height={20}
              className="otp-close-button"
              onClick={onClose}
            />
          </AlertDialogTitle>
          <AlertDialogDescription className="subtitle-2 text-light-100 text-center">
            {step === 'setup' &&
              'Two-factor authentication is required for account security'}
            {step === 'verify' &&
              'Scan the QR code and enter the verification code'}
            {step === 'success' && '2FA setup successful!'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {step === 'setup' && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-light-100 mb-4">
                Two-factor authentication is mandatory for all users to ensure
                account security.
              </p>
              <div className="flex items-center justify-center gap-2 mb-4">
                <Smartphone className="h-4 w-4 text-navy" />
                <span className="text-sm text-light-100">
                  Use an authenticator app like Google Authenticator or Authy
                </span>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Button
                onClick={setupTwoFactor}
                className="primary-btn"
                disabled={isLoading}
              >
                <Shield className="h-4 w-4 mr-2 text-white" />
                {isLoading ? 'Setting up...' : 'Setup 2FA'}
              </Button>
            </div>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            {qrCode && (
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
                      <p className="text-sm text-light-100">
                        Scan this QR code with your authenticator app:
                      </p>
                      <div className="flex items-center gap-2 justify-center">
                        <span className="text-xs text-light-100">
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
              <p className="text-sm text-light-100 text-center">
                After scanning the QR code, enter the 6-digit verification code:
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
                className="text-center text-lg tracking-widest border border-[#03AFBF]"
                maxLength={6}
              />
              <div className="flex justify-center">
                <Button
                  onClick={verifyTwoFactor}
                  className="primary-btn"
                  disabled={verificationCode.length !== 6 || isLoading}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                      Verify & Continue
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-4 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <p className="text-sm text-light-100">
              Two-factor authentication has been successfully set up.
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
