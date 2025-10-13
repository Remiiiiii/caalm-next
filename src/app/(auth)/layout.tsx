import React from 'react';
import Image from 'next/image';
import SplineCanvas from '@/components/SplineCanvas';
import OrbitingBlocks from '@/components/OrbitingBlocks';
import Link from 'next/link';
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
        {/* Left Side - Marketing Content (hidden on small screens) */}
        <section className="hidden lg:flex lg:w-1/2 items-center justify-center pl-8 xl:pl-12">
          <div className="flex flex-col max-w-2xl space-y-4 md:space-y-6 mt-6">
            {/* Company Logo */}
            <Link href="/">
              <div className="flex items-center gap-3 ">
                <Image
                  src="/assets/images/logo.svg"
                  alt="Caalm Logo"
                  width={48}
                  height={48}
                  className="h-auto"
                />
                <span className="text-2xl font-bold text-light-100">Caalm</span>
              </div>
            </Link>

            {/* 3D Robot/Character Illustration */}
            <div className="rounded-2xl shadow-lg p-4 border-2 border-white/60 backdrop-blur-lg md:min-h-[560px] flex flex-col">
              {/* Marketing Content */}
              <div className="space-y-2 md:space-y-3 mx-4 md:mx-8">
                <h1 className="text-2xl md:text-3xl font-semibold mb-1 leading-tight sidebar-gradient-text">
                  Eliminate Missed Deadlines and Compliance Risks with
                  Centralized Document Management
                </h1>
                <p className="text-base md:text-lg text-slate-600 mx-auto">
                  The perfect place to manage your contracts, audits, and
                  licenses.
                </p>
              </div>

              {/* Spline Component */}
              <div className=" -mt-2 md:-mt-10 mb-2 relative w-full h-[500px] rounded-2xl overflow-hidden">
                {/* Orbiting Blocks around Spline - positioned to orbit around the center */}
                <OrbitingBlocks />

                <SplineCanvas
                  scene="https://prod.spline.design/JSDRNnN1k9dO-WXj/scene.splinecode"
                  className="w-full h-full relative z-10"
                  delayMs={1000}
                  durationMs={1000}
                />

                {/* Overlay gradient for better text readability */}
                <div className="absolute inset-0 pointer-events-none z-20" />
              </div>

              <div className="flex items-center gap-2 mt-2 justify-center">
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
        <section className="flex flex-1 flex-col items-center lg:justify-center p-4 sm:p-6 lg:p-10 py-8 bg-transparent">
          <div className="mb-6 lg:hidden">
            <Image
              src="/assets/images/logo.svg"
              alt="logo"
              width={50}
              height={50}
              style={{ width: '50px', height: '50px' }}
            />
          </div>
          {children}
        </section>
      </div>
    </div>
  );
};

export default layout;
