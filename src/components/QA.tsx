'use client';

import { useState } from 'react';
import { ChevronDown, HelpCircle, MailOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

type QAItem = {
  question: string;
  answer: string;
};

const ITEMS: QAItem[] = [
  {
    question: 'What is Caalm?',
    answer:
      'A contract, license, and audit management system for organizations to track compliance standards and important expirations dates.',
  },
  {
    question: 'What core problem does CAALM solve?',
    answer:
      'CAALM centralizes contract, license, and audit management so teams don’t miss renewals, stay compliant, and get department-level ownership with automated alerts and executive reporting all in one place.',
  },
  {
    question: 'What happens when contracts are about to expire?',
    answer:
      'Automated notifications are sent to relevant personnel based on their role and department to prevent compliance issues.',
  },
  {
    question: 'How secure is my contract data in CAALM?',
    answer:
      'Enterprise-grade security with encrypted data, role-based access, and audit trails ensuring your company adheres to compliance standards.',
  },
];

export default function QA() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section
      id="qa"
      aria-labelledby="qa-heading"
      className="relative z-10 py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-[url('/assets/images/features-bg.jpg')] bg-cover bg-center bg-no-repeat overflow-hidden"
    >
      {/* Background overlay and fades to match Features */}
      <div className="absolute inset-0 bg-white/20 pointer-events-none z-0" />
      {/* Top fade from Pricing into background */}
      <div
        className="absolute left-0 right-0 top-0 h-24 sm:h-28 lg:h-32 z-10 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,0.96) 30%, rgba(255,255,255,0.85) 55%, transparent 100%)',
        }}
        aria-hidden
      />
      {/* Bottom fade into Feedback */}
      <div
        className="absolute left-0 right-0 bottom-0 h-24 sm:h-28 lg:h-32 z-10 pointer-events-none backdrop-blur-[2px]"
        style={{
          background:
            'linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0.96) 30%, rgba(255,255,255,0.85) 55%, rgba(255,255,255,0.6) 75%, transparent 100%)',
        }}
        aria-hidden
      />

      <div className="max-w-3xl mx-auto relative z-10">
        <div className="mb-6 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[#F1F9FF] px-3 py-1 shadow-sm">
            <span className="inline-flex items-center justify-center size-6 rounded-full bg-slate-700/10 ring-1 ring-slate-200">
              <HelpCircle className="h-3.5 w-3.5 text-slate-700" />
            </span>
            <span className="text-slate-700 text-sm">
              Your Queries, Simplified
            </span>
          </div>
        </div>

        <h2
          id="qa-heading"
          className="text-center text-2xl sm:text-3xl md:text-[3em] py-2 sidebar-gradient-text"
        >
          Questions? Answers!
        </h2>
        <p className="mt-2 text-center text-slate-700 text-sm sm:text-base">
          Find quick answers to the most common questions about our platform
        </p>

        <div className="mt-8 space-y-3">
          {ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={item.question}
                className="rounded-lg shadow-md bg-[#f6fafd]/50 border border-white"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`qa-panel-${index}`}
                  onClick={() => toggle(index)}
                  className={cn(
                    'w-full flex items-center justify-between gap-4 px-4 sm:px-5 py-4 text-left'
                  )}
                >
                  <span className="text-slate-700 font-medium sm:font-semibold">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-5 w-5 text-slate-700 transition-transform duration-200',
                      isOpen ? 'rotate-180' : 'rotate-0'
                    )}
                    aria-hidden
                  />
                </button>
                <div
                  id={`qa-panel-${index}`}
                  role="region"
                  className={cn(
                    'px-4 sm:px-5 pb-4 text-slate-700 text-sm sm:text-base overflow-hidden transition-[max-height,opacity] duration-300',
                    isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  )}
                >
                  <p>{item.answer}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-slate-600 text-sm text-center">
          <span className="inline-flex items-center gap-2">
            <span aria-hidden>
              <MailOpen className="h-4 w-4 text-slate-700" />{' '}
            </span>
            <span>
              Feel free to mail us for any enquiries :{' '}
              <a
                className="underline decoration-slate-400 hover:text-slate-900"
                href="mailto:support@caalmsolutions.com"
              >
                support@caalmsolutions.com
              </a>
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}
