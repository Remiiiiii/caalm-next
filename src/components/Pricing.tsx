'use client';

import { useEffect, useMemo, useState } from 'react';
import { BadgeDollarSign, Check, HandHeart } from 'lucide-react';
import type { PricingPlan } from '@/lib/pricing';
import { cn } from '@/lib/utils';

type Props = {
  plans: PricingPlan[];
};

export default function Pricing({ plans }: Props) {
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    setPeriod('monthly');
  }, []);

  const formattedPlans = useMemo(() => {
    return plans.map((p) => ({
      ...p,
      displayPrice: period === 'monthly' ? p.monthly : p.yearly,
    }));
  }, [plans, period]);

  const stripMarkdown = (value: string): string => {
    return value
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*/g, '');
  };

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="relative z-10 py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8"
    >
      {/* Top fade overlay to blend from Insights */}
      <div
        className="absolute left-0 right-0 top-0 h-12 sm:h-16 pointer-events-none -z-10"
        style={{
          background:
            'linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)',
        }}
        aria-hidden
      />

      <div className="mb-6 flex justify-center relative z-10 mt-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[#F1F9FF] px-3 py-1 shadow-sm">
          <span className="inline-flex items-center justify-center size-6 rounded-full bg-slate-700/10 ring-1 ring-slate-200">
            <BadgeDollarSign className="h-3.5 w-3.5 text-slate-700" />
          </span>
          <span className="text-slate-700 text-sm">Transparent Pricing</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-10">
        {/* Section heading */}
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-[3em] py-2 sidebar-gradient-text">
            Flexible Plans for All
          </h2>
          <p className="mt-2 text-slate-700 text-sm sm:text-base">
            Choose a plan that fits your goals and scale as you grow.
          </p>
        </div>
        <div className="flex items-center justify-center mb-8">
          <div
            role="tablist"
            aria-label="Billing period"
            className="flex items-center gap-2 rounded-full bg-white/80 shadow-lg border border-slate-200 px-2 py-1 backdrop-blur"
          >
            <button
              role="tab"
              aria-selected={period === 'monthly'}
              onClick={() => setPeriod('monthly')}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-semibold transition-colors',
                period === 'monthly'
                  ? 'bg-gradient-to-r from-[#00C1CB] via-[#078FAB] to-[#162768] text-white'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Monthly
            </button>
            <button
              role="tab"
              aria-selected={period === 'yearly'}
              onClick={() => setPeriod('yearly')}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-semibold transition-colors',
                period === 'yearly'
                  ? 'bg-gradient-to-r from-[#00C1CB] via-[#078FAB] to-[#162768] text-white'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Yearly
            </button>
            <span className="ml-2 mr-2 text-xs font-medium text-slate-500">
              Save 20%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {formattedPlans.map((plan, idx) => (
            <article
              key={plan.key}
              className={cn(
                'rounded-2xl bg-[#f6fafd]/50 shadow-lg border border-white backdrop-blur p-6 flex flex-col transform transition-transform duration-300 will-change-transform motion-reduce:transform-none hover:scale-[1.02] hover:-translate-y-1',
                idx === 1 ? 'ring-2 ring-[#05A1B7]/70' : '',
                idx === 0 ? 'self-start h-auto' : '',
                idx === 1 ? 'self-start h-auto' : ''
              )}
            >
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {plan.name}
              </h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold text-navy">
                  ${plan.displayPrice}
                </span>
                <span className="text-sm text-slate-500">
                  {period === 'monthly' ? 'user/month' : 'user/year'}
                </span>
              </div>
              <button
                className={cn(
                  'w-full rounded-full py-3 shimmer-hover font-semibold shadow-sm transition-colors',
                  idx === 1
                    ? 'bg-gradient-to-r from-[#00C1CB] via-[#078FAB] to-[#162768] text-white'
                    : 'bg-gradient-to-r from-slate-500 to-slate-700 text-white'
                )}
              >
                Get Started
              </button>
              <hr className="my-6 border-slate-200" />
              <h4 className="text-sm font-semibold text-slate-800 mb-3">
                {idx === 0
                  ? 'Everything in starter plan'
                  : idx === 1
                  ? 'Everything in Pro plan'
                  : 'Dedicated account manager'}
              </h4>
              <ul className="space-y-2 text-slate-600 text-sm">
                {plan.features.slice(0, 8).map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check
                      className="mt-0.5 h-5 w-5"
                      aria-hidden
                      style={{ color: '#05A1B7' }}
                    />
                    <span>{stripMarkdown(feature)}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <p className="flex items-center gap-2 justify-center mt-8 text-center text-slate-600 text-sm">
          <span>
            <HandHeart />
          </span>
          We donate 2% of your membership to child and family wellbeing
        </p>
      </div>
    </section>
  );
}
