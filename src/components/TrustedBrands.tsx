'use client';

import Image from 'next/image';

export default function TrustedBrands() {
  const items = [
    { src: '/assets/icons/asterisk.svg', alt: 'Asterisk' },
    { src: '/assets/icons/oasis.svg', alt: 'Oasis' },
    { src: '/assets/icons/eooks.svg', alt: 'Eooks' },
    { src: '/assets/icons/opal.svg', alt: 'Opal' },
    { src: '/assets/icons/dune.svg', alt: 'Dune' },
  ];

  return (
    <div className="w-full">
      <div className="container mx-auto px-4 mt-6">
        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-10 md:gap-14 opacity-80">
          {items.map((it) => (
            <div
              key={it.alt}
              className="flex items-center gap-2 bg-transparent"
            >
              <Image
                src={it.src}
                alt={it.alt}
                width={120}
                height={28}
                className="h-6 w-auto"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
