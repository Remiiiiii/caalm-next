'use client';

import Spline from '@splinetool/react-spline';
import { useAnimationFrame } from 'framer-motion';
import { useState } from 'react';
import {
  Database,
  Bell,
  GitBranch,
  BarChart3,
  Lock,
  Calendar,
  FileCheck,
  Users2,
} from 'lucide-react';

const features = [
  {
    icon: Database,
  },
  {
    icon: Bell,
  },
  {
    icon: GitBranch,
  },
  {
    icon: BarChart3,
  },
  {
    icon: Lock,
  },
  {
    icon: Calendar,
  },
  {
    icon: FileCheck,
  },
  {
    icon: Users2,
  },
];

const NUM_BLOCKS = 8;
const RADIUS_X = 400; // further increased horizontal radius for more oval shape
const RADIUS_Y = 110; // reduced vertical radius for shorter orbit height
const CODE_NUMBERS = [9, 10, 11, 12, 13, 14, 15, 16];

function OrbitingBlocks() {
  const [now, setNow] = useState(0);
  useAnimationFrame((t) => setNow(t));

  return (
    <div className="absolute inset-0 pointer-events-none mb-20">
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: `calc(50% - ${RADIUS_Y}px)`,
          transform: 'translate(-50%, -50%)',
          zIndex: 100,
          pointerEvents: 'none',
        }}
      ></div>
      {CODE_NUMBERS.map((num, i) => {
        // Animate angle over time (counterclockwise)
        const baseAngle = (360 / NUM_BLOCKS) * i;
        const angle = ((baseAngle - now * 0.018) * Math.PI) / 180; // slower rotation
        // Reverse: Grow as approaching the red X (top), shrink as passing it (counterclockwise)
        const minScale = 0.6;
        const maxScale = 1.2;
        // At angle = -90deg (top), sin(angle) = -1 => scale = maxScale
        // At angle = 90deg (bottom), sin(angle) = 1 => scale = minScale
        const scale =
          minScale + ((maxScale - minScale) * (1 + Math.sin(angle))) / 2;
        // Elliptical orbit for hula hoop effect
        const x = Math.cos(angle) * RADIUS_X;
        const y = Math.sin(angle) * RADIUS_Y;
        const t = (y + RADIUS_Y) / (2 * RADIUS_Y);
        const opacity = 0.6 + 0.4 * t;
        const zIndex = Math.round(10 + 10 * t);

        const Icon = features[i].icon;
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
            <div className="orbit-animated-border w-[70px] h-[70px]">
              <Icon
                className="orbit-3d w-full h-full p-4 rounded-2xl shadow-xl border border-slate-200 text-[#059BB2] ring-2 ring-cyan-100/40 orbiting-icon"
                style={{ willChange: 'transform' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const HeroIntro = () => {
  return (
    <section className="relative flex flex-col items-center justify-center pt-20 pb-8 bg-gradient-to-b from-white to-blue-50 overflow-hidden">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(90deg,rgba(0,0,0,0.03) 1px,transparent 1px),linear-gradient(180deg,rgba(0,0,0,0.03) 1px,transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* Glassy logo, Spline, and orbiting images */}
      <div className="mb-8 flex items-center justify-center relative w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] md:w-[500px] md:h-[500px] z-10">
        {/* Orbiting images */}
        <OrbitingBlocks />
        {/* Spline scene */}
        <Spline
          scene="https://prod.spline.design/JSDRNnN1k9dO-WXj/scene.splinecode"
          className="w-full h-full z-10"
        />
      </div>
      {/* Headline */}
      <div data-aos="fade-up" data-aos-duration="3000">
        <h1 className="text-2xl md:text-[3.5em] font-bold text-center mb-4 leading-tight bg-gradient-to-r from-[#059BB2] via-[#00C1CB] to-[#162768] bg-clip-text text-transparent">
          Centralize
          <br />
          Contracts Audits and Licenses
        </h1>
        {/* Subheadline */}
        <p className="text-lg md:text-xl text-slate-600 text-center  mx-auto">
          Your journey to data management and compliance starts here
        </p>
      </div>
    </section>
  );
};

export default HeroIntro;
