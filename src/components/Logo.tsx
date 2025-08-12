'use client';

import Image from 'next/image';

export default function Logo() {
  return (
    <div className="logo">
      <div className="relative w-[120px] h-[120px]">
        {/* Ambient vertical gradient shadow from bottom to mid using #8DC2EB */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to top, rgba(141,194,235,0.45) 0%, rgba(141,194,235,0.30) 25%, rgba(141,194,235,0.14) 45%, rgba(141,194,235,0.06) 50%, rgba(141,194,235,0) 50%)',
            filter: 'blur(6px)',
            borderRadius: '16px',
          }}
        />
        {/* Layer 1 (soft bottom plate) */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-2xl shadow-[0_28px_60px_-24px_rgba(16,49,77,0.35),0_12px_22px_-12px_rgba(16,49,77,0.18)] translate-y-4"
          style={{
            background: 'linear-gradient(to top, #edeff2 0%, #FFFFFF 100%)',
          }}
        />
        {/* Layer 2 (mid plate) */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-2xl mt-2 shadow-[0_20px_46px_-20px_rgba(16,49,77,0.28),0_10px_16px_-10px_rgba(16,49,77,0.16)] translate-y-2"
          style={{
            background: 'linear-gradient(to top, #edeff2 0%, #FFFFFF 100%)',
          }}
        />
        {/* Top card (centered) */}
        <div
          className="mt-3 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 size-[90px] rounded-2xl ring-1 ring-slate-200 shadow-[0_6px_16px_-8px_rgba(16,49,77,0.20)] flex items-center justify-center"
          style={{
            background: 'linear-gradient(to top, #edeff2 0%, #FFFFFF 100%)',
          }}
        >
          <Image
            src="/assets/images/logo.svg"
            alt="CAALM logo"
            width={52}
            height={52}
            priority
            sizes="52px"
          />
        </div>
      </div>
    </div>
  );
}
