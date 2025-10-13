'use client';

import AuthForm from '@/components/AuthForm';
import OrbitingBlocks from '@/components/OrbitingBlocks';
import SplineCanvas from '@/components/SplineCanvas';
import { Suspense } from 'react';

const SignIn = () => {
  return (
    <div className="w-full max-w-[580px]">
      <Suspense fallback={null}>
        <AuthForm type="sign-in" />
      </Suspense>
    </div>
  );
};

export default SignIn;
