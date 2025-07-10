import Image from 'next/image';

// List your brand logos here (add your own paths and alt text)
const brands = [
  {
    src: '/assets/icons/logo1.svg',
    alt: 'Product Hunt',
    width: 137,
    height: 32,
  },
  {
    src: '/assets/icons/logo2.svg',
    alt: 'Ark Dentistry',
    width: 106,
    height: 24,
  },
  {
    src: '/assets/icons/logo3.svg',
    alt: 'AngleCorp',
    width: 104,
    height: 30,
  },
  {
    src: '/assets/icons/logo4.svg',
    alt: 'vivoairways',
    width: 92,
    height: 30,
  },
  {
    src: '/assets/icons/logo5.svg',
    alt: 'PrimaCare',
    width: 110,
    height: 30,
  },
  // ...add more
];

export default function BrandMarquee() {
  return (
    <div className="relative overflow-x-hidden w-full mt-10 max-w-5xl mx-auto mb-10 sm:py-4 select-none">
      {/* Left fade */}
      <div
        className="pointer-events-none absolute left-0 top-0 h-full w-8 sm:w-12 md:w-16 z-10"
        style={{
          background:
            'linear-gradient(to right, #fff 80%, rgba(255,255,255,0))',
        }}
      />
      {/* Right fade */}
      <div
        className="pointer-events-none absolute right-0 top-0 h-full w-8 sm:w-12 md:w-16 z-10"
        style={{
          background: 'linear-gradient(to left, #fff 80%, rgba(255,255,255,0))',
        }}
      />
      <div
        className="flex flex-row gap-4 sm:gap-8 animate-marquee whitespace-nowrap"
        style={{ animationDuration: '20s' }}
        tabIndex={-1}
      >
        {/* Render the brands twice for seamless looping */}
        {[...brands, ...brands].map((brand, i) => (
          <div
            key={i}
            className="flex-none flex items-center"
            style={{ minWidth: 0 }}
          >
            <Image
              src={brand.src}
              alt={brand.alt}
              height={48}
              width={160}
              style={{ height: 48, width: 160, objectFit: 'contain' }}
              className="relative drop-shadow-lg hover:opacity-100 transition-opacity duration-200 mx-2 sm:mx-4 w-40 h-12 sm:w-56 sm:h-16 md:w-64 md:h-20"
              draggable={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
