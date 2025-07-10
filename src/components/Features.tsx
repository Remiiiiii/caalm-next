'use client';

import { useInView } from 'react-intersection-observer';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { features } from '../../constants';

const Features = () => {
  const { ref, inView } = useInView({
    threshold: 0.2, // Adjust as needed
    triggerOnce: false,
  });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(inView);
  }, [inView]);

  return (
    <section
      data-aos="fade-in"
      data-aos-duration="3000"
      id="features"
      ref={ref}
      className={`scroll-mt-20 py-8 sm:py-10 md:py-14 px-2 sm:px-4 bg-[url('/assets/images/features-bg.jpg')] bg-cover bg-center bg-no-repeat transition-opacity duration-700 ${
        visible ? 'opacity-100' : 'opacity-0'
      } relative flex flex-col md:flex-row items-center justify-between py-4 px-4 overflow-hidden`}
    >
      {/* Overlay for blending */}
      <div className="absolute inset-0 bg-white/20 pointer-events-none z-0" />
      {/* Top fade overlay */}
      <div
        className="absolute left-0 right-0 top-0 h-48 z-10 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(255,255,255,0.95) 90%, transparent)',
        }}
      />
      {/* Bottom fade overlay */}
      <div
        className="absolute left-0 right-0 bottom-0 h-32 z-10 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, rgba(255,255,255,0.8) 60%, transparent 100%)',
        }}
      />
      <div className="max-w-7xl mx-auto mt-[50px] relative z-10">
        <div className="text-center mb-10 sm:mb-14 md:mb-16">
          <h2 className="text-2xl md:text-[3.5em] font-bold text-center mb-4 leading-tight bg-gradient-to-r from-[#059BB2] via-[#00C1CB] to-[#162768] bg-clip-text text-transparent">
            Powerful Features for Complete Control
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-slate-700 max-w-2xl sm:max-w-3xl mx-auto">
            Everything you need to streamline compliance, reduce risk, and
            safeguard your organization&apos;s critical agreements.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {features.map((feature, index) => {
            const delay = 0.5 * index;
            return (
              <Card
                key={index}
                className="hover:shadow-lg transition-shadow border border-white/30 bg-white/60 backdrop-blur-md h-full"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(40px)',
                  transition: `opacity 0.7s ${delay}s cubic-bezier(0.4,0,0.2,1), transform 0.7s ${delay}s cubic-bezier(0.4,0,0.2,1)`,
                }}
              >
                <CardHeader className="pb-3 sm:pb-4">
                  <div className="orbit-animated-border w-[70px] h-[70px] mx-auto mb-2">
                    <feature.icon className="orbit-3d w-full h-full p-4 rounded-2xl shadow-xl border border-slate-200 text-[#059BB2] ring-2 ring-cyan-100/40" />
                  </div>
                  <CardTitle className="flex items-center justify-center text-base sm:text-lg bg-gradient-to-r from-[#059BB2] via-[#00C1CB] to-[#162768] bg-clip-text text-transparent">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-slate-700 text-xs sm:text-sm">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
