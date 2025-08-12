import React from 'react';
import Image from 'next/image';
// import OrbitingBlocks from '@/components/OrbitingBlocks';

import CountUp from '@/components/CountUp';

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
            <div className="rounded-2xl shadow-lg p-8 border-2 border-white backdrop-blur-lg">
              {/* Marketing Content */}
              <div className="space-y-6">
                <h1 className="text-xl lg:text-3xl font-bold sidebar-gradient-text leading-tight">
                  Eliminate Missed Deadlines and Compliance Risks with
                  Centralized Document Management
                </h1>
                <p className="text-lg text-gray-600 leading-relaxed">
                  The perfect place to manage your contracts, audits, and
                  licenses.
                </p>
              </div>

              {/* Spline Component */}
              <div className="relative mt-[-30px] mb-10">
                <iframe
                  src="https://prod.spline.design/JSDRNnN1k9dO-WXj/scene.splinecode"
                  className="w-full h-96 relative z-10"
                  style={{ border: 'none' }}
                  title="Auth Spline"
                />
                {/* <OrbitingBlocks /> */}
              </div>
              <div className="flex items-center gap-2 mt-6 justify-center ">
                <div className="flex -space-x-2">
                  <Image
                    src="/assets/images/1.png"
                    alt="avatar"
                    width={32}
                    height={32}
                    className="rounded-full border-3 border-white shadow-lg"
                  />
                  <Image
                    src="/assets/images/2.png"
                    alt="avatar"
                    width={32}
                    height={32}
                    className="rounded-full border-3 border-white shadow-lg"
                  />
                  <Image
                    src="/assets/images/3.png"
                    alt="avatar"
                    width={32}
                    height={32}
                    className="rounded-full border-3 border-white shadow-lg"
                  />
                  <Image
                    src="/assets/images/5.png"
                    alt="avatar"
                    width={32}
                    height={32}
                    className="rounded-full border-3 border-white shadow-lg"
                  />
                </div>
                <span className="text-md text-gray-600">
                  Trusted by <CountUp />+ innovators worldwide
                </span>
              </div>
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
