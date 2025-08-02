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
import { useState, useEffect } from 'react';
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

const AuthForm = ({ type }: { type: FormType }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [logoutMessage, setLogoutMessage] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null); // Only used for sign-in OTP
  const [userId, setUserId] = useState<string | null>(null); // For 2FA verification
  const [success, setSuccess] = useState(false);
  const [pendingSignup, setPendingSignup] = useState<{
    email: string;
    fullName: string;
  } | null>(null);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [show2FAVerification, setShow2FAVerification] = useState(false);

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

  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
    },
  });

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
        } else {
          setErrorMessage(res?.error || 'Failed to sign in. Please try again.');
        }
      } catch {
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
      const response = await fetch('/api/2fa/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.has2FA) {
          // User has 2FA enabled - show TOTP verification only
          setShow2FAVerification(true);
        } else {
          // User doesn't have 2FA - show setup
          setShow2FASetup(true);
        }
      } else {
        // If check fails, assume no 2FA and show setup
        setShow2FASetup(true);
      }
    } catch (error) {
      console.error('Error checking 2FA status:', error);
      // If check fails, assume no 2FA and show setup
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
                        placeholder="Enter your full name"
                        {...field}
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
                      placeholder="Enter your email"
                      {...field}
                      className="bg-transparent"
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

          {logoutMessage && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  Session Expired
                </p>
                <p className="text-sm text-red-700">{logoutMessage}</p>
              </div>
            </div>
          )}
          {errorMessage && <p className="error-message">*{errorMessage}</p>}
          {success && (
            <p className="text-green-500 text-center">
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
        {type === 'sign-in' && accountId && (
          <OTPModal
            email={form.getValues('email')}
            accountId={accountId}
            onSuccess={async () => {
              // After successful OTP verification, check 2FA status via API
              try {
                const response = await fetch('/api/auth/check-2fa-status');
                const data = await response.json();

                if (data.has2FA) {
                  // User has 2FA enabled - show TOTP verification
                  setUserId(data.user.$id);
                  setShow2FAVerification(true);
                } else if (data.needsSetup) {
                  // User needs to set up 2FA
                  setUserId(data.user.$id);
                  setShow2FASetup(true);
                } else {
                  // User already has 2FA completed, redirect to dashboard
                  const user = data.user;
                  if (user?.role === 'executive')
                    router.push('/dashboard/executive');
                  else if (user?.role === 'manager')
                    router.push('/dashboard/manager');
                  else if (user?.role === 'admin')
                    router.push('/dashboard/admin');
                  else router.push('/dashboard');
                }
              } catch (error) {
                console.error('Error checking 2FA status:', error);
                // Fallback to original method
                const user = await getUserByEmail(form.getValues('email'));
                if (user?.$id) {
                  setUserId(user.$id);
                  await checkTwoFactorStatus(user.$id);
                } else {
                  router.push('/dashboard');
                }
              }
            }}
          />
        )}

        {type === 'sign-in' && show2FASetup && userId && (
          <TwoFactorModal
            email={form.getValues('email')}
            userId={userId}
            isOpen={show2FASetup}
            onClose={() => setShow2FASetup(false)}
            onSuccess={async () => {
              // After successful 2FA setup, redirect by role
              const user = await getUserByEmail(form.getValues('email'));
              if (user?.role === 'executive')
                router.push('/dashboard/executive');
              else if (user?.role === 'manager')
                router.push('/dashboard/manager');
              else if (user?.role === 'admin') router.push('/dashboard/admin');
              else router.push('/dashboard');
            }}
          />
        )}

        {type === 'sign-in' && show2FAVerification && userId && (
          <TwoFactorVerificationModal
            userId={userId}
            email={form.getValues('email')}
            onSuccess={async () => {
              // After successful TOTP verification, redirect by role
              const user = await getUserByEmail(form.getValues('email'));
              if (user?.role === 'executive')
                router.push('/dashboard/executive');
              else if (user?.role === 'manager')
                router.push('/dashboard/manager');
              else if (user?.role === 'admin') router.push('/dashboard/admin');
              else router.push('/dashboard');
            }}
            onClose={() => setShow2FAVerification(false)}
          />
        )}

        {type === 'sign-up' && pendingSignup && (
          <OTPModal
            email={pendingSignup.email}
            onSuccess={async () => {
              await finalizeAccountAfterEmailVerification({
                fullName: pendingSignup.fullName,
                email: pendingSignup.email,
              });
              router.push('/?signup=success');
            }}
          />
        )}
      </Form>
    </>
  );
};

export default AuthForm;
