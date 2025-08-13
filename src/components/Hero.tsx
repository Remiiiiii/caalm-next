'use client';

import Image from 'next/image';
import { useInView } from 'react-intersection-observer';
import { useEffect, useState } from 'react';
// import Spline from '@splinetool/react-spline';

const Hero = () => {
  const { ref, inView } = useInView({
    threshold: 0.2, // Adjust as needed
    triggerOnce: false,
  });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(inView);
  }, [inView]);

  // Crossfade effect state
  const [crossfadeIndex, setCrossfadeIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setCrossfadeIndex((prev) => (prev + 1) % 3);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      data-aos="fade-up"
      data-aos-duration="3000"
      ref={ref}
      className={`transition-opacity duration-700 ${
        visible ? 'opacity-100' : 'opacity-0'
      } relative flex flex-col md:flex-row items-center justify-between py-10 md:py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-blue-50 overflow-hidden`}
    >
      {/* Grid moved to page-level overlay */}
      <div className="max-w-7xl w-full  mx-auto mt-10 md:mt-20">
        <div className="flex flex-col md:flex-row items-center justify-between">
          {/* Left: Text, Buttons, Testimonial */}
          <div className="relative z-10 flex-1 md:basis-7/12 flex flex-col gap-2 px-2 sm:px-0">
            <h1 className="text-2xl sm:text-3xl md:text-[3em] mb-1 leading-[1.3] sm:leading-[1.28] md:leading-[1.25] tracking-normal sidebar-gradient-text">
              Track Compliance, Users, and Contract Activity
            </h1>

            {/* Crossfade paragraphs */}
            <div
              className="mt-1 relative h-16 max-w-full mb-2 sm:mb-4 text-slate-700"
              aria-live="polite"
              aria-atomic="true"
            >
              <p
                className={`absolute inset-0 transition-opacity duration-700 ${
                  crossfadeIndex === 0
                    ? 'opacity-100'
                    : 'opacity-0 pointer-events-none'
                }`}
              >
                Streamline your compliance and agreement processes with CAALM
                Solutions.
              </p>
              <p
                className={`absolute inset-0 transition-opacity duration-700 ${
                  crossfadeIndex === 1
                    ? 'opacity-100'
                    : 'opacity-0 pointer-events-none'
                }`}
              >
                Caalm eliminates fragmented document storage and manual
                tracking.
              </p>
              <p
                className={`absolute inset-0 transition-opacity duration-700 ${
                  crossfadeIndex === 2
                    ? 'opacity-100'
                    : 'opacity-0 pointer-events-none'
                }`}
              >
                Secure your compliance, prevent missed deadlines, and protect
                your organization from financial and reputational risks.
              </p>
            </div>
            {/* Original styled buttons with arrows and hover arrow animation */}

            {/* Avatars and rating */}
            <div className="flex items-center gap-2 mt-3">
              <div className="flex -space-x-2">
                <Image
                  src="/assets/images/1.png"
                  alt=""
                  width={32}
                  height={32}
                  className="rounded-full border-2 border-white"
                  sizes="(max-width: 640px) 28px, 32px"
                  aria-hidden
                />
                <Image
                  src="/assets/images/2.png"
                  alt=""
                  width={32}
                  height={32}
                  className="rounded-full border-2 border-white"
                  sizes="(max-width: 640px) 28px, 32px"
                  aria-hidden
                />
                <Image
                  src="/assets/images/3.png"
                  alt=""
                  width={32}
                  height={32}
                  className="rounded-full border-2 border-white"
                  sizes="(max-width: 640px) 28px, 32px"
                  aria-hidden
                />
                <Image
                  src="/assets/images/4.png"
                  alt=""
                  width={32}
                  height={32}
                  className="rounded-full border-2 border-white"
                  sizes="(max-width: 640px) 28px, 32px"
                  aria-hidden
                />
                <Image
                  src="/assets/images/5.png"
                  alt=""
                  width={32}
                  height={32}
                  className="rounded-full border-2 border-white"
                  sizes="(max-width: 640px) 28px, 32px"
                  aria-hidden
                />
              </div>
              <span className="ml-2 text-yellow-500 text-lg">★★★★★</span>
              <span className="ml-2 text-blue-900 font-semibold">4.9/5</span>
              <span className="ml-1 text-slate-500 text-sm">
                based on reviews
              </span>
            </div>
            {/* Testimonial */}
            <div className="bg-white/80 rounded-xl shadow p-4 mt-4 max-w-md">
              <p className="text-blue-900 text-base italic">
                &ldquo;I use Caalm every day to keep all our contracts and
                compliance documents organized. It&rsquo;s so helpful, our team
                never misses a deadline or audit anymore!
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Image
                  src="/assets/images/review-avatar.jpg"
                  alt="Nicolas Scalice"
                  width={32}
                  height={32}
                  className="rounded-full"
                  loading="lazy"
                  sizes="32px"
                />
                <div>
                  <div className="text-blue-900 font-semibold text-sm">
                    Priya Sharma{' '}
                  </div>
                  <div className="text-slate-500 text-xs">
                    Director of Human Resources at Growthspark
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Right: Spline or App Screenshot */}
          <div className="relative z-10 flex-1 md:basis-5/12 flex items-center justify-center mt-10 md:mt-0">
            <Image
              src="/assets/images/card-main.png"
              alt="App Screenshot"
              width={400}
              height={400}
              className="rounded-xl shadow-xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-90 pointer-events-none"
              priority
              fetchPriority="high"
              sizes="(max-width: 640px) 320px, (max-width: 1024px) 360px, 400px"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
