'use client';

import { BadgeCheck } from 'lucide-react';
import Image from 'next/image';

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  image: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'An absolute standout! This platform delivers robust tools, effortless connectivity, and usability.',
    name: 'Brendan',
    role: 'owner of Ledgerworks',
    image: '/assets/images/brendan.png',
  },
  {
    quote:
      'A remarkable solution! It provides top-tier features, intuitive interfaces, and reliability.',
    name: 'Jasmine',
    role: 'owner of Meridian ',
    image: '/assets/images/wilson.png',
  },
  {
    quote:
      'A genuine innovation! Experience advanced tools, smooth workflows, and high utility.',
    name: 'Jordan',
    role: 'owner of Ironleaf Analytics',
    image: '/assets/images/mayak.png',
  },
  {
    quote:
      'A revolutionary platform! Packed with cutting-edge tools, integration ease, and functionality.',
    name: 'Maya',
    role: 'owner of Horizon Contract Labs',
    image: '/assets/images/jacychan.png',
  },
  {
    quote:
      'A real breakthrough! Unlock next-gen features, seamless compatibility, and efficiency.',
    name: 'Sienna',
    role: 'owner of Aurora CivicTech',
    image: '/assets/images/jamesli.png',
  },
  {
    quote:
      'A standout choice! Combining advanced features, smooth syncing, and practicality.',
    name: 'Elena',
    role: 'owner of Bluewave ',
    image: '/assets/images/janney.png',
  },
];

export default function Feedback() {
  return (
    <section
      id="feedback"
      aria-labelledby="feedback-heading"
      className="relative z-10 py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 overflow-hidden"
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-white/20 pointer-events-none z-0" />
      {/* Subtle grid above video/overlay to match site theme */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage:
            'linear-gradient(90deg,rgba(0,0,0,0.03) 1px,transparent 1px),linear-gradient(180deg,rgba(0,0,0,0.03) 1px,transparent 1px)',
          backgroundSize: '40px 40px',
        }}
        aria-hidden
      />
      <div
        className="absolute left-0 right-0 top-0 h-32 sm:h-36 lg:h-40 z-10 pointer-events-none backdrop-blur-[3px]"
        style={{
          background:
            'linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,0.97) 25%, rgba(255,255,255,0.88) 50%, rgba(255,255,255,0.72) 70%, rgba(255,255,255,0.5) 85%, transparent 100%)',
        }}
        aria-hidden
      />

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="mb-6 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[#F1F9FF] px-3 py-1 shadow-sm">
            <span className="inline-flex items-center justify-center size-6 rounded-full bg-slate-700/10 ring-1 ring-slate-200">
              <BadgeCheck className="h-3.5 w-3.5 text-slate-700" />
            </span>
            <span className="text-slate-700 text-sm">
              Trusted by Innovators Worldwide
            </span>
          </div>
        </div>
        <h2
          id="feedback-heading"
          className="text-center text-2xl sm:text-3xl md:text-[3em] py-2 sidebar-gradient-text"
        >
          What Our Users Say
        </h2>
        <p className="mt-2 text-center text-slate-700 text-sm sm:text-base">
          Hear from businesses who’ve transformed their organization with our
          solutions
        </p>

        <div
          data-aos="zoom-in"
          className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {TESTIMONIALS.map((t, i) => (
            <article
              key={`${t.name}-${i}`}
              className="rounded-2xl bg-[#f6fafd]/50  border border-white shadow-lg p-5 flex flex-col justify-between min-h-[180px]"
            >
              <div className="flex gap-3">
                <div className="flex-1">
                  <p className="text-slate-700 text-sm leading-relaxed">
                    <span
                      className="sidebar-gradient-text text-xl align-top mr-1"
                      aria-hidden
                    >
                      &ldquo;
                    </span>
                    {t.quote}
                    <span
                      className="sidebar-gradient-text text-xl align-top ml-1"
                      aria-hidden
                    >
                      &rdquo;
                    </span>
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <div className="size-9 rounded-full bg-slate-200" aria-hidden>
                  {t.image && (
                    <Image
                      src={t.image}
                      alt={t.name}
                      width={40}
                      height={40}
                      className="rounded-sm shadow-2xl ring-1 ring-slate-900/15"
                    />
                  )}
                </div>
                <div
                  className="h-9 border-r-2 border-dashed border-slate-500 mx-1"
                  aria-hidden
                />
                <div>
                  <p className="text-slate-700 text-sm font-semibold">
                    {t.name}
                  </p>
                  <p className="text-slate-500 text-xs">{t.role}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
