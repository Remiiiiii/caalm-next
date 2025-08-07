'use client';

import { useAnimationFrame } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
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
  { icon: Database },
  { icon: Bell },
  { icon: GitBranch },
  { icon: BarChart3 },
  { icon: Lock },
  { icon: Calendar },
  { icon: FileCheck },
  { icon: Users2 },
];

const NUM_BLOCKS = 8;
const RADIUS_X = 400;
const RADIUS_Y = 110;
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
      />
      {CODE_NUMBERS.map((num, i) => {
        const baseAngle = (360 / NUM_BLOCKS) * i;
        const angle = ((baseAngle - now * 0.018) * Math.PI) / 180;
        const minScale = 0.6;
        const maxScale = 1.2;
        const scale =
          minScale + ((maxScale - minScale) * (1 + Math.sin(angle))) / 2;
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

const VIDEO_SRC = '/assets/video/wave.mp4';
const FADE_DURATION = 1500;

const HeroIntro = () => {
  const videoA = useRef<HTMLVideoElement | null>(null);
  const videoB = useRef<HTMLVideoElement | null>(null);
  const [showA, setShowA] = useState(true);
  const [fade, setFade] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);

  useEffect(() => {
    const video = document.createElement('video');
    video.src = VIDEO_SRC;
    video.onloadedmetadata = () => setVideoDuration(video.duration);
  }, []);

  useEffect(() => {
    if (!videoDuration) return;
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
  }, [showA, videoDuration]);

  return (
    <section className="relative flex flex-col items-center justify-center pt-20 pb-8 bg-gradient-to-b from.white to-blue-50 overflow-hidden">
      {videoDuration !== null && (
        <>
          <video
            ref={videoA}
            src={VIDEO_SRC}
            autoPlay
            muted
            loop={false}
            playsInline
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
      <div className="mb-8 flex items-center justify-center relative w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] md:w-[500px] md:h-[500px] z-10">
        <OrbitingBlocks />
      </div>
      <div className="relative z-30 w-full flex flex-col items-center">
        <h1 className="text-2xl md:text-[3.5em] font-bold text-center mb-4 leading-tight bg-gradient-to-r from-[#059BB2] via-[#00C1CB] to-[#162768] bg-clip-text text-transparent">
          Centralize
          <br />
          Contracts Audits and Licenses
        </h1>
        <p className="text-lg md:text-xl text-slate-600 text-center mx-auto">
          Your journey to data management and compliance starts here
        </p>
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
