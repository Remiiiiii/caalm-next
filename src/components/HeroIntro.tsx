'use client';

// import { useAnimationFrame } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
// import {
//   Database,
//   Bell,
//   GitBranch,
//   BarChart3,
//   Lock,
//   Calendar,
//   FileCheck,
//   Users2,
// } from 'lucide-react';
import Logo from './Logo';
import SectionDivider from './SectionDivider';
import TrustedBrands from './TrustedBrands';
import { ArrowRight } from 'lucide-react';

// const features = [
//   { icon: Database },
//   { icon: Bell },
//   { icon: GitBranch },
//   { icon: BarChart3 },
//   { icon: Lock },
//   { icon: Calendar },
//   { icon: FileCheck },
//   { icon: Users2 },
// ];

// const NUM_BLOCKS = 8;
// const RADIUS_X = 400;
// const RADIUS_Y = 110;
// const CODE_NUMBERS = [9, 10, 11, 12, 13, 14, 15, 16];

// function OrbitingBlocks() {
//   const [now, setNow] = useState(0);
//   useAnimationFrame((t) => setNow(t));
//   return null;
// }

const VIDEO_SRC = '/assets/video/wave.mp4';
const FADE_DURATION = 1500;

const HeroIntro = () => {
  const videoA = useRef<HTMLVideoElement | null>(null);
  const videoB = useRef<HTMLVideoElement | null>(null);
  const [showA, setShowA] = useState(true);
  const [fade, setFade] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () =>
      setPrefersReducedMotion(mediaQuery.matches);
    updateMotionPreference();
    mediaQuery.addEventListener('change', updateMotionPreference);

    if (!mediaQuery.matches) {
      const video = document.createElement('video');
      video.src = VIDEO_SRC;
      video.preload = 'metadata';
      video.onloadedmetadata = () => setVideoDuration(video.duration);
    }

    return () =>
      mediaQuery.removeEventListener('change', updateMotionPreference);
  }, []);

  useEffect(() => {
    if (!videoDuration) return;
    if (prefersReducedMotion) return;
    let fadeTimeout: NodeJS.Timeout;
    let loopTimeout: NodeJS.Timeout;

    function scheduleCrossfade() {
      const timeToFade = videoDuration! * 1000 - FADE_DURATION;
      loopTimeout = setTimeout(() => {
        setFade(true);
        if (showA && videoB.current) {
          videoB.current.currentTime = 0;
          videoB.current.play();
        } else if (!showA && videoA.current) {
          videoA.current.currentTime = 0;
          videoA.current.play();
        }
        fadeTimeout = setTimeout(() => {
          setShowA((prev) => !prev);
          setFade(false);
          scheduleCrossfade();
        }, FADE_DURATION);
      }, timeToFade);
    }

    scheduleCrossfade();

    return () => {
      clearTimeout(fadeTimeout);
      clearTimeout(loopTimeout);
    };
  }, [showA, videoDuration, prefersReducedMotion]);

  return (
    <section className="relative flex flex-col items-center justify-center pt-20 pb-8 bg-gradient-to-b from-white to-blue-50 overflow-hidden">
      {videoDuration !== null && !prefersReducedMotion && (
        <>
          <video
            ref={videoA}
            src={VIDEO_SRC}
            autoPlay
            muted
            loop={false}
            playsInline
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none transition-opacity"
            style={{
              opacity: showA ? 1 : fade ? 0.5 : 0,
              zIndex: showA ? 2 : 1,
              transition: `opacity ${FADE_DURATION}ms`,
            }}
          />
          <video
            ref={videoB}
            src={VIDEO_SRC}
            autoPlay={false}
            muted
            loop={false}
            playsInline
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none transition-opacity"
            style={{
              opacity: !showA ? 1 : fade ? 0.5 : 0,
              zIndex: !showA ? 2 : 1,
              transition: `opacity ${FADE_DURATION}ms`,
            }}
          />
        </>
      )}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(90deg,rgba(0,0,0,0.02) 1px,transparent 1px),linear-gradient(180deg,rgba(0,0,0,0.02) 1px,transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* Divider directly below the fixed header */}
      <div className="relative z-20 w-full mt-5">
        <SectionDivider />
      </div>
      <div className="relative z-20 w-full mt-6">
        <TrustedBrands />
      </div>
      <div className="mt-24 mb-24 flex items-center justify-center relative z-10">
        {/* <OrbitingBlocks /> */}
        <Logo />
      </div>
      <div className="relative z-30 w-full flex flex-col items-center mt-5">
        <h1 className="text-base md:text-[2.75em] text-center mb-4 leading-tight sidebar-gradient-text">
          Centralize Contracts Audits and Licenses
        </h1>
        <h2 className="text-base md:text-[2.75em] text-center mb-4 leading-tight sidebar-gradient-text">
          Powered by AI
        </h2>
        <p className="text-lg md:text-md text-slate-600 text-center mx-auto">
          Your journey to data management and compliance starts here
        </p>
        <div className="mt-10 flex justify-center sm:flex-row gap-3 sm:gap-4 w-full max-w-xs sm:max-w-none mx-auto">
          <button
            className="group bg-gradient-to-r from-[#00C1CB] via-[#078FAB] via-[#0E638F] via-[#11487D] to-[#162768] hover:from-[#162768] hover:via-[#11487D] hover:via-[#0E638F] hover:via-[#078FAB] hover:to-[#00C1CB] text-white  rounded-full shadow-md px-4 py-2 sm:px-8 transition-all duration-200 w-full sm:w-auto flex items-center justify-center"
            style={{ fontSize: '1rem' }}
          >
            Get Started
            <ArrowRight className="ml-2 h-5 w-5 transform transition-transform duration-300 group-hover:translate-x-1.5" />
          </button>
          <button
            className="group bg-gradient-to-r from-slate-500 to-slate-700 hover:from-slate-700 hover:to-slate-500 text-white rounded-full shadow-md px-4 py-2 sm:px-8 transition-all duration-200 hover:text-white w-full sm:w-auto flex items-center justify-center"
            style={{ fontSize: '1rem' }}
          >
            Schedule Demo
            <ArrowRight className="ml-2 h-5 w-5 transform transition-transform duration-300 group-hover:translate-x-1.5" />
          </button>
        </div>
      </div>
      <div
        className="pointer-events-none absolute left-0 right-0 bottom-0 h-[48px] z-20"
        style={{
          background: 'linear-gradient(to bottom, transparent, white 90%)',
        }}
      />
    </section>
  );
};

export default HeroIntro;
