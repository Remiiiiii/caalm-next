'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import Spline from '@splinetool/react-spline';

const Hero = () => {
  // Crossfade effect state
  const [showSecond, setShowSecond] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => setShowSecond((prev) => !prev), 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative flex flex-col md:flex-row items-center justify-between py-16 px-4 bg-gradient-to-b from-white to-blue-50 overflow-hidden">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(90deg,rgba(0,0,0,0.03) 1px,transparent 1px),linear-gradient(180deg,rgba(0,0,0,0.03) 1px,transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between">
          {/* Left: Text, Buttons, Testimonial */}
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="relative z-10 flex-1 flex flex-col gap-6"
          >
            <h1
              className="text-4xl md:text-6xl font-bold leading-tight mt-20 bg-gradient-to-r bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  'linear-gradient(to right, #00C1CB, #078FAB, #0E638F, #11487D, #162768)',
              }}
            >
              Centralize Your Contracts, Licenses & Audits
            </h1>
            {/* Crossfade paragraphs */}
            <div className="relative h-16 max-w-full mb-8 sm:mb-12 text-slate-700">
              <p
                className={`absolute inset-0 transition-opacity duration-700 ${
                  showSecond ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
              >
                Streamline your compliance and agreement processes with CAALM
                Solutions.
              </p>
              <p
                className={`absolute inset-0 transition-opacity duration-700 ${
                  showSecond ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                Caalm eliminates fragmented document storage and manual
                tracking. Secure your compliance, prevent missed deadlines, and
                protect your organization from financial and reputational risks.
              </p>
            </div>
            {/* Original styled buttons with arrows and hover arrow animation */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-xs sm:max-w-none mx-auto">
              <button
                className="group bg-gradient-to-r from-[#00C1CB] via-[#078FAB] via-[#0E638F] via-[#11487D] to-[#162768] hover:from-[#162768] hover:via-[#11487D] hover:via-[#0E638F] hover:via-[#078FAB] hover:to-[#00C1CB] text-white font-semibold rounded-full shadow-md px-6 py-2 sm:px-8 transition-all duration-200 w-full sm:w-auto flex items-center justify-center"
                style={{ fontSize: '1.125rem' }}
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5 transform transition-transform duration-300 group-hover:translate-x-1.5" />
              </button>
              <button
                className="group bg-gradient-to-r from-slate-500 to-slate-700 hover:from-slate-700 hover:to-slate-500 text-white font-semibold rounded-full shadow-md px-6 py-2 sm:px-8 transition-all duration-200 hover:text-white w-full sm:w-auto flex items-center justify-center"
                style={{ fontSize: '1.125rem' }}
              >
                Schedule Demo
                <ArrowRight className="ml-2 h-5 w-5 transform transition-transform duration-300 group-hover:translate-x-1.5" />
              </button>
            </div>
            {/* Avatars and rating */}
            <div className="flex items-center gap-2 mt-6">
              <div className="flex -space-x-2">
                <Image
                  src="/assets/images/1.png"
                  alt="avatar"
                  width={32}
                  height={32}
                  className="rounded-full border-2 border-white"
                />
                <Image
                  src="/assets/images/2.png"
                  alt="avatar"
                  width={32}
                  height={32}
                  className="rounded-full border-2 border-white"
                />
                <Image
                  src="/assets/images/3.png"
                  alt="avatar"
                  width={32}
                  height={32}
                  className="rounded-full border-2 border-white"
                />
                <Image
                  src="/assets/images/4.png"
                  alt="avatar"
                  width={32}
                  height={32}
                  className="rounded-full border-2 border-white"
                />
                <Image
                  src="/assets/images/5.png"
                  alt="avatar"
                  width={32}
                  height={32}
                  className="rounded-full border-2 border-white"
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
          </motion.div>
          {/* Right: Spline or App Screenshot */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            className="relative z-10 flex-1 flex items-center justify-center mt-10 md:mt-0"
          >
            <Spline
              scene="https://prod.spline.design/JSDRNnN1k9dO-WXj/scene.splinecode"
              className="w-full h-[180px] sm:h-[260px] md:h-[340px] lg:h-[420px] xl:h-[500px] z-10"
            />
            <Image
              src="/assets/images/card-main.png"
              alt="App Screenshot"
              width={400}
              height={400}
              className="rounded-xl shadow-xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-90 pointer-events-none"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
