'use client';

import { Search } from 'lucide-react';
import { useEffect, useRef } from 'react';
import CountUp from 'react-countup';

const Insights = () => {
  const paperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = paperRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible');
        } else {
          el.classList.remove('is-visible');
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="relative flex flex-col items-center justify-center py-14 sm:py-16 md:py-20 bg-gradient-to-b from-white to-blue-50 overflow-hidden">
      {/* Background video (fills entire component) */}
      <div aria-hidden className="absolute inset-0 z-0 pointer-events-none">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover motion-reduce:hidden"
        >
          <source src="/assets/video/wave.mp4" type="video/mp4" />
        </video>
      </div>
      {/* Subtle grid background (matches HeroIntro style) */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(90deg,rgba(0,0,0,0.02) 1px,transparent 1px),linear-gradient(180deg,rgba(0,0,0,0.02) 1px,transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Pill badge (duplicated from Features) */}
      <div className="mb-6 flex justify-center relative z-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[#F1F9FF] px-3 py-1 shadow-sm">
          <span className="inline-flex items-center justify-center size-6 rounded-full bg-slate-700/10 ring-1 ring-slate-200">
            <Search className="h-3.5 w-3.5 text-slate-700" />
          </span>
          <span className="text-slate-700 text-sm">Live Oversight</span>
        </div>
      </div>

      {/* Heading and subtext */}
      <div className="relative z-10 text-center max-w-3xl px-4">
        <h2 className="text-xl sm:text-3xl py-3 md:text-[3em] leading-tight sidebar-gradient-text">
          Comprehensive Insights
        </h2>
        <p className="mt-3 text-slate-700">
          Track every contract, audit, and license agreement to refine company
          strategies.
        </p>
      </div>

      {/* Metrics row recreated as cards (icons + text) */}
      <div
        ref={paperRef}
        className="paper-3d relative z-10 w-full max-w-4xl mx-auto px-4 mt-8 rounded-2xl bg-white/70 backdrop-blur border border-white/40 shadow-sm p-4 sm:p-5"
      >
        <h3 className="text-lg text-center font-bold mb-2 sm:text-3xl py-2 md:text-[2em] leading-tight sidebar-gradient-text">
          Administration Analytics
        </h3>
        <p className="text-slate-700 text-center mb-6 ">
          Administrative operations and performance metrics
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {/* Total Contracts */}
          <div className="rounded-lg bg-white/30 backdrop-blur border border-white/40 shadow-lg p-6 sm:p-7">
            <div className="flex items-center justify-between pb-1">
              <p className="text-slate-600 font-medium">Total Contracts</p>
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#524E4E"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
              </svg>
            </div>
            <div className="mt-2 text-3xl sm:text-4xl font-extrabold text-navy">
              <CountUp end={156} duration={2.5} enableScrollSpy scrollSpyOnce />
            </div>
          </div>
          {/* Total Budget */}
          <div className="rounded-lg bg-white/20 backdrop-blur border border-white/40 shadow-lg p-6 sm:p-7">
            <div className="flex items-center justify-between pb-1">
              <p className="text-slate-600 font-medium">Total Budget</p>
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#03AFBF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 3v18h18" />
                <path d="M7 15l4-4 4 4 4-6" />
              </svg>
            </div>
            <div className="mt-2 text-3xl sm:text-4xl font-extrabold text-navy">
              <CountUp
                end={1.9}
                decimals={1}
                prefix="$"
                suffix="M"
                duration={2.5}
                enableScrollSpy
                scrollSpyOnce
              />
            </div>
          </div>

          {/* Staff Count */}
          <div className="rounded-lg bg-white/20 backdrop-blur border border-white/40 shadow-lg p-6 sm:p-7">
            <div className="flex items-center justify-between pb-1">
              <p className="text-slate-600 font-medium">Staff Count</p>
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#56B8FF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="mt-2 text-3xl sm:text-4xl font-extrabold text-navy">
              <CountUp end={15} duration={2.5} enableScrollSpy scrollSpyOnce />
            </div>
          </div>
          {/* Compliance Rate */}
          <div className="rounded-lg bg-white/20 backdrop-blur border border-white/40 shadow-lg p-6 sm:p-7">
            <div className="flex items-center justify-between pb-1">
              <p className="text-slate-600 font-medium">Compliance Rate</p>
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#8B5CF6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 3v18h18" />
                <path d="M18 17V9" />
                <path d="M13 17V5" />
                <path d="M8 17v-3" />
              </svg>
            </div>
            <div className="mt-2 text-3xl sm:text-4xl font-extrabold text-navy">
              <CountUp
                end={85}
                suffix="%"
                duration={2.5}
                enableScrollSpy
                scrollSpyOnce
              />
            </div>
          </div>
        </div>
        <h3 className="text-lg font-bold mb-4 mt-8 sm:text-3xl py-2 md:text-[1.25em] leading-tight sidebar-gradient-text">
          Departmental Analytics
        </h3>
        <div className="mb-4 rounded-xl bg-white/20 backdrop-blur border border-white/40 shadow-sm px-4 py-3">
          <div className="flex items-center justify-between gap-6 overflow-x-auto">
            <p className="text-slate-700 text-sm underline underline-offset-4 decoration-[#03afbf]">
              Administration
            </p>
            <p className="text-slate-700">Child Welfare</p>
            <p className="text-slate-700 text-sm">Behavioral Health</p>
            <p className="text-slate-700 text-sm">CFS</p>
            <p className="text-slate-700 text-sm">Residential</p>
            <p className="text-slate-700 text-sm">Clinic</p>
          </div>
        </div>

        {/* Recreated image as individual stat cards (below the tabs) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {/* Total Contracts */}
          <div className="rounded-lg bg-white/20 backdrop-blur border border-white/40 shadow-lg p-6 sm:p-7">
            <div className="flex items-center justify-between pb-1">
              <p className="text-slate-600 font-medium">Total Contracts</p>
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6B7280"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
              </svg>
            </div>
            <div className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900">
              <CountUp end={156} duration={2.5} enableScrollSpy scrollSpyOnce />
            </div>
            <p className="mt-2 text-[#10B981] text-sm">+12% from last month</p>
          </div>

          {/* Total Budget */}
          <div className="rounded-lg bg-white/20 backdrop-blur border border-white/40 shadow-lg p-6 sm:p-7">
            <div className="flex items-center justify-between pb-1">
              <p className="text-slate-600 font-medium">Total Budget</p>
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#03AFBF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 3v18h18" />
                <path d="M7 15l4-4 4 4 4-6" />
              </svg>
            </div>
            <div className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900">
              <CountUp
                end={1.9}
                decimals={1}
                prefix="$"
                suffix="M"
                duration={2.5}
                enableScrollSpy
                scrollSpyOnce
              />
            </div>
            <p className="mt-2 text-[#10B981] text-sm">+8% from last month</p>
          </div>

          {/* Staff Count */}
          <div className="rounded-lg bg-white/20 backdrop-blur border border-white/40 shadow-lg p-6 sm:p-7">
            <div className="flex items-center justify-between pb-1">
              <p className="text-slate-600 font-medium">Staff Count</p>
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#56B8FF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900">
              <CountUp end={89} duration={2.5} enableScrollSpy scrollSpyOnce />
            </div>
            <p className="mt-2 text-[#10B981] text-sm">+3 new hires</p>
          </div>

          {/* Compliance Rate */}
          <div className="rounded-lg bg-white/20 backdrop-blur border border-white/40 shadow-lg p-6 sm:p-7">
            <div className="flex items-center justify-between pb-1">
              <p className="text-slate-600 font-medium">Compliance Rate</p>
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#8B5CF6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 3v18h18" />
                <path d="M18 17V9" />
                <path d="M13 17V5" />
                <path d="M8 17v-3" />
              </svg>
            </div>
            <div className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900">
              <CountUp
                end={85}
                suffix="%"
                duration={2.5}
                enableScrollSpy
                scrollSpyOnce
              />
            </div>
            <p className="mt-2 text-[#10B981] text-sm">+2% from last month</p>
          </div>
        </div>

        {/* Staff Distribution and Contract Types (beneath the div) */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
          {/* Staff Distribution */}
          <div className="rounded-xl bg-white/20 backdrop-blur border border-white/40 shadow-lg p-6 sm:p-7">
            <h4 className="text-lg font-bold sidebar-gradient-text">
              Staff Distribution
            </h4>
            <p className="mt-1 text-slate-600 text-sm">
              Staff by role and department
            </p>
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Executives</span>
                <span className="font-semibold text-slate-800">
                  <CountUp
                    end={8}
                    duration={2.5}
                    enableScrollSpy
                    scrollSpyOnce
                  />
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Managers</span>
                <span className="font-semibold text-slate-800">
                  <CountUp
                    end={24}
                    duration={2.5}
                    enableScrollSpy
                    scrollSpyOnce
                  />
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Administrators</span>
                <span className="font-semibold text-slate-800">
                  <CountUp
                    end={15}
                    duration={2.5}
                    enableScrollSpy
                    scrollSpyOnce
                  />
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Support Staff</span>
                <span className="font-semibold text-slate-800">
                  <CountUp
                    end={42}
                    duration={2.5}
                    enableScrollSpy
                    scrollSpyOnce
                  />
                </span>
              </div>
            </div>
          </div>

          {/* Contract Types */}
          <div className="rounded-xl bg-white/20 backdrop-blur border border-white/40 shadow-lg p-6 sm:p-7">
            <h4 className="text-lg font-bold sidebar-gradient-text">
              Contract Types
            </h4>
            <p className="mt-1 text-slate-600 text-sm">
              Distribution by contract type
            </p>
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Service Contracts</span>
                <span className="font-semibold text-slate-800">
                  <CountUp
                    end={35}
                    duration={2.5}
                    enableScrollSpy
                    scrollSpyOnce
                  />
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Vendor Agreements</span>
                <span className="font-semibold text-slate-800">
                  <CountUp
                    end={28}
                    duration={2.5}
                    enableScrollSpy
                    scrollSpyOnce
                  />
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Partnerships</span>
                <span className="font-semibold text-slate-800">
                  <CountUp
                    end={18}
                    duration={2.5}
                    enableScrollSpy
                    scrollSpyOnce
                  />
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Consulting</span>
                <span className="font-semibold text-slate-800">
                  <CountUp
                    end={12}
                    duration={2.5}
                    enableScrollSpy
                    scrollSpyOnce
                  />
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700">Equipment</span>
                <span className="font-semibold text-slate-800">
                  <CountUp
                    end={8}
                    duration={2.5}
                    enableScrollSpy
                    scrollSpyOnce
                  />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Insights;
