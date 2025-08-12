// Two-line text marquee: line 1 (left -> right), line 2 (right -> left)
const line1 = [
  'Increased Compliance',
  'Smart Auditing',
  'Data-Driven Decisions',
  'Cost-Effective',
];
const line2 = [
  'Seamles Integrations',
  'Client Retention',
  'Defragmented Document Storage',
  'Real-Time Reports',
];

export default function TextMarquee() {
  return (
    <div className="relative w-full max-w-7xl mx-auto mb-12 py-10 sm:py-12 md:py-16 select-none mt-12 px-6">
      {/* Grid moved to page-level overlay */}

      {/* Row 1: left to right */}
      <div className="relative overflow-x-hidden z-10">
        <div
          className="pointer-events-none absolute left-0 top-0 h-full w-10 sm:w-16 md:w-24 z-10"
          style={{
            background:
              'linear-gradient(to right, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.85) 35%, rgba(255,255,255,0.6) 65%, rgba(255,255,255,0) 100%)',
          }}
        />
        <div
          className="pointer-events-none absolute right-0 top-0 h-full w-10 sm:w-16 md:w-24 z-10"
          style={{
            background:
              'linear-gradient(to left, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.85) 35%, rgba(255,255,255,0.6) 65%, rgba(255,255,255,0) 100%)',
          }}
        />
        <div
          className="flex flex-row gap-8 animate-marquee-reverse whitespace-nowrap"
          style={{ animationDuration: '28s' }}
        >
          {[...line1, ...line1].map((text, i) => (
            <span
              key={`l1-${i}`}
              className="primary-btn shimmer-hover inline-flex shrink-0 w-auto whitespace-nowrap text-xs sm:text-sm md:text-base"
            >
              {text}
            </span>
          ))}
        </div>
      </div>

      {/* Row 2: right to left */}
      <div className="relative overflow-x-hidden mt-6 z-10">
        <div
          className="pointer-events-none absolute left-0 top-0 h-full w-10 sm:w-16 md:w-24 z-10"
          style={{
            background:
              'linear-gradient(to right, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.85) 35%, rgba(255,255,255,0.6) 65%, rgba(255,255,255,0) 100%)',
          }}
        />
        <div
          className="pointer-events-none absolute right-0 top-0 h-full w-10 sm:w-16 md:w-24 z-10"
          style={{
            background:
              'linear-gradient(to left, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.85) 35%, rgba(255,255,255,0.6) 65%, rgba(255,255,255,0) 100%)',
          }}
        />
        <div
          className="flex flex-row gap-8 animate-marquee whitespace-nowrap"
          style={{ animationDuration: '28s' }}
        >
          {[...line2, ...line2].map((text, i) => (
            <span
              key={`l2-${i}`}
              className="primary-btn shimmer-hover inline-flex shrink-0 w-auto whitespace-nowrap text-xs sm:text-sm md:text-base"
            >
              {text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
