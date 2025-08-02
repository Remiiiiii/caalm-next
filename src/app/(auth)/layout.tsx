import React from 'react';
import Image from 'next/image';
import Spline from '@splinetool/react-spline';

const layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen bg-white relative overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/assets/video/wave.mp4" type="video/mp4" />
      </video>

      {/* Overlay */}

      {/* Content */}
      <div className="relative z-10 flex w-full">
        {/* Left Side - Marketing Content (60% width) */}
        <section className="hidden lg:flex lg:w-1/2 xl:w-1/2 items-center justify-center pl-12">
          <div className="flex flex-col max-w-2xl space-y-8">
            {/* Company Logo */}
            <div className="flex items-center gap-3">
              <Image
                src="/assets/images/logo.svg"
                alt="Caalm Logo"
                width={48}
                height={48}
                className="h-auto"
              />
              <span className="text-2xl font-bold text-light-100">Caalm</span>
            </div>

            {/* 3D Robot/Character Illustration */}
            <div className="rounded-2xl shadow-lg p-8 border border-gray-100 backdrop-blur-lg">
              {/* Marketing Content */}
              <div className="space-y-6">
                <h1 className="text-xl lg:text-3xl font-bold sidebar-gradient-text leading-tight">
                  Eliminate Missed Deadlines and Compliance Risks with
                  Centralized Document Management
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  The perfect place to manage your contracts, audits, and
                  licenses.
                </p>
              </div>
              <Spline
                scene="https://prod.spline.design/JSDRNnN1k9dO-WXj/scene.splinecode"
                className="w-full h-96"
              />
            </div>
          </div>
        </section>
        <section className="flex flex-1 flex-col items-center lg:justify-center p-4 py-10 bg-transparent lg:p-10 lg:py-10">
          <div className="mb-16 lg:hidden">
            <Image
              src="/assets/images/logo.svg"
              alt="logo"
              width={50}
              height={50}
            />
          </div>
          {children}
        </section>
      </div>
    </div>
  );
};

export default layout;
