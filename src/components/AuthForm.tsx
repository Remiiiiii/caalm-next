'use client';

import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import React, { useState, useEffect, useMemo, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  createAccount,
  signInUser,
  finalizeAccountAfterEmailVerification,
  getUserByEmail,
} from '@/lib/actions/user.actions';
import OTPModal from '@/components/OTPModal';
import TwoFactorModal from '@/components/TwoFactorModal';
import TwoFactorVerificationModal from '@/components/TwoFactorVerificationModal';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { getLogoutMessage } from '@/lib/auth-utils';

type FormType = 'sign-in' | 'sign-up';

const authFormSchema = (formType: FormType) => {
  return z.object({
    email: z.string().email(),
    fullName:
      formType === 'sign-up'
        ? z.string().min(2).max(50)
        : z.string().optional(),
    password: z.string().optional(),
  });
};

// Memoized TwoFactorModal component to prevent excessive re-renders
const MemoizedTwoFactorModal = memo(
  ({
    email,
    userId,
    show2FASetup,
    onClose,
    onSuccess,
  }: {
    email: string;
    userId: string | null;
    show2FASetup: boolean;
    onClose: () => void;
    onSuccess: () => void;
  }) => {
    const shouldShowModal = show2FASetup && !!userId;

    // Only log when modal should actually show
    if (shouldShowModal) {
      console.log('AuthForm: TwoFactorModal should show:', {
        show2FASetup,
        userId,
        shouldShowModal,
      });
    }

    return (
      <TwoFactorModal
        email={email}
        userId={userId || ''}
        isOpen={shouldShowModal}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );
  }
);

// Memoized TwoFactorVerificationModal component to prevent excessive re-renders
const MemoizedTwoFactorVerificationModal = memo(
  ({
    email,
    userId,
    show2FAVerification,
    onClose,
    onSuccess,
  }: {
    email: string;
    userId: string | null;
    show2FAVerification: boolean;
    onClose: () => void;
    onSuccess: () => void;
  }) => {
    const shouldShowModal = show2FAVerification && !!userId;

    // Only log when modal should actually show
    if (shouldShowModal) {
      console.log('AuthForm: TwoFactorVerificationModal should show:', {
        show2FAVerification,
        userId,
        shouldShowModal,
      });
    }

    return (
      <TwoFactorVerificationModal
        userId={userId || ''}
        email={email}
        onSuccess={onSuccess}
        onClose={onClose}
      />
    );
  }
);

