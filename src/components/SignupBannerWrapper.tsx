'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import SignupBanner from './SignupBanner';

const SignupBannerWrapper = () => {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    setMounted(true);
    setShowBanner(searchParams?.get('signup') === 'success');
  }, [searchParams]);

  if (!mounted) return null;
  if (!showBanner) return null;

  return <SignupBanner />;
};

export default SignupBannerWrapper;
