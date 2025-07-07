'use client';
import { useSearchParams } from 'next/navigation';
import SignupBanner from './SignupBanner';

const SignupBannerWrapper = () => {
  const searchParams = useSearchParams();
  if (searchParams.get('signup') === 'success') {
    return <SignupBanner />;
  }
  return null;
};

export default SignupBannerWrapper;
