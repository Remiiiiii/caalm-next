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
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  createAccount,
  signInUser,
  finalizeAccountAfterEmailVerification,
  getUserByEmail,
} from '@/lib/actions/user.actions';
import OTPModal from '@/components/OTPModal';
import TwoFactorModal from '@/components/TwoFactorModal';
import { useRouter } from 'next/navigation';

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
  const [accountId, setAccountId] = useState<string | null>(null); // Only used for sign-in OTP
  const [userId, setUserId] = useState<string | null>(null); // For 2FA verification
  const [success, setSuccess] = useState(false);
  const [pendingSignup, setPendingSignup] = useState<{
    email: string;
    fullName: string;
  } | null>(null);
  const [show2FA, setShow2FA] = useState(false);

  const formSchema = authFormSchema(type);

  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
    },
  });

  const router = useRouter();

  // 2. Define a submit handler.
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setErrorMessage('');
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

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="auth-form">
          <h1 className="form-title">
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
            className="form-submit-button"
            disabled={isLoading}
          >
            {type === 'sign-in' ? 'Sign In' : 'Sign Up'}

            {isLoading && (
              <Image
                src="/assets/icons/loader.svg"
                alt="loader"
                width={24}
                height={24}
                className="ml-2 animate-spin"
              />
            )}
          </Button>

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
              className="ml-1 font-medium text-brand"
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
              // After successful OTP verification, check if user needs 2FA
              const user = await getUserByEmail(form.getValues('email'));
              if (user?.$id) {
                setUserId(user.$id);
                setShow2FA(true);
              } else {
                // Fallback to direct redirect if user not found
                if (user?.role === 'executive')
                  router.push('/dashboard/executive');
                else if (user?.role === 'manager')
                  router.push('/dashboard/manager');
                else if (user?.role === 'admin')
                  router.push('/dashboard/admin');
                else router.push('/dashboard');
              }
            }}
          />
        )}
        {type === 'sign-in' && show2FA && userId && (
          <TwoFactorModal
            email={form.getValues('email')}
            userId={userId}
            isOpen={show2FA}
            onClose={() => setShow2FA(false)}
            onSuccess={async () => {
              // After successful 2FA verification, redirect by role
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
