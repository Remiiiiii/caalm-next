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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import Image from 'next/image';
import { Button } from './ui/button';
import { verifySecret, sendEmailOTP } from '@/lib/actions/user.actions';

const OTPModal = ({
  accountId,
  email,
  onSuccess,
  onClose,
  onError,
  isOpen = true,
}: {
  accountId?: string;
  email: string;
  onSuccess: () => void;
  onClose?: () => void;
  onError?: (error: string) => void;
  isOpen?: boolean;
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(true);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lastError, setLastError] = useState('');

  const handleVerify = async () => {
    setIsLoading(true);
    setError(''); // Clear previous errors
    setLastError(''); // Clear last error too

    try {
      if (accountId) {
        const res = await verifySecret({ accountId, password: otp });
        if (res?.sessionId) {
          // Only call onSuccess if verification was successful
          console.log('OTP verification successful, calling onSuccess');
          onSuccess();
          return; // Exit early on success
        } else {
          setAttempts((prev) => prev + 1);
          if (attempts >= 2) {
            // 3 attempts total
            setError('Too many failed attempts. Please try again later.');
            setLastError('Too many failed attempts. Please try again later.');
            setIsLoading(false);
            return;
          }
          setError('Invalid OTP. Try again.');
          setLastError('Invalid OTP. Try again.');
        }
      } else {
        // For sign-up, just call onSuccess (actual verification handled in finalizeAccountAfterEmailVerification)
        console.log('Sign-up flow, calling onSuccess');
        onSuccess();
        return; // Exit early on success
      }
    } catch (error) {
      console.error('Failed to verify OTP', error);

      // Use the user-friendly error message from the server action
      if (error instanceof Error) {
        setError(error.message);
        setLastError(error.message);
        // Also notify parent component of the error
        if (onError) {
          onError(error.message);
        }
      } else {
        const genericError = 'Failed to verify OTP. Please try again later.';
        setError(genericError);
        setLastError(genericError);
        // Also notify parent component of the error
        if (onError) {
          onError(genericError);
        }
      }

      // Increment attempts for any error
      setAttempts((prev) => prev + 1);

      // If too many attempts, show a more specific message
      if (attempts >= 2) {
        const tooManyAttemptsError =
          'Too many failed attempts. Please request a new verification code.';
        setError(tooManyAttemptsError);
        setLastError(tooManyAttemptsError);
      }
    }

    // Only clear loading if we didn't call onSuccess
    setIsLoading(false);
  };

  const handleResendOtp = async () => {
    try {
      setError(''); // Clear previous errors
      await sendEmailOTP({ email });
      // Show success message or toast notification
      setError(''); // Clear any errors
    } catch (error) {
      console.error('Failed to resend OTP', error);
      console.log('Resend error type:', typeof error);
      console.log(
        'Resend error message:',
        error instanceof Error ? error.message : 'Unknown error'
      );

      // Use the user-friendly error message from the server action
      if (error instanceof Error) {
        console.log('Setting resend error message:', error.message);
        setError(error.message);
        setLastError(error.message);
      } else {
        console.log('Setting generic resend error message');
        const genericError =
          'Failed to resend verification code. Please try again.';
        setError(genericError);
        setLastError(genericError);
      }
    }
  };

  const handleModalClose = (open: boolean) => {
    // Don't allow closing the modal if there's an error
    if (!open && (error || lastError)) {
      return;
    }

    // If parent is controlling the modal, don't change internal state
    if (isOpen !== undefined) {
      if (!open && onClose) {
        onClose();
      }
    } else {
      setInternalIsOpen(open);
    }
  };

  // Use parent-controlled isOpen prop, but keep modal open if there are errors
  const modalIsOpen =
    error || lastError ? true : isOpen !== undefined ? isOpen : internalIsOpen;

  return (
    <AlertDialog open={modalIsOpen} onOpenChange={handleModalClose}>
      <AlertDialogContent className="shad-alert-dialog">
        <AlertDialogHeader className="relative flex justify-center">
          <AlertDialogTitle className="h2 text-center">
            Enter Your OTP
            <Image
              src="/assets/icons/close-dark.svg"
              alt="close"
              width={20}
              height={20}
              className="otp-close-button"
              onClick={() => {
                if (onClose) {
                  onClose();
                } else {
                  setInternalIsOpen(false);
                }
              }}
            />
          </AlertDialogTitle>
          <AlertDialogDescription className="subtitle-2 text-center">
            We&apos;ve sent you a code to{' '}
            <span className="pl-1 text-brand">{email}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <InputOTP
          maxLength={6}
          value={otp}
          onChange={(value) => {
            setOtp(value);
            // Clear errors when user starts typing
            if (value.length > 0 && (error || lastError)) {
              setError('');
              setLastError('');
            }
          }}
        >
          <InputOTPGroup className="shad-otp">
            <InputOTPSlot index={0} className="shad-otp-slot" />
            <InputOTPSlot index={1} className="shad-otp-slot" />
            <InputOTPSlot index={2} className="shad-otp-slot" />
            <InputOTPSlot index={3} className="shad-otp-slot" />
            <InputOTPSlot index={4} className="shad-otp-slot" />
            <InputOTPSlot index={5} className="shad-otp-slot" />
          </InputOTPGroup>
        </InputOTP>

        {(error || lastError) && (
          <div className="text-red-500 text-center p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
            <p className="text-sm font-medium text-red-800">
              {error || lastError}
            </p>
            <button
              onClick={() => {
                setError('');
                setLastError('');
                setOtp(''); // Clear the OTP input
              }}
              className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
            >
              Clear error and try again
            </button>
          </div>
        )}

        {attempts > 0 && (
          <div className="text-orange-600 text-center text-sm">
            Failed attempts: {attempts}/3
          </div>
        )}

        <AlertDialogFooter>
          <div className="flex w-full flex-col gap-4">
            <AlertDialogAction
              onClick={handleVerify}
              className="shad-submit-btn h-12"
              type="button"
            >
              Submit
              {isLoading && (
                <Image
                  src="/assets/icons/loader.svg"
                  alt="loader"
                  width={24}
                  height={24}
                  className="ml-2 animate-spin"
                />
              )}
            </AlertDialogAction>
            <div className="subtitle-2 mt-2 text-center text-light-100">
              Didn&apos;t get a code?
              <Button
                type="button"
                variant="link"
                className="pl-1 text-brand"
                onClick={handleResendOtp}
              >
                Resend Code
              </Button>
            </div>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default OTPModal;
