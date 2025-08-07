'use client';

import AuthForm from '@/components/AuthForm';
import React from 'react';
import Spline from '@splinetool/react-spline';

const SignIn = () => {
  return (
    <div className="w-full max-w-md">
      {/* Spline Component for 3D Robot Illustration */}
      <div className="mb-8 lg:hidden">
        <div className="rounded-2xl bg-white shadow-lg p-6 border border-gray-100">
          <Spline
            scene="https://prod.spline.design/JSDRNnN1k9dO-WXj/scene.splinecode"
            className="w-full h-64"
          />
        </div>
      </div>

      <AuthForm type="sign-in" />
    </div>
  );
};

export default SignIn;
