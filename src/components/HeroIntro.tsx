import Image from 'next/image';
import Spline from '@splinetool/react-spline';
import { useAnimationFrame } from 'framer-motion';
import { useState } from 'react';

const NUM_BLOCKS = 5;
const RADIUS_X = 240; // further increased horizontal radius
const RADIUS_Y = 120; // further increased vertical radius
const CODE_NUMBERS = [9, 10, 11, 12, 13];

function OrbitingBlocks() {
  const [now, setNow] = useState(0);
  useAnimationFrame((t) => setNow(t));

  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      {CODE_NUMBERS.map((num, i) => {
        // Animate angle over time (counterclockwise)
        const baseAngle = (360 / NUM_BLOCKS) * i;
        const angle = ((baseAngle - now * 0.04) * Math.PI) / 180;
        // Elliptical orbit for hula hoop effect
        const x = Math.cos(angle) * RADIUS_X;
        const y = Math.sin(angle) * RADIUS_Y;
        // Simulate 3D: scale and z-index based on y (blocks in front are bigger/brighter)
        const scale = 0.7 + 0.6 * ((y + RADIUS_Y) / (2 * RADIUS_Y));
        const opacity = 0.6 + 0.4 * ((y + RADIUS_Y) / (2 * RADIUS_Y));
        const zIndex = Math.round(10 + 10 * ((y + RADIUS_Y) / (2 * RADIUS_Y)));

        return (
          <div
            key={num}
            style={{
              position: 'absolute',
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              transform: `translate(-50%, -50%) scale(${scale})`,
              opacity,
              zIndex,
              pointerEvents: 'none',
            }}
          >
            <Image
              src="/assets/images/logo.svg"
              alt={`Orbiting Logo ${num}`}
              width={75}
              height={75}
              className="rounded-2xl bg-white/60 shadow-xl backdrop-blur-md p-4 border border-slate-200"
            />
          </div>
        );
      })}
    </div>
  );
}

const HeroIntro = () => {
  return (
    <section className="flex flex-col items-center justify-center pt-16 pb-8">
      {/* Glassy logo, Spline, and orbiting images */}
      <div className="mb-8 flex items-center justify-center relative w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] md:w-[500px] md:h-[500px]">
        {/* Orbiting images */}
        <OrbitingBlocks />
        {/* Spline scene */}
        <Spline
          scene="https://prod.spline.design/JSDRNnN1k9dO-WXj/scene.splinecode"
          className="w-full h-full z-10"
        />
      </div>
      {/* Headline */}
      <h1 className="text-4xl md:text-6xl font-bold text-slate-900 text-center mb-4 leading-tight">
        Automate. Engage. Convert.
        <br />
        Powered by AI.
      </h1>
      {/* Subheadline */}
      <p className="text-lg md:text-xl text-slate-600 text-center max-w-xl mx-auto">
        Your journey to AI-powered marketing starts here
      </p>
    </section>
  );
};

export default HeroIntro;
