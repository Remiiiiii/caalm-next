import Image from "next/image";

// List your brand logos here (add your own paths and alt text)
const brands = [
  {
    src: "/assets/images/cappercom.png",
    alt: "Product Hunt",
    width: 137,
    height: 32,
  },
  {
    src: "/assets/images/arkdentistry.png",
    alt: "Ark Dentistry",
    width: 106,
    height: 24,
  },
  {
    src: "/assets/images/anglecorp.png",
    alt: "AngleCorp",
    width: 104,
    height: 30,
  },
  {
    src: "/assets/images/vivoairways.png",
    alt: "vivoairways",
    width: 92,
    height: 30,
  },
  {
    src: "/assets/images/primecare.png",
    alt: "PrimaCare",
    width: 110,
    height: 30,
  },
  // ...add more
];

export default function BrandMarquee() {
  return (
    <div className="relative overflow-x-hidden w-full max-w-xs sm:max-w-md md:max-w-xl lg:max-w-2xl xl:max-w-3xl mx-auto py-2 sm:py-4 select-none">
      {/* Left fade */}
      <div
        className="pointer-events-none absolute left-0 top-0 h-full w-8 sm:w-12 md:w-16 z-10"
        style={{
          background:
            "linear-gradient(to right, #fff 80%, rgba(255,255,255,0))",
        }}
      />
      {/* Right fade */}
      <div
        className="pointer-events-none absolute right-0 top-0 h-full w-8 sm:w-12 md:w-16 z-10"
        style={{
          background: "linear-gradient(to left, #fff 80%, rgba(255,255,255,0))",
        }}
      />
      <div
        className="flex flex-row gap-1 sm:gap-2 animate-marquee whitespace-nowrap"
        style={{ animationDuration: "20s" }}
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
              height={32}
              width={96}
              style={{ height: 32, width: 96, objectFit: "contain" }}
              className="relative opacity-70 hover:opacity-100 transition-opacity duration-200 mx-2 sm:mx-4 invert dark:invert-0 w-20 h-8 sm:w-32 sm:h-12 md:w-40 md:h-16"
              draggable={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
