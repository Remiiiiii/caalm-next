'use client';

import AuthForm from '@/components/AuthForm';
import SplineCanvas from '@/components/SplineCanvas';
import { Suspense } from 'react';

const SignIn = () => {
  return (
    <div className="w-full max-w-[580px]">
      {/* Spline Component for 3D Robot Illustration */}
      <div className="mb-8 lg:hidden">
        <div className="rounded-2xl bg-white shadow-lg p-6 border border-gray-100">
          <SplineCanvas
            scene="https://prod.spline.design/JSDRNnN1k9dO-WXj/scene.splinecode"
            className="w-full h-64"
            delayMs={1000}
            durationMs={500}
          />
        </div>
      </div>

      <Suspense fallback={null}>
        <AuthForm type="sign-in" />
      </Suspense>
    </div>
  );
};

export default SignIn;