const AuthForm = ({ type }: { type: FormType }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [logoutMessage, setLogoutMessage] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null); // Only used for sign-in OTP
  const [showOTPModal, setShowOTPModal] = useState(false); // Control OTP modal visibility
  const [userId, setUserId] = useState<string | null>(null); // For 2FA verification
  const [success, setSuccess] = useState(false);
  const [pendingSignup, setPendingSignup] = useState<{
    email: string;
    fullName: string;
  } | null>(null);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [show2FAVerification, setShow2FAVerification] = useState(false);
  const [invitationMessage, setInvitationMessage] = useState('');

  // Debug logging for 2FA modal states (only when they change to true)
  useEffect(() => {
    if (show2FASetup || show2FAVerification) {
      console.log('AuthForm: 2FA modal states changed:', {
        show2FASetup,
        show2FAVerification,
        userId,
        type,
      });
    }
  }, [show2FASetup, show2FAVerification, userId, type]);

  const formSchema = authFormSchema(type);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Check for logout reason in URL params
  useEffect(() => {
    const reason = searchParams?.get('reason');
    if (reason) {
      setLogoutMessage(getLogoutMessage(reason));
    }
  }, [searchParams]);

  // Clear 2FA cookies when on sign-in page to prevent interference
  useEffect(() => {
    if (type === 'sign-in') {
      // Clear 2FA cookies to prevent them from interfering with sign-in flow
      document.cookie =
        '2fa_completed=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie =
        '2fa_user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      console.log('AuthForm: Cleared 2FA cookies on sign-in page');
    }
  }, [type]);

  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
    },
  });

  // Check for logout reason and invitation acceptance in URL params
  useEffect(() => {
    const reason = searchParams?.get('reason');
    const invitation = searchParams?.get('invitation');

    if (reason) {
      setLogoutMessage(getLogoutMessage(reason));
    }

    if (invitation === 'accepted') {
      // Check if we have invitation data in sessionStorage
      const invitationData = sessionStorage.getItem('invitationAccepted');
      if (invitationData) {
        try {
          const data = JSON.parse(invitationData);
          setInvitationMessage(
            `Welcome! Your invitation has been accepted. Please sign in with ${data.email} to complete your account setup.`
          );

          // Pre-fill the email field
          form.setValue('email', data.email);

          // Clear the sessionStorage data
          sessionStorage.removeItem('invitationAccepted');
        } catch (error) {
          console.error('Error parsing invitation data:', error);
        }
      }
    }
  }, [searchParams, form]);

  // 2. Define a submit handler.
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setErrorMessage('');
    setLogoutMessage(''); // Clear logout message on new submission
    setSuccess(false);

    if (type === 'sign-in') {
      try {
        const res = await signInUser({ email: values.email });
        if (res?.accountId) {
          setSuccess(true);
          setAccountId(res.accountId);

          // Check if user came from invitation acceptance
          const invitation = searchParams?.get('invitation');
          if (invitation === 'accepted') {
            // For invited users, skip OTP and proceed directly to 2FA check
            try {
              const user = await getUserByEmail(values.email);
              if (user?.accountId) {
                setUserId(user.accountId);
                await checkTwoFactorStatus(user.accountId);
              } else {
                router.push('/dashboard');
              }
            } catch (error) {
              console.error('Error getting user info for invited user:', error);
              router.push('/dashboard');
            }
          } else {
            // For regular users, show OTP modal
            setShowOTPModal(true);
          }
        } else {
          setErrorMessage(res?.error || 'Failed to sign in. Please try again.');
        }
      } catch (error) {
        console.error('Sign-in catch block error:', error);
        setErrorMessage('Failed to sign in. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      try {
        await createAccount({ email: values.email });
        setPendingSignup({
          email: values.email,
          fullName: values.fullName || '',
        });
      } catch {
        setErrorMessage('Failed to create an account. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const checkTwoFactorStatus = async (userId: string) => {
    try {
      console.log('AuthForm: Checking 2FA status for userId:', userId);
      const response = await fetch('/api/2fa/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      console.log('AuthForm: 2FA status response:', data);

      if (data.success) {
        if (data.has2FA) {
          // User has 2FA enabled - show TOTP verification only
          console.log(
            'AuthForm: User has 2FA enabled, showing verification modal'
          );
          setShow2FAVerification(true);
        } else {
          // User doesn't have 2FA - show setup
          console.log('AuthForm: User does not have 2FA, showing setup modal');
          setShow2FASetup(true);
        }
      } else {
        // If check fails, assume no 2FA and show setup
        console.log('AuthForm: 2FA status check failed, showing setup modal');
        setShow2FASetup(true);
      }
    } catch (error) {
      console.error('Error checking 2FA status:', error);
      // If check fails, assume no 2FA and show setup
      console.log('AuthForm: 2FA status check error, showing setup modal');
      setShow2FASetup(true);
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="auth-form">
          <h1 className="form-title sidebar-gradient-text">
            {type === 'sign-in' ? 'Sign In' : 'Sign Up'}
          </h1>
          {type === 'sign-up' && (
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <div className="shad-form-item">
                    <FormLabel className="shad-form-label">Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder=" Enter your full name"
                        {...field}
                        value={
                          field.value ? ` ${field.value.replace(/^ /, '')}` : ''
                        }
                        onChange={(e) => {
                          const value = e.target.value.replace(/^ /, '');
                          field.onChange(value);
                        }}
                        className="shad-input"
                      />
                    </FormControl>
                  </div>
                  <FormMessage className="shad-form-message" />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <div className="shad-form-item">
                  <FormLabel className="shad-form-label">Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder=" Enter your email"
                      {...field}
                      value={
                        field.value ? ` ${field.value.replace(/^ /, '')}` : ''
                      }
                      onChange={(e) => {
                        const value = e.target.value.replace(/^ /, '');
                        field.onChange(value);
                      }}
                      className="shad-input"
                    />
                  </FormControl>
                </div>
                <FormMessage className="shad-form-message" />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="form-submit-button relative overflow-hidden group"
            disabled={isLoading}
          >
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 group-hover:from-blue-600 group-hover:via-cyan-600 group-hover:to-blue-700 transition-all duration-300"></div>

            {/* Shimmer Effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

            {/* Button Content */}
            <span className="relative z-10 flex items-center justify-center">
              {type === 'sign-in' ? 'Sign In' : 'Sign Up'}
              {isLoading && (
                <Image
                  src="/assets/icons/loader.svg"
                  alt="loader"
                  width={20}
                  height={20}
                  className="ml-2 animate-spin"
                />
              )}
            </span>
          </Button>

          {invitationMessage && (
            <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
              <div className="h-6 w-6 text-green mt-0.5 flex-shrink-0">
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Invitation Accepted
                </p>
                <p className="text-sm text-slate-700">{invitationMessage}</p>
              </div>
            </div>
          )}

          {logoutMessage && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
              <AlertTriangle className="h-6 w-6 text-yellow-500 fill-yellow-500 stroke-black stroke-1 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  Session Expired
                </p>
                <p className="text-sm text-red-700">{logoutMessage}</p>
              </div>
            </div>
          )}
          {errorMessage && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
              <AlertTriangle className="h-6 w-6 text-yellow-500 fill-yellow-500 stroke-black stroke-1 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm sidebar-gradient-text">{errorMessage}</p>
              </div>
            </div>
          )}
          {success && (
            <p className="text-navy text-center">
              Check your email for a login link or OTP.
            </p>
          )}

          <div className="body-2 flex justify-center">
            <p className="text-light-100">
              {type === 'sign-in'
                ? "Don't have an account?"
                : 'Already have an account?'}
            </p>
            <Link
              href={type === 'sign-in' ? '/sign-up' : 'sign-in'}
              className="ml-1 font-medium sidebar-gradient-text"
            >
              {type === 'sign-in' ? 'Sign Up' : 'Sign In'}
            </Link>
          </div>
        </form>
        {type === 'sign-in' && (
          <OTPModal
            email={form.getValues('email')}
            accountId={accountId || ''}
            isOpen={showOTPModal && !!accountId}
            onClose={() => {
              setShowOTPModal(false);
            }}
            onError={(error) => {
              setErrorMessage(error);
            }}
            onSuccess={async () => {
              // Close the OTP modal first
              setShowOTPModal(false);

              // After successful OTP verification, get user info and check 2FA status
              try {
                const user = await getUserByEmail(form.getValues('email'));

                if (user?.accountId) {
                  setUserId(user.accountId);
                  await checkTwoFactorStatus(user.accountId);
                } else {
                  // If no user found, redirect to dashboard
                  router.push('/dashboard');
                }
              } catch (error) {
                console.error(
                  'Error getting user info after OTP verification:',
                  error
                );
                router.push('/dashboard');
              }
            }}
          />
        )}

        {type === 'sign-in' && show2FASetup && userId && (
          <MemoizedTwoFactorModal
            email={form.getValues('email')}
            userId={userId}
            show2FASetup={show2FASetup}
            onClose={() => setShow2FASetup(false)}
            onSuccess={async () => {
              // After successful 2FA setup, ensure session is established and redirect by role
              try {
                console.log('2FA Setup completed, refreshing user data...');

                // Add a small delay to ensure database is updated
                await new Promise((resolve) => setTimeout(resolve, 1000));

                const user = await getUserByEmail(form.getValues('email'));
                console.log('2FA Setup Success - User data:', user);

                if (!user) {
                  console.error('User not found after 2FA setup');
                  router.push('/dashboard');
                  return;
                }

                // Force a page reload to ensure session is properly established
                // This helps with middleware and authentication state
                if (user.role === 'executive') {
                  console.log('Redirecting to executive dashboard');
                  window.location.href = '/dashboard/executive';
                } else if (user.role === 'manager') {
                  console.log('Redirecting to manager dashboard');
                  window.location.href = '/dashboard/manager';
                } else if (user.role === 'admin') {
                  console.log('Redirecting to admin dashboard');
                  window.location.href = '/dashboard/admin';
                } else {
                  console.log('Redirecting to default dashboard');
                  window.location.href = '/dashboard';
                }
              } catch (error) {
                console.error(
                  'Error during 2FA setup success callback:',
                  error
                );
                // Fallback navigation with page reload
                window.location.href = '/dashboard';
              }
            }}
          />
        )}

        {type === 'sign-in' && show2FAVerification && userId && (
          <MemoizedTwoFactorVerificationModal
            email={form.getValues('email')}
            userId={userId}
            show2FAVerification={show2FAVerification}
            onClose={() => setShow2FAVerification(false)}
            onSuccess={async () => {
              // After successful TOTP verification, redirect by role
              try {
                const user = await getUserByEmail(form.getValues('email'));

                if (!user) {
                  console.error('User not found after TOTP verification');
                  window.location.href = '/dashboard';
                  return;
                }

                // Use window.location.href for consistent behavior
                if (user.role === 'executive') {
                  window.location.href = '/dashboard/executive';
                } else if (user.role === 'manager') {
                  window.location.href = '/dashboard/manager';
                } else if (user.role === 'admin') {
                  window.location.href = '/dashboard/admin';
                } else {
                  window.location.href = '/dashboard';
                }
              } catch (error) {
                console.error('Error getting user info for redirect:', error);
                window.location.href = '/dashboard';
              }
            }}
          />
        )}

        {type === 'sign-up' && pendingSignup && (
          <OTPModal
            email={pendingSignup.email}
            isOpen={!!pendingSignup}
            onClose={() => {
              setPendingSignup(null);
            }}
            onSuccess={async () => {
              // Redirect immediately for better UX
              router.push('/?signup=success');

              // Run finalization in background without blocking the redirect
              finalizeAccountAfterEmailVerification({
                fullName: pendingSignup.fullName,
                email: pendingSignup.email,
              }).catch((error) => {
                console.error('Background finalization error:', error);
                // Error is logged but doesn't affect user experience
              });
            }}
          />
        )}
      </Form>
    </>
  );
};

export default AuthForm;
